/* tslint:disable */
/* eslint-disable */

import { ItemDto } from './profile.dto.js';
import prisma from '../../config/prisma.config.js';
import { PrismaClient } from '@prisma/client/extension';
import { CategoryNotExist } from './profile.error.js';

export class ProfileModel {
  private prisma: PrismaClient;
  constructor() {
    this.prisma = prisma;
  }

  async addItem(itemDto: ItemDto): Promise<void> {
    const { images, option, category, ownerId, ...data } = itemDto;
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
          data: { item_id: ans.item_id, content: img }
        });
      }
    });
  }
}
