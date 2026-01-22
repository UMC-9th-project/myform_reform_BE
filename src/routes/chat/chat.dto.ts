import { UUID } from '../../types/common.js';
import { ChatRoomFilter } from './chat.model.js';

/**
 * @pattern ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$
 */

/**
 * 페이지네이션 메타데이터
 */
export type Pagenation = {
    nextCursor: UUID | null;
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
 * 리소스 생성 성공 시 반환되는 기본 응답 객체
 */
export interface SimplePostResponseDTO{
    /**
     * @format uuid
     */
    id : UUID;
    createdAt : Date;
}

// /**
//  * 리소스 수정 성공 시 반환되는 기본 응답 객체
//  */
// export interface SimplePatchResponseDTO{
//     /**
//      * @format uuid
//      */
//     id : string;
//     updatedAt : Date;
// }

/**
 * 채팅방 생성 요청 DTO
 */
export interface CreateChatRoomDTO{

    /**
     * 요청글, 제안서, 프로필등 채팅방을 생성하는 주체의 고유 아이디
     */
    id : UUID;
    type : 'REQUEST' | 'PROPOSAL' | 'FEED';
    /**
     * 채팅방을 생성하는 사용자 ID (테스트용 - 로그인 구현 전까지 사용)
     */
    myId : UUID;
}

export interface ChatRoomPreviewDTO {
    /**
     * @format uuid
     * @pattern ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$
     * @example "123e4567-e89b-12d3-a456-426614174000"
     */
    chatRoomId : UUID;
    image: string;
    title: string;
    roomType: string;
    messageType: 'TEXT' | 'IMAGE' | 'OTHER'; // 임시
    type : 'INQUIRY' | 'ORDER';
    lastMessage : UUID;
    lastMessageAt : Date;
    /**
     * 안 읽은 메시지 수
     * @example 3
     * @minimum 0
     */
    unreadCount : number;
}

export interface ChatRoomListDTO {
    data : ChatRoomPreviewDTO[];
    meta: Pagenation;
}
