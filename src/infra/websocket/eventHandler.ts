import { Server, Socket } from 'socket.io';
import { ChatService } from '../../routes/chat/chat.service.js';

interface SendMessageData {
  roomId: string;
  contentType: string;
  content: any;
}

export class ChatEventHandler {

  private chatService = new ChatService();

  constructor(
    private io: Server
  ) {}

  // 기본 설정
  setup(socket: Socket): void {
    const { userId } = this.getUserInfo(socket);
    // 메세지 수신 경로 설정
    this.joinUserRoom(socket, userId);
    this.registerEventListeners(socket);
  }

  // 핸드쉐이크 과정에서 얻은 사용자 정보 추출
  private getUserInfo(socket: Socket) {
    return {
      userId: socket.data.userId as string,
      authType: socket.data.type as 'OWNER' | 'USER'
    };
  }

  // 사용자 개인 방에 참여
  private joinUserRoom(socket: Socket, userId: string): void {
    socket.join(userId);
    console.log(`사용자 ${userId}가 개인 방에 참여`);
  }

  // 이벤트 리스너 등록
  private registerEventListeners(socket: Socket): void {
    socket.on('sendMessage', (data: SendMessageData) => this.handleSendMessage(socket, data));
    socket.on('disconnect', () => this.handleDisconnect(socket));
    socket.on('readChatRoom', (chatroomId: string) => this.handleReadChatRoom(socket, chatroomId));
  }

  // 메시지 전송 처리
  private async handleSendMessage(socket: Socket, data: SendMessageData): Promise<void> {
    const { userId, authType } = this.getUserInfo(socket);
    const { roomId, contentType, content } = data;

    console.log(`[수신] ${userId} -> 방 ${roomId}`);

    try {
      const { receiverInfo, message } = await this.chatService.sendMessageEvent(
        roomId,
        authType,
        userId,
        contentType,
        content
      );
      
      const userRoom = this.io.sockets.adapter.rooms.get(receiverInfo.receiverId);
      if (userRoom && userRoom.size > 0){
        console.log(`[전송] ${userId} -> 수신자 ${receiverInfo.receiverId} (닉네임: ${receiverInfo.nickname})`);
        const messageResponse = {
          chatroomId: message['props'].chat_room_id,
          senderId: message['props'].sender_id,
          messageType: message['props'].message_type,
          textContent: message['props'].text_content,
          payload: message['props'].payload,
          createdAt: message['props'].created_at
        };

        this.io.to(receiverInfo.receiverId).emit('newMessage', messageResponse);
      }
    } catch (error) {
      socket.emit('error', { message: '메시지 전송 실패' });
      console.error('메시지 전송 에러:', error);
    }
  }

  // 읽음 처리
  private async handleReadChatRoom(socket: Socket, chatroomId: string): Promise<void> {
    const { userId, authType } = this.getUserInfo(socket);

    console.log(`[읽음 처리] ${userId} -> 방 ${chatroomId}`);
    try {
      await this.chatService.readChatRoomEvent(
        chatroomId,
        authType,
        userId
      );
    } catch (error) {
      socket.emit('error', { message: '읽음 처리 실패' });
      console.error('읽음 처리 에러:', error);
    }
  }


  // 연결 해제 처리
  private handleDisconnect(socket: Socket): void {
    const { userId } = this.getUserInfo(socket);
    socket.leave(userId);
    console.log(`사용자 ${userId} 연결 해제`);
  }
}