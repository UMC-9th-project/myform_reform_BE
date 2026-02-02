/* tslint:disable */
/* eslint-disable */

import prisma from '../../config/prisma.config.js';
import { PrismaClient } from '@prisma/client/extension';
import { CategoryNotExist } from './profile.error.js';
import { SaleRequestDto } from './dto/profile.req.dto.js';
import {
  Item,
  ItemDto,
  RawOption,
  RawSaleData,
  RawSaleDetailData,
  Reform,
  ReformDto
} from './profile.model.js';
import { OptionGroup } from '../../@types/item.js';

export class ProfileRepository {
  private prisma: PrismaClient;
  constructor() {
    this.prisma = prisma;
  }

  async getCategory(dto: ItemDto | ReformDto) {
    const category = dto.category;
    return await prisma.category.findFirst({
      where: { name: category.sub },
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
        category_id: categoryId
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
        category_id: categoryId
      }
    });
  }

  async getOrder(dto: SaleRequestDto): Promise<RawSaleData[]> {
    const { ownerId, type, page, limit } = dto;

    const orders = await prisma.order.findMany({
      where: {
        owner_id: ownerId,
        target_type:
          type === 'REFORM' ? { in: ['REQUEST', 'PROPOSAL'] } : 'ITEM'
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
        user: {
          select: {
            name: true
          }
        },
        receipt: {
          select: {
            created_at: true
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
    return orders;
  }

  async getRequestTitles(requestIds: string[]) {
    return await prisma.reform_request.findMany({
      where: { reform_request_id: { in: requestIds } },
      select: { reform_request_id: true, title: true }
    });
  }

  async getRequestTitle(requestId: string) {
    return await prisma.reform_request.findFirst({
      where: { reform_request_id: requestId },
      select: { title: true }
    });
  }

  async getProposalTitles(proposalIds: string[]) {
    return await prisma.reform_proposal.findMany({
      where: { reform_proposal_id: { in: proposalIds } },
      select: { reform_proposal_id: true, title: true }
    });
  }

  async getProposalTitle(proposalId: string) {
    return await prisma.reform_proposal.findFirst({
      where: { reform_proposal_id: proposalId },
      select: { title: true }
    });
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
        item_photo: { select: { content: true }, orderBy: { photo_order: 'asc' }, take: 1 }
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
        reform_proposal_photo: { select: { content: true }, orderBy: { photo_order: 'asc' }, take: 1 }
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
        item_photo: { select: { content: true }, orderBy: { photo_order: 'asc' }, take: 1 }
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
        reform_proposal_photo: { select: { content: true }, orderBy: { photo_order: 'asc' }, take: 1 }
      }
    });
    return proposals.map((p: (typeof proposals)[number]) => ({
      reform_proposal_id: p.reform_proposal_id,
      title: p.title,
      price: p.price !== null ? Number(p.price) : null,
      photo: p.reform_proposal_photo[0]?.content ?? null
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
        user_address: true,
        user: {
          select: {
            name: true,
            phone: true
          }
        },
        receipt: {
          select: {
            created_at: true
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

  async findUserWishTargetIds(userId: string, targetType: 'ITEM' | 'PROPOSAL', targetIds: string[]) {
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
        profile_photo: true,
        nickname: true,
        avg_star: true,
        review_count: true,
        keywords: true,
        bio: true
      }
    });
  }

  async countSaleByOwnerId(ownerId: string): Promise<number> {
    const [itemCount, proposalCount] = await Promise.all([
      this.prisma.item.count({ where: { owner_id: ownerId } }),
      this.prisma.reform_proposal.count({ where: { owner_id: ownerId } })
    ]);
    return itemCount + proposalCount;
  }

  async findFeedsByOwnerId(ownerId: string, cursor: string | undefined, take: number) {
    const whereCondition: { owner_id: string; OR?: unknown[]; feed_id?: { lt: string } } = {
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

  async findItemsByOwnerId(ownerId: string, cursor: string | undefined, take: number) {
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

  async findProposalsByOwnerId(ownerId: string, cursor: string | undefined, take: number) {
    const where = cursor
      ? { owner_id: ownerId, reform_proposal_id: { lt: cursor } }
      : { owner_id: ownerId };

    return await this.prisma.reform_proposal.findMany({
      where,
      take: take + 1,
      orderBy: { created_at: 'desc' },
      include: {
        reform_proposal_photo: {
          orderBy: { photo_order: 'asc' },
          take: 1
        }
      }
    });
  }

  async findReviewsByOwnerId(ownerId: string, cursor: string | undefined, take: number) {
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
}
