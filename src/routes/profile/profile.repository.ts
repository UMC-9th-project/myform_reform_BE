/* tslint:disable */
/* eslint-disable */

import prisma from '../../config/prisma.config.js';
import { PrismaClient } from '@prisma/client/extension';
import { CategoryNotExist } from './profile.error.js';
import {
  OrderRequestDto,
  RequestListRequestDto,
  SaleRequestDto
} from './dto/profile.req.dto.js';
import {
  Item,
  ItemDto,
  RawOption,
  RawSaleData,
  RawSaleDetailData,
  Reform,
  ReformDto,
  RawOrderData,
  RawOrderDetailData,
  RawOptionItemsWithGroup,
  RequestData,
  RawRequestData
} from './profile.model.js';
import { OptionGroup } from '../../@types/item.js';
import { target_type_enum } from '@prisma/client';

export class ProfileRepository {
  private prisma: PrismaClient;
  constructor() {
    this.prisma = prisma;
  }

  async getCategory(dto: ItemDto | ReformDto) {
    const category = dto.category;
    const categoryName = category.sub ?? category.major;
    return await prisma.category.findFirst({
      where: { name: categoryName },
      select: { category_id: true }
    });
  }

  async isOrderOwner(ownerId: string, orderId: string) {
    return (
      (await prisma.order.findFirst({
        where: {
          owner_id: ownerId,
          order_id: orderId
        }
      })) !== null
    );
  }

  async addItem(dto: ItemDto, categoryId: string) {
    return await prisma.item.create({
      data: {
        owner_id: dto.ownerId,
        title: dto.title,
        content: dto.content,
        price: dto.price,
        delivery: dto.delivery,
        category_id: categoryId,
        avg_star: 0,
        review_count: 0,
        item_photo:
          dto.images.length > 0
            ? {
                create: dto.images.map((img) => ({
                  content: img.content,
                  photo_order: img.photo_order
                }))
              }
            : undefined
      }
    });
  }

  async addOption(itemId: string, options: OptionGroup[]) {
    const groups = await Promise.all(
      options.map((opt) =>
        prisma.option_group.create({
          data: {
            item_id: itemId,
            name: opt.title,
            sort_order: opt.sortOrder,
            option_item: {
              createMany: {
                data: opt.content.map((optItem) => ({
                  name: optItem.comment,
                  extra_price: optItem.price,
                  quantity: optItem.quantity,
                  sort_order: optItem.sortOrder
                }))
              }
            }
          }
        })
      )
    );
    return groups;
  }

  async addReform(dto: ReformDto, categoryId: string) {
    return await prisma.reform_proposal.create({
      data: {
        owner_id: dto.ownerId,
        title: dto.title,
        content: dto.content,
        price: dto.price,
        delivery: dto.delivery,
        expected_working: dto.expectedWorking,
        category_id: categoryId,
        avg_star: 0,
        review_count: 0,
        reform_proposal_photo:
          dto.images.length > 0
            ? {
                create: dto.images.map((img) => ({
                  content: img.content,
                  photo_order: img.photo_order
                }))
              }
            : undefined
      }
    });
  }

  async getOrder(dto: SaleRequestDto): Promise<RawSaleData[]> {
    const { ownerId, type, page, limit, sort } = dto;
    const taregeTypes: target_type_enum[] =
      type === 'REFORM' ? ['REQUEST', 'PROPOSAL', 'FEED'] : ['ITEM'];

    const orders = await prisma.order.findMany({
      where: {
        owner_id: ownerId,
        target_type: {
          in: taregeTypes
        }
      },
      take: limit,
      skip: (page - 1) * limit,
      select: {
        order_id: true,
        target_id: true,
        status: true,
        price: true,
        delivery_fee: true,
        target_type: true,
        chat_room_id: true,
        user: {
          select: {
            name: true
          }
        },
        receipt: {
          select: {
            created_at: true,
            receipt_number: true
          }
        }
      }
    });
    return orders;
  }

  async getRequestTitleAndImages(requestIds: string[]) {
    if (requestIds.length === 0) return [];
    const rows = await prisma.reform_request.findMany({
      where: { reform_request_id: { in: requestIds } },
      select: {
        reform_request_id: true,
        title: true,
        reform_request_photo: {
          select: { content: true },
          orderBy: { photo_order: 'asc' }
        }
      }
    });
    return rows.map((r) => ({
      reform_request_id: r.reform_request_id,
      title: r.title,
      images: (r.reform_request_photo ?? [])
        .map((p) => p.content ?? '')
        .filter(Boolean)
    }));
  }

  async getRequestTitleAndImagesSingle(requestId: string) {
    const row = await prisma.reform_request.findFirst({
      where: { reform_request_id: requestId },
      select: {
        title: true,
        reform_request_photo: {
          select: { content: true },
          orderBy: { photo_order: 'asc' }
        }
      }
    });
    if (!row) return null;
    return {
      title: row.title,
      images: (row.reform_request_photo ?? [])
        .map((p) => p.content ?? '')
        .filter(Boolean)
    };
  }

  async getProposalTitleAndImages(proposalIds: string[]) {
    if (proposalIds.length === 0) return [];
    const rows = await prisma.reform_proposal.findMany({
      where: { reform_proposal_id: { in: proposalIds } },
      select: {
        reform_proposal_id: true,
        title: true,
        reform_proposal_photo: {
          select: { content: true },
          orderBy: { photo_order: 'asc' }
        }
      }
    });
    return rows.map((p) => ({
      reform_proposal_id: p.reform_proposal_id,
      title: p.title,
      images: (p.reform_proposal_photo ?? [])
        .map((ph) => ph.content ?? '')
        .filter(Boolean)
    }));
  }

  async getProposalTitleAndImagesSingle(proposalId: string) {
    const row = await prisma.reform_proposal.findFirst({
      where: { reform_proposal_id: proposalId },
      select: {
        title: true,
        reform_proposal_photo: {
          select: { content: true },
          orderBy: { photo_order: 'asc' }
        }
      }
    });
    if (!row) return null;
    return {
      title: row.title,
      images: (row.reform_proposal_photo ?? [])
        .map((p) => p.content ?? '')
        .filter(Boolean)
    };
  }

  /** FEED 주문용: chat_request_id로 요청서 제목·사진 조회 (target_id = chat_request_id) */
  async getChatRequestTitles(chatRequestIds: string[]) {
    if (chatRequestIds.length === 0) return [];
    const rows = await prisma.chat_request.findMany({
      where: { chat_request_id: { in: chatRequestIds } },
      select: { chat_request_id: true, title: true, image: true }
    });
    return rows.map((r) => ({
      chat_request_id: r.chat_request_id,
      title: r.title,
      images: r.image ?? []
    }));
  }

  /** FEED 주문 상세용: 제목·사진만 */
  async getChatRequestTitleAndImages(chatRequestId: string) {
    const row = await prisma.chat_request.findFirst({
      where: { chat_request_id: chatRequestId },
      select: { title: true, image: true }
    });
    if (!row) return null;
    return {
      title: row.title,
      images: row.image ?? []
    };
  }

  async getTitleAndThumbnailByTarget(
    targetType: 'FEED' | 'REQUEST' | 'PROPOSAL',
    targetId: string
  ): Promise<{ title: string; thumbnail: string } | null> {
    let result: { title: string | null; images: string[] } | null = null;
    if (targetType === 'FEED') {
      result = await this.getChatRequestTitleAndImages(targetId);
    } else if (targetType === 'REQUEST') {
      result = await this.getRequestTitleAndImagesSingle(targetId);
    } else if (targetType === 'PROPOSAL') {
      result = await this.getProposalTitleAndImagesSingle(targetId);
    }
    if (!result) return null;
    return {
      title: result.title ?? '',
      thumbnail: result.images?.[0] ?? ''
    };
  }

  async getTitleAndThumbnailsForOrders(
    orders: Array<{ target_type: string | null; target_id: string | null }>
  ): Promise<Map<string, { title: string; thumbnail: string }>> {
    const requestIds = orders
      .filter((o) => o.target_type === 'REQUEST' && o.target_id)
      .map((o) => o.target_id!);
    const proposalIds = orders
      .filter((o) => o.target_type === 'PROPOSAL' && o.target_id)
      .map((o) => o.target_id!);
    const feedIds = orders
      .filter((o) => o.target_type === 'FEED' && o.target_id)
      .map((o) => o.target_id!);

    const [requests, proposals, chatRequests] = await Promise.all([
      this.getRequestTitleAndImages(requestIds),
      this.getProposalTitleAndImages(proposalIds),
      this.getChatRequestTitles(feedIds)
    ]);

    const map = new Map<string, { title: string; thumbnail: string }>();
    for (const r of requests) {
      map.set(r.reform_request_id, {
        title: r.title ?? '',
        thumbnail: r.images?.[0] ?? ''
      });
    }
    for (const p of proposals) {
      map.set(p.reform_proposal_id, {
        title: p.title ?? '',
        thumbnail: p.images?.[0] ?? ''
      });
    }
    for (const cr of chatRequests) {
      map.set(cr.chat_request_id, {
        title: cr.title ?? '',
        thumbnail: cr.images?.[0] ?? ''
      });
    }
    return map;
  }

  async getItemTitle(itemId: string) {
    return await this.prisma.item.findFirst({
      where: { item_id: itemId },
      select: { title: true }
    });
  }

  async getItemInfo(itemId: string) {
    const item = await this.prisma.item.findFirst({
      where: { item_id: itemId },
      select: {
        title: true,
        price: true,
        item_photo: {
          select: { content: true },
          orderBy: { photo_order: 'asc' },
          take: 1
        }
      }
    });
    if (!item) return null;
    return {
      title: item.title,
      price: item.price !== null ? Number(item.price) : null,
      photo: item.item_photo[0]?.content ?? null
    };
  }

  async getProposalInfo(proposalId: string) {
    const proposal = await this.prisma.reform_proposal.findFirst({
      where: { reform_proposal_id: proposalId },
      select: {
        title: true,
        price: true,
        reform_proposal_photo: {
          select: { content: true },
          orderBy: { photo_order: 'asc' },
          take: 1
        }
      }
    });
    if (!proposal) return null;
    return {
      title: proposal.title,
      price: proposal.price !== null ? Number(proposal.price) : null,
      photo: proposal.reform_proposal_photo[0]?.content ?? null
    };
  }

  async getItemInfos(itemIds: string[]) {
    if (itemIds.length === 0) return [];
    const items = await this.prisma.item.findMany({
      where: { item_id: { in: itemIds } },
      select: {
        item_id: true,
        title: true,
        price: true,
        item_photo: {
          select: { content: true },
          orderBy: { photo_order: 'asc' },
          take: 1
        }
      }
    });
    return items.map((item: (typeof items)[number]) => ({
      item_id: item.item_id,
      title: item.title,
      price: item.price !== null ? Number(item.price) : null,
      photo: item.item_photo[0]?.content ?? null
    }));
  }

  async getProposalInfos(proposalIds: string[]) {
    if (proposalIds.length === 0) return [];
    const proposals = await this.prisma.reform_proposal.findMany({
      where: { reform_proposal_id: { in: proposalIds } },
      select: {
        reform_proposal_id: true,
        title: true,
        price: true,
        reform_proposal_photo: {
          select: { content: true },
          orderBy: { photo_order: 'asc' },
          take: 1
        }
      }
    });
    return proposals.map((p: (typeof proposals)[number]) => ({
      reform_proposal_id: p.reform_proposal_id,
      title: p.title,
      price: p.price !== null ? Number(p.price) : null,
      photo: p.reform_proposal_photo[0]?.content ?? null
    }));
  }

  async getRequestInfos(requestIds: string[]) {
    if (requestIds.length === 0) return [];
    const requests = await this.prisma.reform_request.findMany({
      where: { reform_request_id: { in: requestIds } },
      select: {
        reform_request_id: true,
        title: true,
        min_budget: true,
        max_budget: true,
        reform_request_photo: {
          select: { content: true },
          orderBy: { photo_order: 'asc' },
          take: 1
        }
      }
    });
    return requests.map((request: (typeof requests)[number]) => ({
      reform_request_id: request.reform_request_id,
      title: request.title,
      minBudget:
        request.min_budget !== null ? Number(request.min_budget) : null,
      maxBudget:
        request.max_budget !== null ? Number(request.max_budget) : null,
      photo: request.reform_request_photo[0]?.content ?? null
    }));
  }

  async getFeedInfos(feedIds: string[]) {
    if (feedIds.length === 0) return [];
    const feeds = await this.prisma.chat_request.findMany({
      where: { chat_request_id: { in: feedIds } },
      select: {
        chat_request_id: true,
        message_id: true,
        title: true,
        image: true,
        min_budget: true,
        max_budget: true
      }
    });
    return feeds.map((feed: (typeof feeds)[number]) => ({
      chatRequestId: feed.chat_request_id,
      messageId: feed.message_id,
      title: feed.title,
      photo: feed.image[0],
      min_budget: feed.min_budget,
      max_budget: feed.max_budget,
      expectedWorking: feed.expected_working
    }));
  }

  async getOrderDetail(
    ownerId: string,
    orderId: string
  ): Promise<RawSaleDetailData> {
    return await prisma.order.findFirstOrThrow({
      where: {
        owner_id: ownerId,
        order_id: orderId
      },
      select: {
        order_id: true,
        target_id: true,
        status: true,
        price: true,
        delivery_fee: true,
        target_type: true,
        chat_room_id: true,
        user: {
          select: {
            name: true,
            phone: true
          }
        },
        receipt: {
          select: {
            created_at: true,
            receipt_number: true,
            delivery_postal_code: true,
            delivery_address: true,
            delivery_address_detail: true,
            delivery_recipient_name: true,
            delivery_phone: true,
            delivery_address_name: true
          }
        },
        quote_photo: {
          select: {
            content: true
          },
          orderBy: {
            photo_order: 'asc'
          },
          take: 1
        }
      }
    });
  }

  async getOption(orderId: string): Promise<RawOption | null> {
    return await prisma.order_option.findFirst({
      where: { order_id: orderId },
      select: {
        option_item: {
          select: {
            name: true,
            extra_price: true
          }
        }
      }
    });
  }

  async findUserWishTargetIds(
    userId: string,
    targetType: 'ITEM' | 'PROPOSAL',
    targetIds: string[]
  ) {
    if (targetIds.length === 0) return [];
    const rows = await this.prisma.user_wish.findMany({
      where: {
        user_id: userId,
        target_type: targetType,
        target_id: { in: targetIds }
      },
      select: { target_id: true }
    });
    return rows
      .map((r: { target_id: string | null }) => r.target_id)
      .filter((id: string | null): id is string => id !== null);
  }

  async findReviewStatsByOwnerId(ownerId: string) {
    return await this.prisma.review.aggregate({
      where: { owner_id: ownerId },
      _avg: { star: true },
      _count: { review_id: true }
    });
  }

  async findOwnerById(ownerId: string) {
    return await this.prisma.owner.findUnique({
      where: { owner_id: ownerId },
      select: {
        owner_id: true,
        profile_photo: true,
        nickname: true,
        avg_star: true,
        review_count: true,
        keywords: true,
        bio: true
      }
    });
  }

  async findOwnerByNickname(nickname: string) {
    return await this.prisma.owner.findUnique({
      where: { nickname },
      select: {
        owner_id: true,
        profile_photo: true,
        nickname: true,
        avg_star: true,
        review_count: true,
        keywords: true,
        bio: true
      }
    });
  }

  async findAvgStarRecent3MonthsByOwnerId(
    ownerId: string
  ): Promise<number | null> {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const result = await this.prisma.review.aggregate({
      where: {
        owner_id: ownerId,
        created_at: { gte: threeMonthsAgo }
      },
      _avg: { star: true }
    });
    return result._avg.star != null ? Number(result._avg.star) : null;
  }

  async countSaleByOwnerId(ownerId: string): Promise<number> {
    const [itemCount, proposalCount] = await Promise.all([
      this.prisma.item.count({ where: { owner_id: ownerId } }),
      this.prisma.reform_proposal.count({ where: { owner_id: ownerId } })
    ]);
    return itemCount + proposalCount;
  }

  async findFeedsByOwnerId(
    ownerId: string,
    cursor: string | undefined,
    take: number
  ) {
    const whereCondition: {
      owner_id: string;
      OR?: unknown[];
      feed_id?: { lt: string };
    } = {
      owner_id: ownerId
    };

    if (cursor) {
      const cursorFeed = await this.prisma.feed.findUnique({
        where: { feed_id: cursor },
        select: { is_pinned: true, created_at: true }
      });

      if (!cursorFeed) {
        return [];
      }

      if (cursorFeed.created_at) {
        whereCondition.OR = [
          { is_pinned: false },
          {
            is_pinned: cursorFeed.is_pinned ?? false,
            created_at: { lt: cursorFeed.created_at }
          }
        ];
      } else {
        whereCondition.feed_id = { lt: cursor };
      }
    }

    return await this.prisma.feed.findMany({
      where: whereCondition,
      take: take + 1,
      orderBy: [{ is_pinned: 'desc' }, { created_at: 'desc' }],
      include: {
        feed_photo: {
          orderBy: { photo_order: 'asc' }
        }
      }
    });
  }

  async createFeed(
    ownerId: string,
    isPinned: boolean
  ): Promise<{ feed_id: string }> {
    const feed = await this.prisma.feed.create({
      data: {
        owner_id: ownerId,
        is_pinned: isPinned
      },
      select: { feed_id: true }
    });
    return feed;
  }

  async createFeedPhotos(feedId: string, imageUrls: string[]): Promise<void> {
    if (imageUrls.length === 0) return;
    await this.prisma.feed_photo.createMany({
      data: imageUrls.map((content, index) => ({
        feed_id: feedId,
        content,
        photo_order: index + 1
      }))
    });
  }

  async findItemsByOwnerId(
    ownerId: string,
    cursor: string | undefined,
    take: number
  ) {
    const where = cursor
      ? { owner_id: ownerId, item_id: { lt: cursor } }
      : { owner_id: ownerId };

    return await this.prisma.item.findMany({
      where,
      take: take + 1,
      orderBy: { created_at: 'desc' },
      include: {
        item_photo: {
          orderBy: { photo_order: 'asc' },
          take: 1
        }
      }
    });
  }

  async findProposalsByOwnerId(
    ownerId: string,
    cursor: string | undefined,
    take: number
  ) {
    const where = cursor
      ? { owner_id: ownerId, reform_proposal_id: { lt: cursor } }
      : { owner_id: ownerId };

    return await this.prisma.reform_proposal.findMany({
      where,
      take: take + 1,
      orderBy: { created_at: 'desc' },
      include: {
        category: {
          select: {
            category_id: true,
            parent_id: true
          }
        },
        reform_proposal_photo: {
          orderBy: { photo_order: 'asc' },
          take: 1
        }
      }
    });
  }

  async findReviewsByOwnerId(
    ownerId: string,
    cursor: string | undefined,
    take: number
  ) {
    const where = cursor
      ? { owner_id: ownerId, review_id: { lt: cursor } }
      : { owner_id: ownerId };

    return await this.prisma.review.findMany({
      where,
      take: take + 1,
      orderBy: { created_at: 'desc' },
      include: {
        review_photo: {
          orderBy: { photo_order: 'asc' }
        },
        order: {
          select: {
            target_type: true,
            target_id: true
          }
        }
      }
    });
  }

  async findUsersByIds(userIds: string[]) {
    if (userIds.length === 0) return [];
    return this.prisma.user.findMany({
      where: { user_id: { in: userIds } },
      select: {
        user_id: true,
        name: true,
        nickname: true,
        profile_photo: true
      }
    });
  }

  async getOrdersByUserId(dto: OrderRequestDto): Promise<RawOrderData[]> {
    const { userId, type, cursor, limit, order, onlyReviewAvailable } = dto;
    const targetTypeFilter = {
      REFORM: { in: ['REQUEST', 'PROPOSAL', 'FEED'] },
      ITEM: 'ITEM',
      ALL: undefined
    };
    const whereClause: any = {
      user_id: userId,
      target_type: targetTypeFilter[type as keyof typeof targetTypeFilter],
      status: { not: 'PENDING' }
    };

    if (onlyReviewAvailable) {
      whereClause.review = { none: {} };
    }

    const orders = await this.prisma.order.findMany({
      where: whereClause,
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { order_id: cursor } : undefined,
      orderBy: [
        {
          receipt: {
            created_at: order
          }
        },
        {
          order_id: order
        }
      ],
      select: {
        order_id: true,
        target_id: true,
        status: true,
        price: true,
        delivery_fee: true,
        target_type: true,
        quantity: true,
        tracking_number: true,
        chat_room_id: true,
        owner: {
          select: {
            nickname: true
          }
        },
        receipt: {
          select: {
            created_at: true,
            receipt_number: true
          }
        },
        review: {
          select: {
            review_id: true
          }
        }
      }
    });
    return orders;
  }

  async getOrderDetailByOrderId(orderId: string): Promise<RawOrderDetailData> {
    return await prisma.order.findFirstOrThrow({
      where: { order_id: orderId },
      select: {
        order_id: true,
        user_id: true,
        target_type: true,
        target_id: true,
        status: true,
        price: true,
        delivery_fee: true,
        tracking_number: true,
        receipt: {
          select: {
            created_at: true,
            receipt_number: true,
            delivery_address: true,
            delivery_address_detail: true,
            delivery_address_name: true,
            delivery_phone: true,
            delivery_postal_code: true,
            delivery_recipient_name: true
          }
        }
      }
    });
  }

  async getOptionIdsByOrderId(orderId: string): Promise<string[]> {
    if (!orderId) return [];
    const optionIds = await prisma.order_option.findMany({
      where: { order_id: orderId },
      orderBy: [
        {
          option_item: {
            sort_order: 'asc'
          }
        }
      ],
      select: {
        option_item: {
          select: {
            option_item_id: true
          }
        }
      }
    });
    return optionIds.map(
      (optionId: (typeof optionIds)[number]) =>
        optionId.option_item.option_item_id
    );
  }

  async getOptionItemsWithGroup(
    optionItemIds: string[] | undefined
  ): Promise<RawOptionItemsWithGroup[]> {
    return await prisma.option_group.findMany({
      where: {
        option_item: {
          some: {
            option_item_id: { in: optionItemIds }
          }
        }
      },
      orderBy: {
        sort_order: 'asc'
      },
      select: {
        option_group_id: true,
        name: true,
        option_item: {
          where: { option_item_id: { in: optionItemIds } },
          orderBy: {
            sort_order: 'asc'
          },
          select: {
            option_item_id: true,
            name: true,
            extra_price: true
          }
        }
      }
    });
  }

  async getRequestsByUserId(
    dto: RequestListRequestDto
  ): Promise<RequestData[]> {
    const { cursor, limit, userId, order } = dto;
    const requests: RawRequestData[] =
      await this.prisma.reform_request.findMany({
        where: {
          user_id: userId
        },
        take: limit + 1,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { reform_request_id: cursor } : undefined,
        orderBy: [{ created_at: order }, { reform_request_id: order }],
        select: {
          reform_request_id: true,
          user_id: true,
          title: true,
          min_budget: true,
          max_budget: true,
          due_date: true,
          created_at: true,
          reform_request_photo: {
            select: {
              reform_request_photo_id: true,
              content: true
            },
            orderBy: [
              { photo_order: 'asc' },
              { reform_request_photo_id: 'asc' }
            ],
            take: 1
          }
        }
      });
    return requests.map((request) => {
      const photo = request.reform_request_photo[0];

      return {
        reformRequestId: request.reform_request_id,
        userId: request.user_id ?? userId,
        title: request.title ?? '',
        minBudget: request.min_budget ? Number(request.min_budget) : null,
        maxBudget: request.max_budget ? Number(request.max_budget) : null,
        dueDate: request.due_date,
        createdAt: request.created_at,
        reformRequestPhotoId: photo?.reform_request_photo_id ?? null,
        thumbnail: photo?.content ?? ''
      };
    });
  }

  async checkItemOwner(ownerId: string, itemId: string): Promise<boolean> {
    return (
      (await prisma.item.findFirst({
        where: {
          owner_id: ownerId,
          item_id: itemId
        }
      })) !== null
    );
  }

  async updateItem(
    itemId: string,
    updateData: {
      title?: string;
      content?: string;
      price?: number;
      delivery?: number;
      category_id?: string;
    }
  ) {
    return await prisma.item.update({
      where: { item_id: itemId },
      data: updateData
    });
  }

  async deleteItemPhotos(itemId: string) {
    await prisma.item_photo.deleteMany({
      where: { item_id: itemId }
    });
  }

  async createItemPhotos(itemId: string, images: string[]) {
    await prisma.item_photo.createMany({
      data: images.map((content, index) => ({
        item_id: itemId,
        content,
        photo_order: index + 1
      }))
    });
  }

  async deleteOptionsByItemId(itemId: string) {
    const existingGroups = await prisma.option_group.findMany({
      where: { item_id: itemId },
      select: { option_group_id: true }
    });
    const groupIds = existingGroups.map((g) => g.option_group_id);

    if (groupIds.length > 0) {
      await prisma.option_item.deleteMany({
        where: { option_group_id: { in: groupIds } }
      });
      await prisma.option_group.deleteMany({
        where: { item_id: itemId }
      });
    }
  }
}
