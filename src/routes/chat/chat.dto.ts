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

export class SimplePatchResponseDTO {
  /** @format uuid */
  id!: UUID;
  updatedAt!: Date;
}

export class CreateChatRoomDTO {
  id!: UUID;
  type!: 'REQUEST' | 'PROPOSAL' | 'FEED';
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
