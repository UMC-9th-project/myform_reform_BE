// @ts-nocheck
import prisma from '../../config/prisma.config.js';
import { handleDbError } from '../../utils/dbErrorHandler.js';
import { ChatRoom } from './chat.model.js';
import { Prisma } from '@prisma/client';
import { ChatRoomPreviewDTO, ChatRoomListDTO } from './chat.dto.js';

interface RepoParams {
  myId: string;
  isOwner: boolean;
  cursor?: string;
  limit: number;
}

export class ChatRepository {
  constructor() {}

  // 채팅방 생성
  async createChatRoom(ChatRoomInstance: ChatRoom): Promise<ChatRoom> {
    try {
      const data = ChatRoomInstance.toPersistence();
      const raw = await prisma.chat_room.create({
        data: {
          type: data.type,
          target_payload:
            data.target_payload as unknown as Prisma.InputJsonValue,
          owner_id: data.owner_id,
          requester_id: data.requester_id
        }
      });
      return ChatRoom.fromPersistence(raw);
    } catch (error) {
      throw handleDbError(error);
    }
  }

  //전체 조회
  async getAllChatRooms(p: RepoParams) {
    return this.fetchChatRoomList(p, {});
  }

  //문의(FEED) 조회
  async getInquiryChatRooms(p: RepoParams) {
    return this.fetchChatRoomList(p, { type: 'FEED' });
  }

  //주문제작(PROPOSAL/REQUEST) 조회
  async getOrderChatRooms(p: RepoParams) {
    const type = p.isOwner ? 'PROPOSAL' : 'REQUEST';
    return this.fetchChatRoomList(p, { type });
  }

  //안읽음 조회
  async getUnreadChatRooms(p: RepoParams) {
    const unreadFilter = p.isOwner
      ? { owner_unread_count: { gt: 0 } }
      : { requester_unread_count: { gt: 0 } };
    return this.fetchChatRoomList(p, unreadFilter);
  }

  // 공통 채팅방 조회 로직
  private async fetchChatRoomList(
    p: RepoParams,
    additionalFilter: Prisma.chat_roomWhereInput
  ): Promise<ChatRoomListDTO> {
    const { myId, isOwner, cursor, limit } = p;

    try {
      // 기본 WHERE 조건
      // myId에 따른 소유자/요청자 필터링 + 추가 필터링
      const baseWhere: Prisma.chat_roomWhereInput = {
        ...(isOwner ? { owner_id: myId } : { requester_id: myId }),
        ...additionalFilter
      };

      // 커서 기반 페이지네이션
      let cursorCondition: Prisma.chat_roomWhereInput = {};
      if (cursor) {
        const cursorRoom = await prisma.chat_room.findUnique({
          where: { chat_room_id: cursor },
          select: { last_message_id: true, chat_room_id: true }
        });

        if (cursorRoom) {
          cursorCondition = {
            OR: [
              {
                last_message_id: {
                  lt: cursorRoom.last_message_id ?? undefined
                }
              },
              {
                last_message_id: cursorRoom.last_message_id,
                chat_room_id: { lt: cursorRoom.chat_room_id }
              },
              {
                last_message_id: { equals: null },
                chat_room_id: { lt: cursorRoom.chat_room_id }
              }
            ]
          };
        }
      }

      const whereClause: Prisma.chat_roomWhereInput = {
        AND: [baseWhere, cursorCondition]
      };

      // FEED 타입만 상대방 정보 조회(나머지은 target_payload에 정보가 다 들어있음)
      const isFeedOnly =
        additionalFilter &&
        'type' in additionalFilter &&
        additionalFilter.type === 'FEED';
      const shouldIncludeOpponent =
        !additionalFilter ||
        Object.keys(additionalFilter).length === 0 ||
        isFeedOnly;

      // 쿼리 실행
      const chatRooms = await prisma.chat_room.findMany({
        where: whereClause,
        include: {
          ...(shouldIncludeOpponent && {
            owner: {
              select: {
                nickname: true,
                profile_photo: true
              }
            },
            requester: {
              select: {
                nickname: true,
                profile_photo: true
              }
            }
          }),
          chat_message_chat_room_last_message_idTochat_message: true
        },
        orderBy: [
          { last_message_id: { sort: 'desc', nulls: 'last' } },
          { chat_room_id: 'desc' }
        ],
        take: limit + 1
      });

      return this.processResult(chatRooms, limit, isOwner);
    } catch (error) {
      throw handleDbError(error);
    }
  }

  private processResult(
    rows: any[],
    limit: number,
    isOwner: boolean
  ): ChatRoomListDTO {
    const hasMore = rows.length > limit;
    const dataRows = hasMore ? rows.slice(0, limit) : rows;

    const data = dataRows.map((row) => this.mapToPreviewDTO(row, isOwner));

    let nextCursor: string | null = null;
    if (hasMore && dataRows.length > 0) {
      const lastRow = dataRows[dataRows.length - 1];
      nextCursor = lastRow.chat_room_id;
    }

    return {
      data,
      meta: {
        nextCursor: nextCursor ?? '',
        hasMore
      }
    };
  }

  private mapToPreviewDTO(row: any, isOwner: boolean): ChatRoomPreviewDTO {
    const isFeed = row.type === 'FEED';
    const payload =
      typeof row.target_payload === 'string'
        ? JSON.parse(row.target_payload)
        : row.target_payload;

    const opponent = isFeed ? (isOwner ? row.requester : row.owner) : null;
    const lastMessage = row.chat_message_chat_room_last_message_idTochat_message;

    return {
      chatRoomId: row.chat_room_id,
      image: isFeed ? opponent?.profile_photo || '' : payload?.imageUrl || '',
      title: isFeed ? opponent?.nickname || '' : payload?.title || '주문 상세',
      roomType: row.type,
      messageType: (lastMessage?.message_type as any) || 'TEXT',
      type: isFeed ? 'INQUIRY' : 'ORDER',
      lastMessage: lastMessage?.text_content || '',
      lastMessageAt: lastMessage?.created_at || row.created_at,
      unreadCount: isOwner ? row.owner_unread_count : row.requester_unread_count
    };
  }
}

export class AccountRepository {
  constructor() {}

  async findOwnerById(id: string) {
    try {
      return await prisma.owner.findUnique({
        where: { owner_id: id }
      });
    } catch (error) {
      throw handleDbError(error);
    }
  }

  async findRequesterById(id: string) {
    try {
      return await prisma.user.findUnique({
        where: { user_id: id }
      });
    } catch (error) {
      throw handleDbError(error);
    }
  }
}

export class TargetRepository {
  constructor() {}

  async findProposalWithOwnerById(id: string) {
    try {
      return await prisma.reform_proposal.findUnique({
        where: { reform_proposal_id: id },
        include: {
          owner: true,
          reform_proposal_photo: {
            where: { photo_order: 1 }
          }
        }
      });
    } catch (error) {
      throw handleDbError(error);
    }
  }

  async findRequestWithUserById(id: string) {
    try {
      return await prisma.reform_request.findUnique({
        where: { reform_request_id: id },
        include: {
          user: true,
          reform_request_photo: {
            where: { photo_order: 1 }
          }
        }
      });
    } catch (error) {
      throw handleDbError(error);
    }
  }

  async findFeedWithOwnerById(id: string) {
    try {
      return await prisma.feed.findUnique({
        where: { feed_id: id },
        include: { owner: true }
      });
    } catch (error) {
      throw handleDbError(error);
    }
  }
}
