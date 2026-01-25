import {
  reform_proposal,
  reform_proposal_photo,
  reform_request,
  reform_request_photo
} from '@prisma/client';
import prisma from '../../config/prisma.config.js';
import { OrderQuoteDto, ReformRequestDto } from './reform.dto.js';
import { ReformDBError } from './reform.error.js';

export class ReformModel {
  private prisma;
  constructor() {
    this.prisma = prisma;
  }
  async addRequest(dto: ReformRequestDto): Promise<void> {
    const { userId, images, category, ...data } = dto;
    await this.prisma.$transaction(async (tx) => {
      const categorydata = await tx.category.findFirst({
        where: { name: category.sub },
        select: { category_id: true }
      });
      const ans = await tx.reform_request.create({
        data: {
          user_id: userId,
          title: data.title,
          content: data.contents,
          min_budget: data.minBudget,
          max_budget: data.maxBudget,
          due_date: data.dueDate,
          category_id: categorydata!.category_id
        }
      });
      for (const img of images) {
        await tx.reform_request_photo.create({
          data: {
            reform_request_id: ans.reform_request_id,
            content: img.content,
            photo_order: img.photo_order
          }
        });
      }
    });
  }

  async findDetailRequest(
    id: string
  ): Promise<{ images: reform_request_photo[]; body: reform_request }> {
    const [images, body] = await Promise.all([
      this.prisma.reform_request_photo.findMany({
        where: { reform_request_id: id }
      }),
      this.prisma.reform_request.findUnique({
        where: { reform_request_id: id }
      })
    ]);

    if (!body) {
      throw new ReformDBError('해당 상품이 존재하지 않습니다');
    }

    return { images, body };
  }

  async findDetailProposal(
    id: string
  ): Promise<{ images: reform_proposal_photo[]; body: reform_proposal }> {
    const [images, body] = await Promise.all([
      this.prisma.reform_proposal_photo.findMany({
        where: { reform_proposal_id: id }
      }),
      this.prisma.reform_proposal.findUnique({
        where: { reform_proposal_id: id }
      })
    ]);

    if (!body) {
      throw new ReformDBError('해당 상품이 존재하지 않습니다');
    }

    return { images, body };
  }

  // async addQuoteOrder(dto: OrderQuoteDto) {
  //   await this.prisma.order.create({
  //     data: {
  //       status: dto.status,
  //       target_type: dto.type,
  //       target_id: dto.targetId,
  //       price: dto.price,
  //       delivery_fee: dto.delivery,
  //       amount: dto.amount,
  //       content: dto.content,
  //       owner_id: dto.ownerId,
  //       user_id: dto.userId
  //     }
  //   });
  // }
}
