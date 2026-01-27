import {
  Body,
  Controller,
  Example,
  Get,
  Patch,
  Path,
  Post,
  Query,
  Request,
  Response,
  Route,
  SuccessResponse,
  Tags
} from 'tsoa';
import { ResponseHandler, TsoaResponse } from '../../config/tsoaResponse.js';
import { ChatService } from './chat.service.js';
import { ChatProposalResponseDTO, ChatRequestResponseDTO, CreateChatRoomDTO, SimplePostResponseDTO,  ChatRoomListDTO, CreateChatRequestDTO, CreateChatProposalDTO, UpdateChatRequestDTO, UpdateChatProposalDTO } from './chat.dto.js';
import { ChatRoomFilter } from './chat.model.js';
import { WebSocketServer } from '../../infra/websocket/websocket.js';

@Route('chat')
@Tags('채팅 기능')
export class ChatController extends Controller {
  
  private chatService: ChatService;
  private wsServer = WebSocketServer.getInstance();

  constructor() {
    super();
    this.chatService = new ChatService();
  }
  /**
   * @summary 채팅방 생성
   * @description 요청글, 제안서, 피드등을 기반으로 채팅방을 생성합니다. 
   * 중복 채팅방 생성은 자동으로 방지됩니다.
   * 
   * **채팅방 타입별 생성 규칙:**
   * - REQUEST: 리폼러가 유저의 요청글을 보고 채팅방 개설
   * - PROPOSAL: 유저가 리폼러의 제안서를 보고 채팅방 개설
   * - FEED: 유저가 리폼러의 피드를 보고 문의 채팅방 개설
   * 
   * @param body 채팅방 생성 요청 데이터
   * @returns 생성된 채팅방의 고유 아이디와 생성 일시
   */
  @Post('/rooms')
  @SuccessResponse('201', 'Created')
  @Example<TsoaResponse<SimplePostResponseDTO>>({
    resultType: "SUCCESS",
    error: null,
    success: {
      id: "550e8400-e29b-41d4-a716-446655440000",
      createdAt: new Date()
    }
  })
  // @Response<CreateTargetNotFoundError>(404, '채팅방 생성 대상 리소스를 찾을 수 없습니다.')
  // @Response<InvalidChatRoomTypeError>(400, '유효하지 않은 채팅방 타입입니다.')
  public async createChatRoom(
    @Body() body: {request: CreateChatRoomDTO}
  ): Promise<TsoaResponse<SimplePostResponseDTO>> {
    const result = await this.chatService.createChatRoom(body.request);
    return new ResponseHandler<SimplePostResponseDTO>(result);
  }

  /**
   * @summary 채팅방 목록 조회
   * @description 특정 사용자가 참여중인 채팅방 목록을 조회합니다. 
   * 커서 기반 페이지네이션을 지원하며, 마지막 메시지 시간 기준 최신순으로 정렬됩니다.
   * 
   * @param myId 채팅방 목록을 조회할 사용자 고유 아이디(테스트용)
   * @param type 채팅방 목록 필터 타입
   * - 없음 : 전체 조회
   * - INQUIRY: 문의 채팅방 (FEED 타입)
   * - ORDER: 주문제작 채팅방 (REQUEST/PROPOSAL 타입)
   * - UNREAD: 안 읽은 메시지가 있는 채팅방
   * @param cursor 커서 기반 페이지네이션을 위한 커서 값, 마지막으로 조회된 채팅방의 ID
   * @param myType 사용자 유형(테스트용) - owner: 리폼러, requester: 일반 유저
   * @returns 채팅방 목록 배열 및 페이지네이션 정보
  */
  @Get('/rooms/list/{myId}')
  @Example<TsoaResponse<ChatRoomListDTO>>({
    resultType: "SUCCESS",
    error: null,
    success: {
      data: [
        {
          chatRoomId: "550e8400-e29b-41d4-a716-446655440000",
          image: "https://s3.example.com/thumb.jpg",
          title: "리폼마스터",
          roomType: "FEED",
          messageType: "TEXT",
          type: "INQUIRY",
          lastMessage: "안녕하세요, 문의드립니다.",
          lastMessageAt: new Date(),
          unreadCount: 3
        }
      ],
      meta: {
        nextCursor: "660e8400-e29b-41d4-a716-446655440111",
        hasMore: true
      }
    }
  })
  // @Response<InvalidChatRoomFilterError>(400, '유효하지 않은 채팅방 필터입니다.')
  public async getChatRooms(
    @Path() myId: string,       // 테스트용
    @Query() type?: ChatRoomFilter,
    @Query() cursor?: string,
    @Query() myType?: 'owner' | 'requester'    // 테스트용
  ): Promise<TsoaResponse<ChatRoomListDTO>> {
    const result = await this.chatService.getChatRooms(myId, myType as 'owner' | 'requester', type, cursor, 3);
    return new ResponseHandler<ChatRoomListDTO>(result);
  }

  /**
   * @summary 채팅 요청서 생성
   * @description 채팅방 내에서 리폼 요청서를 생성합니다. 
   * 요청서는 메시지 형태로 저장되며, 수신자에게 실시간 알림이 전송됩니다.
   * 
   * **사용 시나리오:** 유저가 리폼러와의 채팅에서 구체적인 리폼 요청 사항을 정리하여 전달
   * 
   * @param request 채팅 요청서 생성 데이터
   * @returns 생성된 채팅 요청의 고유 아이디와 생성 일시
   */
  @Post('/request')
  @SuccessResponse('201', 'Created')
  @Example<TsoaResponse<SimplePostResponseDTO>>({
    resultType: "SUCCESS",
    error: null,
    success: {
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      createdAt: new Date()
    }
  })
  public async createChatRequest(
    @Body() request: CreateChatRequestDTO
  ): Promise<TsoaResponse<SimplePostResponseDTO>> {
    const { result, message, receiverInfo } = await this.chatService.createChatRequest(request);
    this.wsServer.getHandler().notifyNewMessage(receiverInfo.receiverId, message);
    return new ResponseHandler<SimplePostResponseDTO>(result);
  }

  /**
   * @summary 채팅 요청서 조회
   * @description 채팅 요청서의 상세 정보를 조회합니다. 
   * 요청자 정보, 본문 내용, 예산 범위, 첨부 이미지 등을 포함합니다.
   * 
   * @param requestId 채팅 요청서의 고유 아이디
   * @returns 채팅 요청서 상세 정보
   */
  @Get('/request/{requestId}')
  @Example<TsoaResponse<ChatRequestResponseDTO>>({
    resultType: "SUCCESS",
    error: null,
    success: {
      chatRequestId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      messageId: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      requester: {
        id: "123e4567-e89b-12d3-a456-426614174000",
        nickname: "홍길동",
        profileImage: "https://s3.example.com/profile.jpg"
      },
      body: {
        title: "청바지 리폼 의뢰합니다",
        content: "청바지 기장을 줄이고 밑단을 수선해주세요.",
        minBudget: 30000,
        maxBudget: 50000,
        images: ["https://s3.example.com/image1.jpg"]
      },
      createdAt: new Date()
    }
  })
  public async getChatRequest(
    @Path() requestId: string
  ): Promise<TsoaResponse<ChatRequestResponseDTO>> {
    // 권한 검사는 로그인 완성되면
    const result = await this.chatService.getChatRequest(requestId);
    return new ResponseHandler<ChatRequestResponseDTO>(result);
  }

  /**
   * @summary 채팅 요청서 수정
   * @description 이미 생성된 채팅 요청서의 내용을 수정합니다. 
   * 수정할 필드만 전송하면 되며, 전송되지 않은 필드는 기존 값을 유지합니다.
   * 
   * **수정 가능 필드:** 제목, 내용, 예산 범위, 첨부 이미지
   * 
   * @param requestId 채팅 요청서의 고유 아이디
   * @param request 수정할 요청서 정보 (부분 수정 지원)
   * @returns 수정된 요청서의 고유 아이디와 수정 일시
   */
  @Patch('/request/{requestId}')
  @Example<TsoaResponse<SimplePostResponseDTO>>({
    resultType: "SUCCESS",
    error: null,
    success: {
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      createdAt: new Date()
    }
  })
  public async updateChatRequest(
    @Path() requestId: string,
    @Body() request: UpdateChatRequestDTO
  ): Promise<TsoaResponse<SimplePostResponseDTO>> {
    // 권한 검사는 로그인 완성되면
    const result = await this.chatService.updateChatRequest(requestId, request);
    return new ResponseHandler<SimplePostResponseDTO>(result);
  }

  /**
   * @summary 채팅 제안서 생성
   * @description 채팅방 내에서 리폼 제안서를 생성합니다. 
   * 리폼러가 유저의 요청에 대해 구체적인 견적(가격, 배송비, 예상 작업일)을 제안합니다.
   * 제안서는 메시지 형태로 저장되며, 수신자에게 실시간 알림이 전송됩니다.
   * 
   * **사용 시나리오:** 리폼러가 유저의 요청을 검토한 후 구체적인 작업 조건을 제안
   * 
   * @param request 채팅 제안서 생성 데이터
   * @returns 생성된 채팅 제안서의 고유 아이디와 생성 일시
   */
  @Post('/proposal')
  @SuccessResponse('201', 'Created')
  @Example<TsoaResponse<SimplePostResponseDTO>>({
    resultType: "SUCCESS",
    error: null,
    success: {
      id: "c3d4e5f6-a7b8-9012-cdef-123456789abc",
      createdAt: new Date()
    }
  })
  public async createChatProposal(
    @Body() request: CreateChatProposalDTO  
  ): Promise<TsoaResponse<SimplePostResponseDTO>> {
    const { result, message, receiverInfo } = await this.chatService.createChatProposal(request);
    this.wsServer.getHandler().notifyNewMessage(receiverInfo.receiverId, message);
    return new ResponseHandler<SimplePostResponseDTO>(result);
  }

  /**
   * @summary 채팅 제안서 조회
   * @description 채팅 제안서의 상세 정보를 조회합니다. 
   * 리폼러 정보, 제안 가격, 배송비, 예상 작업 기간 등을 포함합니다.
   * 
   * @param proposalId 채팅 제안서의 고유 아이디
   * @returns 채팅 제안서 상세 정보
   */
  @Get('/proposal/{proposalId}')
  @Example<TsoaResponse<ChatProposalResponseDTO>>({
    resultType: "SUCCESS",
    error: null,
    success: {
      chatProposalId: "c3d4e5f6-a7b8-9012-cdef-123456789abc",
      messageId: "d4e5f6a7-b8c9-0123-def0-123456789def",
      owner: {
        id: "789e4567-e89b-12d3-a456-426614174000",
        nickname: "리폼마스터",
        profileImage: "https://s3.example.com/owner-profile.jpg"
      },
      body: {
        title: "청바지 리폼 의뢰합니다",
        price: 45000,
        delivery: 3000,
        expectedWorking: 7
      },
      createdAt: new Date()
    }
  })
  public async getChatProposal(
    @Path() proposalId: string
  ): Promise<TsoaResponse<ChatProposalResponseDTO>> {
    // 권한 검사는 로그인 완성되면
    const result = await this.chatService.getChatProposal(proposalId);
    return new ResponseHandler<ChatProposalResponseDTO>(result);
  }

  /**
   * @summary 채팅 제안서 수정
   * @description 이미 생성된 채팅 제안서의 내용을 수정합니다. 
   * 수정할 필드만 전송하면 되며, 전송되지 않은 필드는 기존 값을 유지합니다.
   * 
   * **수정 가능 필드:** 제안 가격, 배송비, 예상 작업 일수
   * 
   * **사용 시나리오:** 리폼러가 견적을 재조정하거나 작업 기간을 변경할 때
   * 
   * @param proposalId 채팅 제안서의 고유 아이디
   * @param request 수정할 제안서 정보 (부분 수정 지원)
   * @returns 수정된 제안서의 고유 아이디와 수정 일시
   */
  @Patch('/proposal/{proposalId}')
  @Example<TsoaResponse<SimplePostResponseDTO>>({
    resultType: "SUCCESS",
    error: null,
    success: {
      id: "c3d4e5f6-a7b8-9012-cdef-123456789abc",
      createdAt: new Date()
    }
  })
  public async updateChatProposal(
    @Path() proposalId: string,
    @Body() request: UpdateChatProposalDTO
  ): Promise<TsoaResponse<SimplePostResponseDTO>> {
    // 권한 검사는 로그인 완성되면
    const result = await this.chatService.updateChatProposal(proposalId, request);
    return new ResponseHandler<SimplePostResponseDTO>(result);
  }




}
