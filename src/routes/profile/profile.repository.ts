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

    // 1. order 기본 정보 조회
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
}
