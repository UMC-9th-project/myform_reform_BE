import { UUID } from '../../@types/common.js';
import { ChatRoomFilter } from './chat.model.js';

/**
 * @pattern ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$
 */

/**
 * 페이지네이션 메타데이터
 */
export type Pagenation = {
    /**
     * 다음 페이지 조회를 위한 커서 값
     * @example "660e8400-e29b-41d4-a716-446655440111"
     */
    nextCursor: UUID | null;
    /**
     * 다음 페이지 존재 여부
     * @example true
     */
    hasMore: boolean;
};

/**
 * 채팅방 목록 조회를 위한 쿼리 파라미터
 */
export interface ChatRoomQueryParams {
  /**
   * 채팅방 목록 필터 타입
   * - 없음 : 전체 조회
   * - INQUIRY: 문의 채팅방
   * - ORDER: 주문제작 채팅방
   * - UNREAD: 안 읽은 메시지가 있는 채팅방
   */
  filter?: ChatRoomFilter; // 전체 조회 시 안 보냄
  /**
   * 커서 기반 페이지네이션을 위한 커서 값, 마지막으로 조회된 채팅방의 ID
   */
  cursor?: UUID | null;
}

/**
 * 리소스 생성 또는 수정 성공 시 반환되는 기본 응답 객체
 */
export interface SimplePostResponseDTO{
    /**
     * 생성 또는 수정된 리소스의 고유 아이디
     * @format uuid
     * @example "550e8400-e29b-41d4-a716-446655440000"
     */
    id : UUID;
    /**
     * 생성 또는 수정 일시
     * @example "2024-01-15T10:30:00.000Z"
     */
    createdAt : Date;
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
     * - PROPOSAL: 제안서 기반 채팅방 (유저가 리폼러에게)
     * - FEED: 피드 기반 문의 채팅방 (유저가 리폼러에게)
     * @example "FEED"
     */
    type : 'REQUEST' | 'PROPOSAL' | 'FEED';
}

/**
 * 채팅방 미리보기 DTO
 */
export interface ChatRoomPreviewDTO {
    /**
     * 채팅방 고유 아이디
     * @example "550e8400-e29b-41d4-a716-446655440000"
     */
    chatRoomId : UUID;
    /**
     * 썸네일 이미지 URL
     * @example "https://s3.example.com/thumb.jpg"
     */
    image: string;
    /**
     * 채팅방 제목 (상대방 닉네임 또는 상품 제목)
     * @example "리폼마스터"
     */
    title: string;
    /**
     * 채팅방 타입 (REQUEST/PROPOSAL/FEED)
     * @example "FEED"
     */
    roomType: string;
    /**
     * 마지막 메시지 타입
     * @example "TEXT"
     */
    messageType: 'TEXT' | 'IMAGE' | 'OTHER';
    /**
     * 채팅방 분류
     * - INQUIRY: 문의 채팅
     * - ORDER: 주문제작 채팅
     * @example "INQUIRY"
     */
    type : 'INQUIRY' | 'ORDER';
    /**
     * 마지막 메시지 내용
     * @example "안녕하세요, 문의드립니다."
     */
    lastMessage : string;
    /**
     * 마지막 메시지 전송 시각
     * @example "2024-01-15T14:30:00.000Z"
     */
    lastMessageAt : Date;
    /**
     * 안 읽은 메시지 수
     * @example 3
     * @minimum 0
     */
    unreadCount : number;
}

/**
 * 채팅방 목록 응답 DTO
 */
export interface ChatRoomListDTO {
    /**
     * 채팅방 미리보기 목록
     */
    data : ChatRoomPreviewDTO[];
    /**
     * 페이지네이션 메타데이터
     */
    meta: Pagenation;
}

/**
 * 채팅 요청서 생성 DTO
 */
export interface CreateChatRequestDTO {
    /**
     * 채팅방 고유 아이디
     * @example "550e8400-e29b-41d4-a716-446655440000"
     */
    chatRoomId: UUID;
    /**
     * 첨부 이미지 URL 배열
     * @example ["https://s3.example.com/image1.jpg", "https://s3.example.com/image2.jpg"]
     */
    image: string[] | null;
    /**
     * 요청서 제목
     * @example "청바지 리폼 의뢰합니다"
     * @minLength 1
     * @maxLength 100
     */
    title: string;
    /**
     * 요청서 상세 내용
     * @example "청바지 기장을 줄이고 밑단을 수선해주세요."
     * @minLength 1
     * @maxLength 1000
     */
    content: string;
    /**
     * 최대 예산 (원)
     * @example 50000
     * @minimum 0
     */
    maxBudget: number | null;
    /**
     * 최소 예산 (원)
     * @example 30000
     * @minimum 0
     */
    minBudget: number | null;
}

/**
 * 채팅 요청서 수정 DTO
 */
export interface UpdateChatRequestDTO {
    /**
     * 첨부 이미지 URL 배열 (선택)
     * @example ["https://s3.example.com/updated-image.jpg"]
     */
    image?: string[] | null;
    /**
     * 요청서 제목 (선택)
     * @example "청바지 리폼 의뢰합니다 (수정)"
     * @minLength 1
     * @maxLength 100
     */
    title?: string;
    /**
     * 요청서 상세 내용 (선택)
     * @example "청바지 기장을 5cm 줄여주세요."
     * @minLength 1
     * @maxLength 1000
     */
    content?: string;
    /**
     * 최대 예산 (원, 선택)
     * @example 60000
     * @minimum 0
     */
    maxBudget?: number | null;
    /**
     * 최소 예산 (원, 선택)
     * @example 40000
     * @minimum 0
     */
    minBudget?: number | null;
}


/**
 * 채팅 요청서 조회 응답 DTO
 */
export interface ChatRequestResponseDTO {
    /**
     * 채팅 요청서 고유 아이디
     * @example "550e8400-e29b-41d4-a716-446655440000"
     */
    chatRequestId : UUID;
    /**
     * 메시지 고유 아이디
     * @example "660e8400-e29b-41d4-a716-446655440111"
     */
    messageId : UUID;
    /**
     * 요청자 정보
     */
    requester : {
        /**
         * 요청자 고유 아이디
         * @example "123e4567-e89b-12d3-a456-426614174000"
         */
        id : UUID;
        /**
         * 요청자 닉네임
         * @example "홍길동"
         */
        nickname : string;
        /**
         * 요청자 프로필 이미지 URL
         * @example "https://s3.example.com/profile.jpg"
         */
        profileImage : string | null;
    },
    /**
     * 요청서 본문
     */
    body : {
        /**
         * 요청서 제목
         * @example "청바지 리폼 의뢰합니다"
         */
        title : string;
        /**
         * 요청서 내용
         * @example "청바지 기장을 줄이고 밑단을 수선해주세요."
         */
        content : string;
        /**
         * 최소 예산 (원)
         * @example 30000
         */
        minBudget : number | null;
        /**
         * 최대 예산 (원)
         * @example 50000
         */
        maxBudget : number | null;
        /**
         * 첨부 이미지 URL 배열
         * @example ["https://s3.example.com/image1.jpg"]
         */
        images : string[] | null;
    },
    /**
     * 생성 일시
     * @example "2024-01-15T10:30:00.000Z"
     */
    createdAt : Date;
}


/**
 * 채팅 제안서 생성 DTO
 */
export interface CreateChatProposalDTO {
    /**
     * 채팅방 고유 아이디
     * @example "550e8400-e29b-41d4-a716-446655440000"
     */
    chatRoomId: UUID;
    /**
     * 제안 가격 (원)
     * @example 45000
     * @minimum 0
     */
    price: number;
    /**
     * 배송비 (원)
     * @example 3000
     * @minimum 0
     */
    delivery: number;
    /**
     * 예상 작업 일수
     * @example 7
     * @minimum 1
     */
    expectedWorking: number;
}

/**
 * 채팅 제안서 수정 DTO
 */
export interface UpdateChatProposalDTO {

    /**
     * 제안 가격 (원, 선택)
     * @example 50000
     * @minimum 0
     */
    price?: number;
    /**
     * 배송비 (원, 선택)
     * @example 3500
     * @minimum 0
     */
    delivery?: number;
    /**
     * 예상 작업 일수 (선택)
     * @example 5
     * @minimum 1
     */
    expectedWorking?: number;
}

/**
 * 채팅 제안서 조회 응답 DTO
 */
export interface ChatProposalResponseDTO {
    /**
     * 채팅 제안서 고유 아이디
     * @example "550e8400-e29b-41d4-a716-446655440000"
     */
    chatProposalId : UUID;
    /**
     * 메시지 고유 아이디
     * @example "660e8400-e29b-41d4-a716-446655440111"
     */
    messageId : UUID;
    /**
     * 리폼러(제안자) 정보
     */
    owner : {
        /**
         * 리폼러 고유 아이디
         * @example "789e4567-e89b-12d3-a456-426614174000"
         */
        id : UUID;
        /**
         * 리폼러 닉네임
         * @example "리폼마스터"
         */
        nickname : string;
        /**
         * 리폼러 프로필 이미지 URL
         * @example "https://s3.example.com/owner-profile.jpg"
         */
        profileImage : string | null;
    },
    /**
     * 제안서 본문
     */
    body : {
        /**
         * 제안서 제목 (요청서 제목 기반)
         * @example "청바지 리폼 의뢰합니다"
         */
        title : string;
        /**
         * 제안 가격 (원)
         * @example 45000
         */
        price : number | null;
        /**
         * 배송비 (원)
         * @example 3000
         */
        delivery : number;
        /**
         * 예상 작업 일수
         * @example 7
         */
        expectedWorking : number;
    },
    /**
     * 생성 일시
     * @example "2024-01-15T10:30:00.000Z"
     */
    createdAt : Date;
}

export interface ChatMessageListDTO {

    data: ChatMessageDTO[];
    meta: Pagenation;
}

export interface ChatMessageDTO {
    messageId: string;
    senderId: string | null;
    senderType: 'USER' | 'OWNER' | null;
    messageType: 'text' | 'image' | 'request' | 'proposal' | 'payment' | 'result';
    textContent: string | null;
    payload: any | null;
    createdAt: Date;
}
