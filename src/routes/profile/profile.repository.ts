/* tslint:disable */
/* eslint-disable */

import { ItemDto, ReformDto } from './dto/profile.dto.js';
import prisma from '../../config/prisma.config.js';
import { PrismaClient } from '@prisma/client/extension';
import { CategoryNotExist } from './profile.error.js';
import { SaleRequestDto } from './dto/profile.req.dto.js';
import { RawOption, RawSaleData, RawSaleDetailData } from './profile.model.js';

export class ProfileRepository {
  private prisma: PrismaClient;
  constructor() {
    this.prisma = prisma;
  }

  async addProduct(
    mode: 'ITEM' | 'REFORM',
    dto: ItemDto | ReformDto
  ): Promise<void> {
    if (mode === 'ITEM') {
      const { images, option, category, ownerId, ...data } = dto as ItemDto;
      await prisma.$transaction(async (tx) => {
        const categorydata = await tx.category.findFirst({
          where: { name: category.sub },
          select: { category_id: true }
        });

        if (categorydata === null) {
          throw new CategoryNotExist('카테고리가 존재하지 않습니다.');
        }

        const ans = await tx.item.create({
          data: {
            owner_id: ownerId,
            ...data,
            category_id: categorydata.category_id
          }
        });

        for (const img of images) {
          await tx.item_photo.create({
            data: {
              item_id: ans.item_id,
              content: img.content,
              photo_order: img.photo_order
            }
          });
        }
        for (const opt of option) {
          const group = await tx.option_group.create({
            data: {
              item_id: ans.item_id,
              name: opt.title,
              sort_order: opt.sortOrder
            }
          });
          for (const optItem of opt.content) {
            await tx.option_item.create({
              data: {
                option_group_id: group.option_group_id,
                name: optItem.comment,
                extra_price: optItem.price,
                quantity: optItem.quantity,
                sort_order: optItem.sortOrder
              }
            });
          }
        }
      });
    } else if (mode == 'REFORM') {
      const { images, category, ownerId, ...data } = dto as ReformDto;
      await prisma.$transaction(async (tx) => {
        const categorydata = await tx.category.findFirst({
          where: { name: category.sub },
          select: { category_id: true }
        });

        if (categorydata === null) {
          throw new CategoryNotExist('카테고리가 존재하지 않습니다.');
        }

        const ans = await tx.reform_proposal.create({
          data: {
            owner_id: ownerId,
            ...data,
            category_id: categorydata.category_id
          }
        });
        for (const img of images) {
          await tx.reform_proposal_photo.create({
            data: {
              reform_proposal_id: ans.reform_proposal_id,
              content: img.content,
              photo_order: img.photo_order
            }
          });
        }
      });
    }
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
        reciept: {
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
        reciept: {
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
