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
import { TargetNotFoundError, InvalidChatTypeError, InvalidChatRoomFilterError } from './chat.error.js';
import { CreateChatRoomDTO, SimplePostResponseDTO,  ChatRoomListDTO } from './chat.dto.js';
import { ChatRoomFilter } from './chat.model.js';
import { DatabaseForeignKeyError, DatabaseRecordNotFoundError, DbConnectionError, DatabaseUniqueConstraintError } from '../../utils/dbErrorHandler.js';


@Route('api/v1/chat')
@Tags('채팅 기능')
// 오류 있음 BasicError상속클래스에 <T> 제너릭 타입 미선언시 tsoa 빌드 범위안에 들어가면 오류가 발생
// @Response<DatabaseForeignKeyError>(409, '연관된 데이터가 없거나 참조 중인 데이터가 있습니다.')
// @Response<DatabaseRecordNotFoundError>(404, '해당 데이터를 찾을 수 없어 수정/삭제할 수 없습니다.')
// @Response<DbConnectionError>(500, '데이터베이스 연결에 실패했습니다.')
// @Response<DatabaseUniqueConstraintError>(409, '중복된 데이터가 존재합니다.')
export class ChatController extends Controller {
  
  private chatService: ChatService;

  constructor() {
    super();
    this.chatService = new ChatService();
  }
  /**
   * @summary 채팅방 생성
   * @description 요청글, 제안서, 피드등을 기반으로 채팅방을 생성합니다.
   * @param 생성위치ID, 타입, 요청자ID(테스트용) 등이 포함된 요청 객체
   * @returns 생성된 채팅방의 고유 아이디와 생성 일시
   */
  @Post('/rooms')
  @SuccessResponse('201', 'Created')
  // @Response<TargetNotFoundError>(404, '채팅방 생성 대상 리소스를 찾을 수 없습니다.')
  // @Response<InvalidChatTypeError>(400, '유효하지 않은 채팅방 타입입니다.')
  public async createChatRoom(
    @Body() body: {request: CreateChatRoomDTO}
  ): Promise<TsoaResponse<SimplePostResponseDTO>> {
    const result = await this.chatService.createChatRoom(body.request);
    return new ResponseHandler<SimplePostResponseDTO>(result);
  }

  /**
   * @summary 채팅방 목록 조회
   * @description 특정 사용자가 참여중인 채팅방 목록을 조회합니다.
   * @param myId 채팅방 목록을 조회할 사용자 고유 아이디(테스트용)
   * @param type 채팅방 목록 필터 타입
   * - 없음 : 전체 조회
   * - INQUIRY: 문의 채팅방
   * - ORDER: 주문제작 채팅방
   * - UNREAD: 안 읽은 메시지가 있는 채팅방
   * @param cursor 커서 기반 페이지네이션을 위한 커서 값, 마지막으로 조회된 채팅방의 ID
   * @param myType 사용자 유형(테스트용)
   * @returns 채팅방 목록 배열
  */
  @Get('/rooms/list/{myId}')
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

  // @Get('/')
  // public async setTest(): Promise<TsoaResponse<string>> {
  //   const answer = await this.chatService.helloworld();
  //   throw new CustomExample('에러 테스트');
  // }
}
