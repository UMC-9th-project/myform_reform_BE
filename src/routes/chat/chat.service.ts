import { GetChatMessageListDTO,ChatProposalResponseDTO, ChatRequestResponseDTO, CreateChatRoomDTO, SimplePostResponseDTO, ChatRoomListDTO, CreateChatRequestDTO, CreateChatProposalDTO } from './chat.dto.js';
import { ChatRepository,  TargetRepository } from './chat.repository.js';
import { ChatRoomFactory, ChatRoomFilter, ChatMessageFactory,ChatMessage, CreateMessageParams, ChatMessagePayload, MessageType } from './chat.model.js';
import { InvalidChatRoomTypeError, CreateTargetNotFoundError, InvalidChatRoomFilterError, InvalidChatMessageTypeError } from './chat.error.js';
import { runInTransaction } from '../../config/prisma.config.js';
import { v4, v7 } from 'uuid'
import { Get } from 'aws-sdk/clients/dynamodb.js';

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


 // 메세지 전송을 위해 필요한 db 처리 
 async processSendMessage(
    params: CreateMessageParams
  ): Promise<any> {
    
    // 트랜젝션 시작
    return await runInTransaction(async () => {

      // 메세지 분류 및 저장
      const message = await this.createMessage(params)

      // 수신자 조회(ID ,닉네임)
      const receiver = await this.chatRepository.getChatRoomOtherParticipant(params.chatRoomId, params.senderType as 'OWNER' | 'USER');
    
      // 채팅방 정보 업데이트 마지막 메세지, 안읽음 카운트 증가
      await this.chatRepository.updateChatRoomOnSendMessage(
        message['props'].chat_room_id as string,
        message['props'].message_id as string,
        params.senderType as 'OWNER' | 'USER'
      );

      const isOwner = params.senderType === 'OWNER';
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

  // 메세지 처리
  async createMessage(params: CreateMessageParams): Promise<any>{
    const message = await this.chatRepository.createChatMessage(
      ChatMessageFactory.create(params)
    );
    return message;
  }
  
  // 채팅 요청서 생성
  async createChatRequest(request: CreateChatRequestDTO): Promise<any> {
    // 트랜젝션 시작
    return await runInTransaction(async () => {

      // fk 의존 관계 때문에 직접 생성
      // 요청서 id 생성 > json필드 생성 > 메세지 생성(요청서 타입) > 요청서 생성 순서
      const requestUuid = v4();

      // 채팅 요청서 페이로드 생성
      const payload = ChatMessageFactory.mapToRequestPayload({
              chatRequestId : requestUuid,
              title :request.title,
              minBudget : request.minBudget,
              maxBudget : request.maxBudget
            }
          )

      // 채팅 메시지 생성(요청서 타입)
      const { receiverInfo, message } = await this.processSendMessage({
          chatRoomId: request.chatRoomId,
          senderType: request.myType === 'OWNER' ? 'OWNER' : 'USER',
          senderId: request.myId,
          messageType: 'request',
          content: payload
         }
      )

      // 요청서 생성, 메세지가 먼저 존재하고 요청서를 연결
      const chatRequest = await this.chatRepository.createChatRequest(
        requestUuid,
        request.image,
        request.title,
        request.content,
        request.minBudget as number,
        request.maxBudget as number,
        message['props'].message_id as string
      );
      const result = {
        id: chatRequest.chat_request_id,
        createdAt: chatRequest.created_at as Date
      }
      
      return {result , message, receiverInfo};
    });
  }

  // 채팅 요청서 조회
  async getChatRequest(
    requestId: string
  ): Promise<ChatRequestResponseDTO> {
    const chatRequest =  await this.chatRepository.getChatRequestById(requestId);
    if(!chatRequest) {
      throw new CreateTargetNotFoundError('채팅 요청서를 찾을 수 없습니다.');
    }
    const requesterInfo = chatRequest.chat_message.chat_room_chat_message_chat_room_idTochat_room.user;

    return {
        chatRequestId: chatRequest.chat_request_id,
        messageId: chatRequest.message_id,
        requester: {
          id: requesterInfo.user_id,
          nickname: requesterInfo.nickname || 'Unknown',
          profileImage: requesterInfo.profile_photo,
        },
        body: {
          title: chatRequest.title || '',
          content: chatRequest.content || '',
          minBudget: chatRequest.min_budget ? Number(chatRequest.min_budget) : null,
          maxBudget: chatRequest.max_budget ? Number(chatRequest.max_budget) : null,
          images: chatRequest.image,
        },
        createdAt: chatRequest.created_at as Date,
      };
  }

  async createChatProposal(request: CreateChatProposalDTO): Promise<any> {
    // 트랜젝션 시작
    return await runInTransaction(async () => {

      // fk 의존 관계 때문에 직접 생성
      // 제안서 id 생성 > json필드 생성 > 메세지 생성(제안서 타입) > 제안서 생성 순서
      const proposalUuid = v4();

      // 채팅 제안서 페이로드 생성
      const payload = ChatMessageFactory.mapToProposalPayload({
              chatProposalId : proposalUuid,
              price : request.price,
              delivery : request.delivery,
              expected_working : request.expectedWorking
            }
          )
          
      // 메세지 처리와 요청서 제목 병렬 처리
      const [sendMessageResult, chatRequest] = await Promise.all([
        this.processSendMessage({
          chatRoomId: request.chatRoomId,
          senderType: request.myType === 'OWNER' ? 'OWNER' : 'USER',
          senderId: request.myId,
          messageType: 'proposal',
          content: payload,
        }),
        this.chatRepository.getChatRequestByChatRoomId(request.chatRoomId),
      ]);

      // 결과 구조 분해 할당
      const { receiverInfo, message } = sendMessageResult;
      const requestTitle = (chatRequest?.payload as any)?.title || '제목 없음';

      // 제안서 생성, 메세지가 먼저 존재하고 제안서를 연결
      const chatProposal = await this.chatRepository.createChatProposal(
        proposalUuid,
        requestTitle,
        request.price,
        request.delivery,
        request.expectedWorking,
        message['props'].message_id as string
      );
      const result = {
        id: chatProposal.chat_proposal_id,
        createdAt: chatProposal.created_at as Date
      }
      
      return {result , message, receiverInfo};
    });
  }

  async getChatProposal(proposalId: string): Promise<ChatProposalResponseDTO> {
    const chatProposal =  await this.chatRepository.getChatProposalById(proposalId);
    if(!chatProposal) {
      throw new CreateTargetNotFoundError('채팅 제안서를 찾을 수 없습니다.');
    }
    const ownerInfo = chatProposal.chat_message.chat_room_chat_message_chat_room_idTochat_room.owner;

    return {
        chatProposalId: chatProposal.chat_proposal_id,
        messageId: chatProposal.message_id,
        owner: {
          id: ownerInfo.owner_id,
          nickname: ownerInfo.nickname || 'Unknown',
          profileImage: ownerInfo.profile_photo || null,
        },
        body: {
          title: chatProposal.title || '',
          price: chatProposal.price ? Number(chatProposal.price) : null,
          delivery: chatProposal.delivery as number,
          expectedWorking: chatProposal.expected_working as number,
        },
        createdAt: chatProposal.created_at as Date,
      };
  }


  async getChatMessage(
    roomId: string,
    messageId: string
  ): Promise<GetChatMessageListDTO> {

    const chatMessage = await this.chatRepository.getChatMessagesPagingById(roomId, messageId);
    return chatMessage;
  }


}
