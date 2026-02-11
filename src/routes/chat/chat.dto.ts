import { UUID } from '../../@types/common.js';
import { ChatRoomFilter, MessageType } from './chat.model.js';

/**
 * @pattern ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$
 */

/**
 * 페이지네이션 메타데이터
 */
export class Pagenation {
  /**
   * 다음 페이지 조회를 위한 커서 값
   * @example "660e8400-e29b-41d4-a716-446655440111"
   */
  nextCursor!: UUID | null;
  /**
   * 다음 페이지 존재 여부
   * @example true
   */
  hasMore!: boolean;
}

export class ChatRoomQueryParams {
  filter?: ChatRoomFilter;
  cursor?: UUID | null;
}

export class SimplePostResponseDTO {
  /** @format uuid */
  id!: UUID;
  createdAt!: Date;
}

export class CreateChatRoomResponseDTO {
  /** @format uuid */
  id!: UUID;
  createdAt!: Date;
  isNew!: boolean;
}




/**
 * 리소스 수정 성공 시 반환되는 기본 응답 객체
 */
export interface SimplePatchResponseDTO{
    /**
     * 수정된 리소스의 고유 아이디
     * @format uuid
     * @example "550e8400-e29b-41d4-a716-446655440000"
     */
    id : UUID;
    /**
     * 수정 일시
     * @example "2024-01-15T10:30:00.000Z"
     */
    updatedAt : Date;
}

/**
 * 채팅방 생성 요청 DTO
 */
export interface CreateChatRoomDTO{

    /**
     * 요청글, 제안서, 프로필등 채팅방을 생성하는 주체의 고유 아이디
     * @example "550e8400-e29b-41d4-a716-446655440000"
     */
    id : UUID;
    /**
     * 채팅방 타입
     * - REQUEST: 요청글 기반 채팅방 (리폼러가 유저에게)
     * - (다른 api를 사용해주세요)PROPOSAL: 제안서 기반 채팅방 (유저가 리폼러에게)
     * - FEED: 피드 기반 문의 채팅방 (유저가 리폼러에게)
     * @example "FEED"
     */
    type : 'REQUEST' | 'FEED' | 'PROPOSAL';
}

export interface CreateChatRoomWithProposalDTO {

    /**
     * 제안서를 작성 하는 대상 요청서의 고유 아이디
     * @example "550e8400-e29b-41d4-a716-446655440000"
     */
    requestId : UUID;
    /**
     * 첨부 이미지 URL 배열
     * @example ["https://s3.example.com/image1.jpg", "https://s3.example.com/image2.jpg"]
     */
    image: string[] | null;
    price : number;
    delivery : number;
    expectedWorking : number;
    content : string;

}




export class ChatRoomPreviewDTO {
  chatRoomId!: UUID;
  image!: string;
  title!: string;
  roomType!: string;
  messageType!: MessageType;
  type!: 'INQUIRY' | 'ORDER';
  lastMessage!: string;
  lastMessageAt!: Date;
  unreadCount!: number;
}

export class ChatRoomListDTO {
  data!: ChatRoomPreviewDTO[];
  meta!: Pagenation;
}

export class CreateChatRequestDTO {
  chatRoomId!: UUID;
  image!: string[] | null;
  title!: string;
  content!: string;
  maxBudget!: number | null;
  minBudget!: number | null;
}

export class UpdateChatRequestDTO {
  image?: string[] | null;
  title?: string;
  content?: string;
  maxBudget?: number | null;
  minBudget?: number | null;
}


export class ChatRequestResponseDTO {
  chatRequestId!: UUID;
  messageId!: UUID;
  requester!: {
    id: UUID;
    nickname: string;
    profileImage: string | null;
  };
  body!: {
    title: string;
    content: string;
    minBudget: number | null;
    maxBudget: number | null;
    images: string[] | null;
  };
  createdAt!: Date;
}


export class CreateChatProposalDTO {
  chatRoomId!: UUID;
  price!: number;
  delivery!: number;
  expectedWorking!: number;
  content!: string;
  image!: string[];
}

export class UpdateChatProposalDTO {
  price?: number;
  delivery?: number;
  expectedWorking?: number;
  content?: string;
  image?: string[];
}

export class ChatProposalResponseDTO {
  chatProposalId!: UUID;
  messageId!: UUID;
  owner!: {
    id: UUID;
    nickname: string;
    profileImage: string | null;
  };
  body!: {
    title: string;
    price: number | null;
    delivery: number;
    expectedWorking: number;
    content: string;
    images: string[];
  };
  createdAt!: Date;
}

export class ChatMessageListDTO {
  data!: ChatMessageDTO[];
  meta!: Pagenation;
  chatRoomInfo!: ChatRoomInfoDTO | null;
}

export class ChatRoomInfoDTO {
  chatRoomId!: string;
  lastMessageId!: string | null;
  ownerLastReadId!: string | null;
  requesterLastReadId!: string | null;
  targetPayload!: any | null;
  type!: 'FEED' | 'REQUEST' | 'PROPOSAL';
  owner!: {
    id: string;
    nickname: string | null;
    profileImage: string | null;
  };
  requester!: {
    id: string;
    nickname: string | null;
    profileImage: string | null;
  };
}

export class ChatMessageDTO {
  messageId!: string;
  senderId!: string | null;
  senderType!: 'USER' | 'OWNER' | null;
  messageType!: 'text' | 'image' | 'request' | 'proposal' | 'payment' | 'result';
  textContent!: string | null;
  payload!: any | null;
  createdAt!: Date;
}
