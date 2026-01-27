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

export interface CreateChatRequestDTO {
    chatRoomId: UUID;
    myId: UUID;// 테스트용 - 로그인 구현 전까지 사용
    myType: 'OWNER' | 'REQUESTER'; // 테스트용 - 로그인 구현 전까지 사용
    image: string[] | null;
    title: string;
    content: string;
    maxBudget: number | null;
    minBudget: number | null;
}


export interface ChatRequestResponseDTO {

    chatRequestId : UUID;
    messageId : UUID;
    requester : {
        id : UUID;
        nickname : string;
        profileImage : string | null;
    },
    body : {
        title : string;
        content : string;
        minBudget : number | null;
        maxBudget : number | null;
        images : string[] | null;
    },
    createdAt : Date;
}


export interface CreateChatProposalDTO {

    chatRoomId: UUID;
    myId: UUID;// 테스트용 - 로그인 구현 전까지 사용
    myType: 'OWNER' | 'REQUESTER'; // 테스트용 - 로그인 구현 전까지 사용
    price: number;
    delivery: number;
    expectedWorking: number;
}

export interface ChatProposalResponseDTO {
    chatProposalId : UUID;
    messageId : UUID;
    owner : {
        id : UUID;
        nickname : string;
        profileImage : string | null;
    },
    body : {
        title : string;
        price : number | null;
        delivery : number;
        expectedWorking : number;
    },
    createdAt : Date;
}

export interface GetChatMessageListDTO {

    chatMessages : ChatMessageDTO[];
    meta: Pagenation;
}

export interface ChatMessageDTO {
    messageId : UUID;
    senderId : UUID;
    senderType : 'OWNER' | 'USER';
    messageType : 'TEXT' | 'IMAGE' | 'OTHER';
    content : string;
    createdAt : Date;
}