import { Server, Socket } from 'socket.io';
import { ChatService } from '../../routes/chat/chat.service.js';

interface SendMessageData {
  roomId: string;
  contentType: string;
  content: any;
}

interface ReadChatRoomData {
  roomId: string;
}

interface JoinRoomData {
  roomId: string;
}

interface LeaveRoomData {
  roomId: string;
}

export class ChatEventHandler {

  private chatService = new ChatService();
  // 각 사용자가 현재 보고 있는 채팅방 관리
  private userCurrentRoom: Map<string, string> = new Map();

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
    socket.on('joinRoom', (data: JoinRoomData) => this.handleJoinRoom(socket, data));
    socket.on('leaveRoom', (data: LeaveRoomData) => this.handleLeaveRoom(socket, data));
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
      console.log(`[처리 완료] ${message['props'].message_id} 메시지 생성 완료`);
      
      // 메시지 전송 및 자동 읽음 처리는 notifyNewMessage에서 처리
      await this.notifyNewMessage(receiverInfo, message);
    } catch (error) {
      console.error('메시지 전송 에러:', error);
    }
  }

  // 메세지 전송 및 자동 읽음 처리
  public async notifyNewMessage(receiverInfo: any, message: any) {
    
    const senderId = message['props'].sender_id;
    // 수신자가 온라인인지 확인, 웹소켓 수신중이 아니면 종료
    const receiverId = receiverInfo.receiverId;
    const userRoom = this.io.sockets.adapter.rooms.get(receiverId);
    if (!userRoom || userRoom.size === 0) {
      console.log(`[실시간 알림 x] 수신자 ${receiverId}가 오프라인 상태`);
      return;
    }
    
    const roomId = message['props'].chat_room_id;
    const messageResponse = {
      messageId: message['props'].message_id,
      chatRoomId: roomId,
      senderId: senderId,
      senderType: message['props'].sender_type,
      messageType: message['props'].message_type,
      textContent: message['props'].text_content,
      payload: message['props'].payload,
      createdAt: message['props'].created_at
    };

    // 메시지 전송
    this.io.to(receiverId).emit('newMessage', messageResponse);
    
    // 수신자가 해당 채팅방을 보고 있는지 확인
    const receiverCurrentRoom = this.userCurrentRoom.get(receiverId);
    const isReceiverWatchingRoom = receiverCurrentRoom === roomId;
    
    // 채팅방을 보고 있으면 자동 읽음 처리
    if (isReceiverWatchingRoom) {
      
      console.log(`[실시간 알림 + 자동 읽음] 수신자 ${receiverId}가 채팅방 ${roomId} 열람 중`);
      
      const receiverType = receiverInfo.receiverType === 'OWNER' ? 'OWNER' : 'USER';
      const readResult = await this.chatService.readChatRoomEvent(
        roomId,
        receiverType,
        receiverId
      );
      
      // 발신자에게 읽음 상태 전송 (즉시 "읽음" 표시)
      if (readResult.lastReadMessageId) {
        this.io.to(senderId).emit('readStatus', {
          chatRoomId: roomId,
          readerId: receiverId,
          lastReadMessageId: readResult.lastReadMessageId
        });
        console.log(`[자동 읽음 알림] 발신자 ${senderId}에게 즉시 읽음 상태 전송`);
      }
    } else {
      // 다른 화면을 보고 있음
      console.log(`[실시간 알림] 수신자 ${receiverId}에게 메시지 전달`);
    }
  }

  // 읽음 상태 전송 메서드
  public notifyReadStatus(receiverId: string, readInfo: { chatRoomId: string; readerId: string; lastReadMessageId: string }) {
    const readStatusResponse = {
      chatRoomId: readInfo.chatRoomId,
      readerId: readInfo.readerId,
      lastReadMessageId: readInfo.lastReadMessageId
    };

    // 수신자가 해당 채팅방을 보고 있는지 Map으로 확인
    const receiverCurrentRoom = this.userCurrentRoom.get(receiverId);
    
    if (receiverCurrentRoom === readInfo.chatRoomId) {
      this.io.to(receiverId).emit('readStatus', readStatusResponse);
      console.log(`[읽음 상태 알림] 수신자 ${receiverId}에게 읽음 상태 전달 (채팅방 ${readInfo.chatRoomId} 열람 중)`);
    } else {
      console.log(`[읽음 상태 알림 스킵] 수신자 ${receiverId}가 채팅방 ${readInfo.chatRoomId}를 보고 있지 않음`);
    }
  }


  // 읽음 처리
  private async handleReadChatRoom(socket: Socket, data: ReadChatRoomData): Promise<void> {
    const { userId, authType } = this.getUserInfo(socket);

    console.log(`[읽음 처리] ${userId} -> 방 ${data.roomId}`);
    try {
      const { receiverId, lastReadMessageId, readerId } = await this.chatService.readChatRoomEvent(
        data.roomId,
        authType,
        userId
      );

      // 상대방에게 읽음 상태 전송
      if (receiverId && lastReadMessageId) {
        this.notifyReadStatus(receiverId, {
          chatRoomId: data.roomId,
          readerId: readerId,
          lastReadMessageId: lastReadMessageId
        });
        console.log(`[읽음 알림] ${readerId}가 ${receiverId}에게 읽음 상태 전송 - 마지막 읽은 메시지: ${lastReadMessageId}`);
      }
    } catch (error) {
      socket.emit('error', { message: '읽음 처리 실패' });
      console.error('읽음 처리 에러:', error);
    }
  }


  // 채팅방 입장 처리
  private handleJoinRoom(socket: Socket, data: JoinRoomData): void {
    const { userId } = this.getUserInfo(socket);
    const { roomId } = data;
    
    // 이전 채팅방에서 Map 제거 (한 번에 하나만)
    const previousRoom = this.userCurrentRoom.get(userId);
    if (previousRoom) {
      console.log(`[채팅방 자동 퇴장] 사용자 ${userId}가 채팅방 ${previousRoom}에서 퇴장`);
    }
    
    // 새 채팅방 Map에 등록
    this.userCurrentRoom.set(userId, roomId);
    console.log(`[채팅방 입장] 사용자 ${userId}가 채팅방 ${roomId}에 입장`);
  }

  // 채팅방 퇴장 처리
  private handleLeaveRoom(socket: Socket, data: LeaveRoomData): void {
    const { userId } = this.getUserInfo(socket);
    const { roomId } = data;
    
    // Map에서 제거
    const currentRoom = this.userCurrentRoom.get(userId);
    if (currentRoom === roomId) {
      this.userCurrentRoom.delete(userId);
      console.log(`[채팅방 퇴장] 사용자 ${userId}가 채팅방 ${roomId}에서 퇴장`);
    }
  }

  // 연결 해제 처리
  private handleDisconnect(socket: Socket): void {
    const { userId } = this.getUserInfo(socket);
    
    // Map에서 제거
    this.userCurrentRoom.delete(userId);
    
    socket.leave(userId);
    console.log(`사용자 ${userId} 연결 해제 및 Map에서 제거`);
  }
}