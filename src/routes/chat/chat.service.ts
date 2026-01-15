import { CreateChatRoomDTO, SimplePostResponseDTO, ChatRoomListDTO } from './chat.dto.js';
import { ChatRepository,  TargetRepository } from './chat.repository.js';
import { ChatRoomFactory, ChatRoomFilter, ChatMessageFactory,ChatMessage, CreateMessageParams } from './chat.model.js';
import { InvalidChatRoomTypeError, CreateTargetNotFoundError, InvalidChatRoomFilterError, InvalidChatMessageTypeError } from './chat.error.js';
import { runInTransaction } from '../../config/prisma.config.js';

export class ChatService {
  
  constructor(
    private chatRepository = new ChatRepository(),
    private targetRepository = new TargetRepository()
  ) {}
  
  // 채팅방 생성
  async createChatRoom(request : CreateChatRoomDTO): Promise<SimplePostResponseDTO> {
    
    let target : any;
    let ownerId : string;
    let requesterId : string;

    switch (request.type) {
    case 'FEED':
      target = await this.targetRepository.findFeedWithOwnerById(request.id);
      if (!target) { throw new CreateTargetNotFoundError('피드를 찾을 수 없습니다.'); }
      // 피드 채팅방 생성 로직(유저가 리폼러에게 채팅방 개설)
      ownerId = target.owner_id;
      requesterId  = request.myId; // 테스트용: 요청에서 직접 받음
      break;
    case 'REQUEST':
      target = await this.targetRepository.findRequestWithUserById(request.id);
      if (!target) { throw new CreateTargetNotFoundError('요청글을 찾을 수 없습니다.');}
      // 요청글 채팅방 생성 로직(리폼러가 유저에게 채팅방 개설)
      ownerId = request.myId; // 테스트용: 요청에서 직접 받음
      requesterId = target.user_id;
      break;
    case 'PROPOSAL':
      target = await this.targetRepository.findProposalWithOwnerById(request.id);
      if (!target) { throw new CreateTargetNotFoundError('제안서를 찾을 수 없습니다.'); }
      // 제안서 채팅방 생성 로직(유저가 리폼러에게 채팅방 개설)
      ownerId = target.owner_id;
      requesterId = request.myId; // 테스트용: 요청에서 직접 받음
      break;
    default:
      throw new InvalidChatRoomTypeError('유효하지 않은 채팅방 타입입니다.');
    }

    const chatRoom = await this.chatRepository.createChatRoom(
      ChatRoomFactory.createFromRequest(ownerId, requesterId, target, request.type)
    );

    const result : SimplePostResponseDTO = {
      id : chatRoom['props'].chat_room_id as string,
      createdAt : chatRoom['props'].created_at as Date
    };
    return result;
  }

  // 채팅방 목록 조회
  async getChatRooms(
    myId: string,
    myType: 'owner' | 'requester',
    filter?: ChatRoomFilter,
    cursor?: string,
    limit: number = 20
  ): Promise<ChatRoomListDTO> {
    const params = { 
      myId, 
      isOwner: myType === 'owner', 
      cursor, 
      limit 
    };
    if(!filter) { // 전체 조회
      return await this.chatRepository.getAllChatRooms(params);
    }
    switch (filter) {
    case 'INQUIRY':
      return await this.chatRepository.getInquiryChatRooms(params);
    case 'ORDER':
      return await this.chatRepository.getOrderChatRooms(params);
    case 'UNREAD':
      return await this.chatRepository.getUnreadChatRooms(params);
    default:
      throw new InvalidChatRoomFilterError('유효하지 않은 채팅방 필터 타입입니다.');
    }
  }


  async sendMessageEvent(
    chatRoomId: string, 
    senderType: 'OWNER' | 'USER',
    senderId: string, 
    contentType: string, 
    content: any
  ): Promise<any> {
    
    
    // 트랜젝션 시작
    return await runInTransaction(async () => {
      let message: ChatMessage;

      // 메세지 분류 및 저장
      switch (contentType) {
      case 'TEXT':
        message = await this.createTextMessage({
          chatRoomId,
          senderId,
          messageType: 'TEXT',
          senderType: senderType as 'OWNER' | 'USER',
          textContent: content as string,
          payload: undefined
        });
        break;
      case 'REQUEST':
      case 'PROPOSAL':
      case 'PAYMENT':
      case 'RESULT':
      default:
        throw new InvalidChatMessageTypeError('유효하지 않은 메시지 타입입니다.');
      }

      // 수신자 조회(ID ,닉네임)
      const receiver = await this.chatRepository.getChatRoomOtherParticipant(chatRoomId, senderType);
    
      // 채팅방 정보 업데이트 마지막 메세지, 안읽음 카운트 증가
      await this.chatRepository.updateChatRoomOnSendMessage(
        message['props'].chat_room_id as string,
        message['props'].message_id as string,
        senderType as 'OWNER' | 'USER'
      );

      const isOwner = senderType === 'OWNER';
      const receiverInfo = isOwner ? 
        {receiverId: receiver.user_id, nickname: receiver.nickname} : 
        {receiverId: receiver.owner_id, nickname: receiver.nickname};
      return { 
        receiverInfo,
        message 
      };
    });
  }

  // 읽음 처리 이벤트
  async readChatRoomEvent(
    chatRoomId: string,
    readerType: 'OWNER' | 'USER',
    readerId: string
  ): Promise<void> {
    await this.chatRepository.markMessagesAsRead(chatRoomId, readerType, readerId);
  }

  // 텍스트 메세지 처리
  async createTextMessage(params: CreateMessageParams): Promise<any>{
    const message = await this.chatRepository.createChatMessage(
      ChatMessageFactory.createTextMessage(params)
    );
    return message;
  }
  
}
