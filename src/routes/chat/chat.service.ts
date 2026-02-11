import { ChatMessageListDTO, ChatProposalResponseDTO, ChatRequestResponseDTO, CreateChatRoomDTO, CreateChatRoomResponseDTO, SimplePatchResponseDTO, ChatRoomListDTO, LatestProposalPriceDTO } from './dto/chat.res.dto.js';
import { CreateChatRoomWithProposalDTO, CreateChatRequestDTO, CreateChatProposalDTO, UpdateChatRequestDTO, UpdateChatProposalDTO   } from './dto/chat.req.dto.js';
import { ChatRepository,  TargetRepository } from './chat.repository.js';
import { ChatRoomFactory, ChatRoomFilter, ChatMessageFactory,CreateMessageParams, } from './chat.model.js';
import { InvalidChatRoomTypeError, CreateTargetNotFoundError, InvalidChatRoomFilterError, ChatRoomAccessDeniedError } from './chat.error.js';
import { runInTransaction } from '../../config/prisma.config.js';
import { v4 } from 'uuid';
import { UploadService } from '../common/upload.service.js';
import { ImageUrls } from '../common/upload.dto.js';
import { OrdersService } from '../orders/orders.service.js';

export class ChatService {
  
  constructor(
    private chatRepository = new ChatRepository(),
    private targetRepository = new TargetRepository(),
    private uploadService = new UploadService(),
    private ordersService = new OrdersService()
  ) {}
  
  // 채팅방 생성
  async createChatRoom(request : CreateChatRoomDTO, id : string): Promise<CreateChatRoomResponseDTO> {
    
    let target : any;
    let ownerId : string;
    let requesterId : string;
    
    switch (request.type) {
    case 'FEED':
      // 피드 채팅방 생성 로직(유저가 리폼러에게 채팅방 개설)
      ownerId = request.id;
      requesterId  = id; 
      break;
    case 'REQUEST':
      target = await this.targetRepository.findRequestWithUserById(request.id);
      if (!target) { throw new CreateTargetNotFoundError('요청글을 찾을 수 없습니다.');}
      // 요청글 채팅방 생성 로직(리폼러가 유저에게 채팅방 개설)
      ownerId = id;
      requesterId = target.user_id;
      break;
    case 'PROPOSAL':
      target = await this.targetRepository.findProposalWithOwnerById(request.id);
      if (!target) { throw new CreateTargetNotFoundError('제안서를 찾을 수 없습니다.'); }
      // 제안서 채팅방 생성 로직(유저가 리폼러에게 채팅방 개설)
      ownerId = target.owner_id;
      requesterId = id; 
      break;
    default:
      throw new InvalidChatRoomTypeError('유효하지 않은 채팅방 타입입니다.');
    }

    // 중복 채팅방 존재 여부 확인
    const existingRoom = await this.chatRepository.findChatRoom(
      ownerId,
      requesterId,
      request.type,
      target?.reform_request_id || target?.reform_proposal_id
    );

    // 중복이면 기존 채팅방 ID 반환
    if (existingRoom) {
      const result: CreateChatRoomResponseDTO = {
        id: existingRoom.chat_room_id,
        createdAt: existingRoom.created_at,
        isNew: false
      };
      return result;
    }

    // 중복이 아니면 새로운 채팅방 생성
    const chatRoom = await this.chatRepository.createChatRoom(
      ChatRoomFactory.createFromRequest(ownerId, requesterId, target, request.type)
    );

    const result : CreateChatRoomResponseDTO = {
      id : chatRoom['props'].chat_room_id as string,
      createdAt : chatRoom['props'].created_at as Date,
      isNew: true
    };
    return result;
  }

  // 채팅방 제안서와 함께 생성
  async createChatRoomWithProposal(
    dto : CreateChatRoomWithProposalDTO, 
    userId: string
  ): Promise<any> {
    // 트랜젝션 시작
    const {chatRoomResponse, message, receiverInfo}= await runInTransaction(async () => {
      // 채팅방 생성
      const chatRoomResponse = await this.createChatRoom({type: 'REQUEST',id: dto.targetId},userId);
      const chatProposalDto : CreateChatProposalDTO = {
        chatRoomId : chatRoomResponse.id,
        price : dto.price,
        delivery : dto.delivery,
        expectedWorking : dto.expectedWorking,
        content : dto.contents,
        image : dto.images || []
      }
      const {result , message, receiverInfo} = await this.createChatProposal(
        chatProposalDto,
        userId,
        'owner'
      )
      return {chatRoomResponse, message, receiverInfo};
    });
    return {chatRoomResponse, message, receiverInfo}; 
  }


  // 채팅방 목록 조회
  async getChatRooms(
    myId: string,
    myType: 'owner' | 'requester',
    filter?: ChatRoomFilter,
    cursor?: string,
    limit: number = 50
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
      let createParams = { ...params };

      // payment 메시지 + OWNER 발신: receipt/order 생성 후 payload에 receipt_number 포함
      if (params.messageType === 'payment' && params.senderType === 'OWNER' && params.content) {
        const room = await this.chatRepository.getChatRoomById(params.chatRoomId);
        if (!room) throw new CreateTargetNotFoundError('채팅방을 찾을 수 없습니다.');
        let targetId: string | null;
        if (room.type === 'FEED') {
          const chatRequestId = await this.chatRepository.getLatestChatRequestIdByChatRoomId(params.chatRoomId);
          if (!chatRequestId) throw new CreateTargetNotFoundError('문의하기 거래는 요청서가 있어야 결제할 수 있습니다.');
          targetId = chatRequestId;
        } else {
          const targetPayload = room.target_payload as { id?: string } | null;
          targetId = targetPayload?.id ?? null;
        }
        const price = Number(params.content.price) || 0;
        const deliveryFee = Number(params.content.delivery) ?? 0;
        const result = await this.ordersService.createReformOrderFromChat({
          chatRoomId: params.chatRoomId,
          userId: room.requester_id,
          ownerId: room.owner_id,
          targetType: room.type,
          targetId,
          price,
          deliveryFee
        });
        createParams = {
          ...params,
          content: {
            ...params.content,
            receiptNumber: result.receipt_number,
            orderId: result.order_id
          }
        };
      }

      // 메세지 분류 및 저장
      const message = await this.createMessage(createParams)

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
        {receiverId: receiver?.user_id, nickname: receiver?.nickname, receiverType: 'USER'} : 
        {receiverId: receiver?.owner_id, nickname: receiver?.nickname, receiverType: 'OWNER'};
      return { 
        receiverInfo,
        message 
      };
    });
  }

  /**
   * 결제 검증 완료 후 리폼(채팅) 주문의 채팅방에 결제 완료 메시지 전송
   * content: { completed: true, receiptNumber, totalAmount, currency, paymentMethod, approvedAt }
   */
  async notifyPaymentCompleteForReceipt(receiptId: string): Promise<any> {
    const room = await this.ordersService.getReformOrderChatRoomsByReceiptId(receiptId);
    if (!room) return;

    const paymentSummary = await this.ordersService.getReceiptPaymentSummaryByReceiptId(receiptId);
    const content = paymentSummary
      ? { completed: true, ...paymentSummary }
      : { completed: true };

    try {
      const {receiverInfo, message} = await this.processSendMessage({
        chatRoomId: room.chat_room_id,
        senderId: room.owner_id,
        senderType: 'OWNER',
        messageType: 'result',
        content
      });
      return {receiverInfo, message};
    } catch (err) {
      console.error(
        `채팅방 결제 완료 메시지 전송 실패 (chat_room_id: ${room.chat_room_id}):`,
        err
      );
    }
  }

  // 읽음 처리 이벤트
  async readChatRoomEvent(
    chatRoomId: string,
    readerType: 'OWNER' | 'USER',
    readerId: string
  ): Promise<{ receiverId: string; lastReadMessageId: string | null; readerId: string }> {
    const result = await this.chatRepository.markMessagesAsRead(chatRoomId, readerType, readerId);
    return {
      ...result,
      readerId
    };
  }

  // 메세지 처리
  async createMessage(params: CreateMessageParams): Promise<any>{
    const message = await this.chatRepository.createChatMessage(
      ChatMessageFactory.create(params)
    );
    return message;
  }
  
  // 채팅 요청서 생성
  async createChatRequest(request: CreateChatRequestDTO, userId: string, userType: 'owner' | 'requester'): Promise<any> {
    // 트랜젝션 시작
    return await runInTransaction(async () => {

      // fk 의존 관계 때문에 직접 생성
      // 요청서 id 생성 > json필드 생성 > 메세지 생성(요청서 타입) > 요청서 생성 순서
      const requestUuid = v4();

      const senderType = userType === 'owner' ? 'OWNER' : 'USER';

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
          senderType: senderType as 'OWNER' | 'USER',
          senderId: userId,
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
    requestId: string,
    userId: string,
    userType: 'owner' | 'requester'
  ): Promise<ChatRequestResponseDTO> {
    const chatRequest =  await this.chatRepository.getChatRequestById(requestId);
    if(!chatRequest) {
      throw new CreateTargetNotFoundError('채팅 요청서를 찾을 수 없습니다.');
    }

    // if(!await this.checkParticipantInRoom(chatRequest.chat_message.chat_room_id, userId, userType)) {
    //   throw new ChatRoomAccessDeniedError ('채팅 요청서에 접근 권한이 없습니다.');
    // }

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

  async createChatProposal(request: CreateChatProposalDTO, userId: string, userType: 'owner' | 'requester'): Promise<any> {
    // 트랜젝션 시작
    return await runInTransaction(async () => {

      // fk 의존 관계 때문에 직접 생성
      // 제안서 id 생성 > json필드 생성 > 메세지 생성(제안서 타입) > 제안서 생성 순서
      const proposalUuid = v4();

      const senderType = userType === 'owner' ? 'OWNER' : 'USER';

      // 채팅 제안서 페이로드 생성
      const payload = ChatMessageFactory.mapToProposalPayload({
              chatProposalId : proposalUuid,
              price : request.price,
              delivery : request.delivery,
              expectedWorking : request.expectedWorking
            }
          )
          
      // 메세지 처리와 요청서 제목 병렬 처리
      const [sendMessageResult, chatRequest] = await Promise.all([
        this.processSendMessage({
          chatRoomId: request.chatRoomId,
          senderType: senderType as 'OWNER' | 'USER',
          senderId: userId,
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
        request.content,
        message['props'].message_id as string,
        request.image
      );
      const result = {
        id: chatProposal.chat_proposal_id,
        createdAt: chatProposal.created_at as Date
      }
      
      return {result , message, receiverInfo};
    });
  }

  async getChatProposal(
    proposalId: string,
    userId: string,
    userType: 'owner' | 'requester'
  ): Promise<ChatProposalResponseDTO> {

    // if(!await this.checkParticipantInRoom(proposalId, userId, userType)) {
    //   throw new ChatRoomAccessDeniedError ('채팅 제안서에 접근 권한이 없습니다.');
    // }

    const chatProposal = await this.chatRepository.getChatProposalById(proposalId);
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
          content: chatProposal.content || '',
          images: chatProposal.image as string[],
        },
        createdAt: chatProposal.created_at as Date,
      };
  }

  // 채팅 요청서 수정
  async updateChatRequest(
    requestId: string,
    data: UpdateChatRequestDTO,
    userId : string,  
  ): Promise<SimplePatchResponseDTO> {

    // 권한 검사
    if(!await this.chatRepository.isMyChatRequest(requestId, userId)) {
      throw new ChatRoomAccessDeniedError ('채팅 요청서에 대한 수정 권한이 없습니다.');
    }

    // 이미지 삭제 목록 (트랜잭션 밖에서 처리하기 위해 미리 수집)
    let imagesToDelete: string[] = [];

    // 트랜잭션 내에서 DB 업데이트
    const result = await runInTransaction(async () => {
      const updateData: any = {};
      
      if (data.title !== undefined) updateData.title = data.title;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.minBudget !== undefined) updateData.minBudget = data.minBudget;
      if (data.maxBudget !== undefined) updateData.maxBudget = data.maxBudget;
      
      // 이미지 리스트 수정 시 삭제할 이미지 목록 수집
      if (data.image !== undefined) {
        const existingRequest = await this.chatRepository.getChatRequestById(requestId);
        if (existingRequest && existingRequest.image) {
          const oldImages = existingRequest.image as string[];
          const newImages = data.image;
          
          // 삭제할 이미지 목록 저장 (트랜잭션 후 삭제를 위해)
          imagesToDelete = await this.imageListDiff(oldImages, newImages as string[]);
        }
        updateData.image = data.image;
      }

      const updated = await this.chatRepository.updateChatRequest(requestId, updateData);

      // 메시지의 payload도 함께 업데이트
      if (updated.message_id) {
        // 현재 payload 조회
        const message = await this.chatRepository.getChatMessageById(updated.message_id);
        
        if (message) {
          const currentPayload = message.payload as any || {};
          
          // payload 업데이트 데이터 생성
          const newPayload = {
            ...currentPayload,
            ...(data.title !== undefined && { title: data.title }),
            ...(data.minBudget !== undefined && { minBudget: data.minBudget }),
            ...(data.maxBudget !== undefined && { maxBudget: data.maxBudget })
          };

          // 메시지 payload 업데이트
          await this.chatRepository.updateChatMessagePayload(updated.message_id, newPayload);
        }
      }

      return {
        id: updated.chat_request_id,
        updatedAt: updated.updated_at!
      };
    });

    // 트랜잭션 성공 후 S3에서 이미지 삭제
    if (imagesToDelete.length > 0) {
      try {
        await this.uploadService.deleteImage({url: imagesToDelete} as ImageUrls);
      } catch (error) {
        // S3 삭제 실패는 로깅만 하고 에러를 던지지 않음 (DB는 이미 업데이트됨)
        console.error('S3 이미지 삭제 실패 (orphan 파일 발생):', error);
      }
    }

    return result;
  }

  // 채팅 제안서 수정
  async updateChatProposal(
    proposalId: string,
    data: UpdateChatProposalDTO,
    userId: string
  ): Promise<SimplePatchResponseDTO> {

    // 권한 검사
    if(!await this.chatRepository.isMyChatProposal(proposalId, userId)) {
      throw new ChatRoomAccessDeniedError ('채팅 제안서에 대한 수정 권한이 없습니다.');
    }

    // 이미지 삭제 목록 (트랜잭션 밖에서 처리하기 위해 미리 수집)
    let imagesToDelete: string[] = [];

    // 트랜잭션 내에서 DB 업데이트
    const result = await runInTransaction(async () => {
      const updateData: any = {};
      
      if (data.price !== undefined) updateData.price = data.price;
      if (data.delivery !== undefined) updateData.delivery = data.delivery;
      if (data.expectedWorking !== undefined) updateData.expectedWorking = data.expectedWorking;
      if (data.content !== undefined) updateData.content = data.content;

      // 이미지 리스트 수정 시 삭제할 이미지 목록 수집
      if (data.image !== undefined) {
        const existingProposal = await this.chatRepository.getChatProposalById(proposalId);
        if (existingProposal && existingProposal.image) {
          const oldImages = existingProposal.image as string[];
          const newImages = data.image;
          
          // 삭제할 이미지 목록 저장 (트랜잭션 후 삭제를 위해)
          imagesToDelete = await this.imageListDiff(oldImages, newImages as string[]);
        }
        updateData.image = data.image;
      }

      const updated = await this.chatRepository.updateChatProposal(proposalId, updateData);

      // 메시지의 payload도 함께 업데이트
      if (updated.message_id) {
        // 현재 payload 조회
        const message = await this.chatRepository.getChatMessageById(updated.message_id);
        
        if (message) {
          const currentPayload = message.payload as any || {};
          
          // payload 업데이트 데이터 생성
          const newPayload = {
            ...currentPayload,
            ...(data.price !== undefined && { price: data.price }),
            ...(data.delivery !== undefined && { delivery: data.delivery }),
            ...(data.expectedWorking !== undefined && { expectedWorking: data.expectedWorking })
          };

          // 메시지 payload 업데이트
          await this.chatRepository.updateChatMessagePayload(updated.message_id, newPayload);
        }
      }

      return {
        id: updated.chat_proposal_id,
        updatedAt: updated.updated_at!
      };
    });

    // 트랜잭션 성공 후 S3에서 이미지 삭제 (필요시 사용)
    if (imagesToDelete.length > 0) {
      try {
        await this.uploadService.deleteImage({url: imagesToDelete} as ImageUrls);
      } catch (error) {
        // S3 삭제 실패는 로깅만 하고 에러를 던지지 않음 (DB는 이미 업데이트됨)
        console.error('S3 이미지 삭제 실패 (orphan 파일 발생):', error);
      }
    }

    return result;
  }


  async getChatMessages(
    userId: string,
    type: 'owner' | 'requester',
    roomId: string,
    cursor?: string,
    limit: number = 20
  ): Promise<ChatMessageListDTO> {


    if(type === 'owner') {
      if(!await this.checkParticipantInRoom(roomId, userId, 'owner')) {
        throw new ChatRoomAccessDeniedError ('채팅방 메시지에 대한 접근 권한이 없습니다.');
      }
    } else {
      if(!await this.checkParticipantInRoom(roomId, userId, 'requester')) {
        throw new ChatRoomAccessDeniedError ('채팅방 메시지에 대한 접근 권한이 없습니다.');
      }
    }

    // limit + 1개를 조회하여 다음 페이지 존재 여부 확인
    const messages = await this.chatRepository.getChatMessagesByRoomId(roomId, cursor, limit);

    const hasMore = messages.length > limit;
    const data = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].message_id : null;

    // 커서가 없는 경우(첫 페이지)에만 채팅방 정보 조회
    // 빈 문자열도 커서 없음으로 처리
    let chatRoomInfo = null;
    if (!cursor || cursor.trim() === '') {
      const chatRoom = await this.chatRepository.getChatRoomById(roomId);
      if (chatRoom) {
        // targetPayload 파싱 및 null 처리
        let parsedPayload = null;
        if (chatRoom.target_payload) {
          const payload = chatRoom.target_payload as any;
          if (chatRoom.type === 'PROPOSAL') {
            parsedPayload = {
              id: payload.id || null,
              title: payload.title || null,
              price: payload.price || null,
              image: payload.image || null
            };
          } else if (chatRoom.type === 'REQUEST') {
            parsedPayload = {
              id: payload.id || null,
              title: payload.title || null,
              minBudget: payload.minBudget || null,
              maxBudget: payload.maxBudget || null,
              image: payload.image || null
            };
          }
        }

        chatRoomInfo = {
          chatRoomId: chatRoom.chat_room_id,
          lastMessageId: chatRoom.last_message_id,
          ownerLastReadId: chatRoom.owner_last_read_id,
          requesterLastReadId: chatRoom.requester_last_read_id,
          targetPayload: parsedPayload,
          type: chatRoom.type as 'FEED' | 'REQUEST' | 'PROPOSAL',
          owner: {
            id: chatRoom.owner_id,
            nickname: chatRoom.owner?.nickname || null,
            profileImage: chatRoom.owner?.profile_photo || null
          },
          requester: {
            id: chatRoom.requester_id,
            nickname: chatRoom.user?.nickname || null,
            profileImage: chatRoom.user?.profile_photo || null
          }
        };
      }
    }

    return {
      data: data.map(msg => ({
        messageId: msg.message_id,
        senderId: msg.sender_id,
        senderType: msg.sender_type,
        messageType: msg.message_type,
        textContent: msg.text_content,
        payload: msg.payload,
        createdAt: msg.created_at!
      })),
      meta: {
        nextCursor: nextCursor ?? '',
        hasMore
      },
      chatRoomInfo
    };
  }

  async checkParticipantInRoom(
    roomId: string,
    userId: string,
    userType: 'owner' | 'requester'
  ): Promise<boolean> {
    const isOwner = userType === 'owner';
    const isParticipant = await this.chatRepository.isUserInChatRoom(roomId, userId, userType === 'owner');
    return isParticipant;
  }

  async imageListDiff(
    oldImages: string[],
    newImages: string[]
  ): Promise<string[]> {
    // 기존 이미지 중에서 새로운 리스트에 없는 이미지를 찾아 반환
    const imagesToDelete = oldImages.filter(oldImage => !newImages.includes(oldImage));
    return imagesToDelete;
  }

  /**
   * 채팅방 내 가장 최신 제안서의 가격 정보 조회
   */
  async getLatestProposalPrice(
    chatRoomId: string,
    userId: string,
    userType: 'owner' | 'requester'
  ): Promise<LatestProposalPriceDTO> {
    // 채팅방 참여자 검증
    const isParticipant = await this.chatRepository.isUserInChatRoom(
      chatRoomId, 
      userId, 
      userType === 'owner'
    );
    if (!isParticipant) {
      throw new ChatRoomAccessDeniedError('채팅방에 접근 권한이 없습니다.');
    }

    const result = await this.chatRepository.getLatestProposalPriceByChatRoomId(chatRoomId);
    
    return {
      price: result?.price ?? null,
      delivery: result?.delivery ?? null,
      expectedWorking: result?.expected_working ?? null
    };
  }

}
