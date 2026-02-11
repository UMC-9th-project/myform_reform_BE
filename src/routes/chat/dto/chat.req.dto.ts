import { UUID } from '../../../@types/common.js';
import { ChatRoomFilter, MessageType } from '../chat.model.js';


export class ChatRoomQueryParams {
  filter?: ChatRoomFilter;
  cursor?: UUID | null;
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

export class CreateChatRoomWithProposalDTO {
  images!: string[];
  targetId!: UUID;;
  price!: number;
  contents!: string;
  delivery!: number;
  expectedWorking!: number;
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



