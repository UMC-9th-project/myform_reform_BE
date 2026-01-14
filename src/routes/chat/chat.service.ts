import { CreateChatRoomDTO, SimplePostResponseDTO, ChatRoomListDTO } from './chat.dto.js';
import { ChatRepository, AccountRepository, TargetRepository } from './chat.repository.js';
import { ChatRoomFactory, ChatRoomFilter } from './chat.model.js';
import { InvalidChatTypeError, TargetNotFoundError, InvalidChatRoomFilterError } from './chat.error.js';

export class ChatService {
  
  constructor(
    private chatRepository = new ChatRepository(),
    private accountRepository = new AccountRepository(),
    private targetRepository = new TargetRepository()
  ) {}
  
  // 채팅방 생성
  async createChatRoom(request : CreateChatRoomDTO): Promise<SimplePostResponseDTO> {
    
    let target : any;
    let ownerId : string;
    let requesterId : string;

    if (request.type === 'FEED') {
      target = await this.targetRepository.findFeedWithOwnerById(request.id);
      if (!target) { throw new TargetNotFoundError('피드를 찾을 수 없습니다.'); }
      // 피드 채팅방 생성 로직(유저가 리폼러에게 채팅방 개설)
      ownerId = target.owner_id;
      requesterId  = request.myId; // 테스트용: 요청에서 직접 받음
      
    } else if (request.type === "REQUEST") {
      target = await this.targetRepository.findRequestWithUserById(request.id);
      if (!target) { throw new TargetNotFoundError('요청글을 찾을 수 없습니다.');}
      // 요청글 채팅방 생성 로직(리폼러가 유저에게 채팅방 개설)
      ownerId = request.myId; // 테스트용: 요청에서 직접 받음
      requesterId = target.user_id;

    } else if (request.type === 'PROPOSAL') {
      target = await this.targetRepository.findProposalWithOwnerById(request.id);
      if (!target) { throw new TargetNotFoundError('제안서를 찾을 수 없습니다.'); }
      // 제안서 채팅방 생성 로직(유저가 리폼러에게 채팅방 개설)
      ownerId = target.owner_id;
      requesterId = request.myId; // 테스트용: 요청에서 직접 받음

    } else {
      throw new InvalidChatTypeError('유효하지 않은 채팅방 타입입니다.');
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
    if(!filter) {
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

}
