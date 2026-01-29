import { Server, Socket } from 'socket.io';
import { ChatService } from '../../routes/chat/chat.service.js';

interface SendMessageData {
  roomId: string;
  contentType: string;
  content: any;
}

interface ReadChatRoomData {
  chatRoomId: string;
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
    socket.on('readChatRoom', (data: ReadChatRoomData ) => this.handleReadChatRoom(socket, data));
  }

  // 메시지 전송 처리
  private async handleSendMessage(socket: Socket, data: SendMessageData): Promise<void> {
    const { userId, authType } = this.getUserInfo(socket);
    const { roomId, contentType, content } = data;

    console.log(`[수신] ${userId} -> 방 ${roomId}`);

    try {
      const { receiverInfo, message } = await this.chatService.processSendMessage({
        chatRoomId: roomId,
        senderId: userId,
        senderType: authType,
        messageType: contentType as any,
        content: content
      });
      console.log(`[처리 완료] ${userId} -> ${receiverInfo.receiverId}`);
      this.notifyNewMessage(receiverInfo.receiverId, message);
    } catch (error) {
      socket.emit('error', { message: '메시지 전송 실패' });
      console.error('메시지 전송 에러:', error);
    }
  }

  // 메세지 전송 메서드
  public notifyNewMessage(receiverId: string, message: any) {
    const userRoom = this.io.sockets.adapter.rooms.get(receiverId);
    
    // 상대방이 접속해 있는 경우에만 발송
    if (userRoom && userRoom.size > 0) {
      const messageResponse = {
        chatRoomId: message['props'].chat_room_id,
        senderId: message['props'].sender_id,
        messageType: message['props'].message_type,
        textContent: message['props'].text_content,
        payload: message['props'].payload,
        createdAt: message['props'].created_at
      };

      this.io.to(receiverId).emit('newMessage', messageResponse);
      console.log(`[실시간 알림] 수신자 ${receiverId}에게 메시지 전달 완료`);
    }
  }


  // 읽음 처리
  private async handleReadChatRoom(socket: Socket, data: ReadChatRoomData): Promise<void> {
    const { userId, authType } = this.getUserInfo(socket);

    console.log(`[읽음 처리] ${userId} -> 방 ${data.chatRoomId}`);
    try {
      await this.chatService.readChatRoomEvent(
        data.chatRoomId,
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