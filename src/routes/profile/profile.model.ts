/* tslint:disable */
/* eslint-disable */

import { ItemDto, ReformDto } from './profile.dto.js';
import prisma from '../../config/prisma.config.js';
import { PrismaClient } from '@prisma/client/extension';
import { CategoryNotExist } from './profile.error.js';
import { target_type_enum } from '@prisma/client';
import { UUID } from '../../types/common.js';

export class ProfileModel {
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

  async getSales(type: target_type_enum, ownerId: UUID) {
    // 1. order 기본 정보 조회
    const orders = await prisma.order.findMany({
      where: {
        owner_id: ownerId,
        target_type: type
      },
      select: {
        order_id: true,
        target_id: true,
        status: true,
        price: true,
        delivery_fee: true,
        user: {
          select: {
            name: true
          }
        },
        reciept: {
          select: {
            created_at: true
          }
        }
      }
    });
    // 2. reform_proposal 관련 데이터 별도 조회
    const targetIds = orders.map((o) => o.target_id) as string[];

    const reforms = await prisma.reform_proposal.findMany({
      where: { reform_proposal_id: { in: targetIds } },
      select: {
        reform_proposal_id: true,
        title: true,
        reform_proposal_photo: {
          select: {
            content: true
          }
        }
      }
    });

    // 3. reform_proposal_id를 key로 하는 Map 생성
    const reformMap = new Map(reforms.map((r) => [r.reform_proposal_id, r]));

    // 4. order와 reform 데이터 매핑
    return orders.map((order) => {
      const reform = reformMap.get(order.target_id!);
      return {
        ...order,
        title: reform?.title ?? null,
        photo: reform?.reform_proposal_photo?.[0]?.content ?? null
      };
    });
  }
}
