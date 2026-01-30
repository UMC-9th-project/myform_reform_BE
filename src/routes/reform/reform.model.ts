import {
  reform_proposal,
  reform_proposal_photo,
  reform_request,
  reform_request_photo
} from '@prisma/client';
import prisma from '../../config/prisma.config.js';
import { OrderQuoteDto, ReformRequestDto } from './reform.dto.js';
import { ReformDBError } from './reform.error.js';
import { addSearchSyncJob } from '../../worker/search.queue.js';
import { RequestFilterDto } from './dto/reform.req.dto.js';
import { Category } from '../../@types/item.js';

export class ReformModel {
  private prisma;
  constructor() {
    this.prisma = prisma;
  }

  async selectRequestLatest() {
    return this.prisma.reform_request.findMany({
      select: {
        title: true,
        min_budget: true,
        max_budget: true,
        reform_request_photo: {
          select: {
            content: true
          }
        }
      },
      take: 3,
      orderBy: {
        updated_at: { sort: 'asc' }
      }
    });
  }

  async selectProposalLatest() {
    return this.prisma.reform_proposal.findMany({
      select: {
        title: true,
        price: true,
        avg_star: true,
        review_count: true,
        reform_proposal_photo: {
          take: 1,
          select: {
            content: true
          }
        },
        owner: {
          select: { name: true }
        }
      },
      take: 3,
      orderBy: {
        updated_at: { sort: 'asc' }
      }
    });
  }

  async getCategoryIds(category: Category): Promise<string[]> {
    // 소분류가 있으면 해당 소분류 ID만 반환
    if (category.sub) {
      const subCategory = await this.prisma.category.findFirst({
        where: {
          name: category.sub
        },
        select: { category_id: true }
      });
      return subCategory ? [subCategory.category_id] : [];
    }

    // 대분류만 있으면 대분류 + 모든 소분류 ID 반환
    const majorCategory = await this.prisma.category.findFirst({
      where: {
        name: category.major,
        parent_id: null
      },
      select: { category_id: true }
    });

    if (!majorCategory) return [];

    const subCategories = await this.prisma.category.findMany({
      where: {
        parent_id: majorCategory.category_id
      },
      select: { category_id: true }
    });

    return [
      majorCategory.category_id,
      ...subCategories.map((c) => c.category_id)
    ];
  }

  async getRequestByRecent(filter: RequestFilterDto, categoryId: string[]) {
    const { page, limit } = filter;

    return await this.prisma.reform_request.findMany({
      take: limit,
      skip: (page - 1) * limit,
      select: {
        min_budget: true,
        max_budget: true,
        title: true,
        reform_request_photo: {
          take: 1,
          select: {
            content: true
          }
        }
      },
      where:
        categoryId.length > 0
          ? {
              category_id: {
                in: categoryId
              }
            }
          : undefined,
      orderBy: { created_at: 'asc' }
    });
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
      // 큐 등록
      await addSearchSyncJob({
        type: 'REQUEST',
        id: ans.reform_request_id,
        action: 'UPSERT'
      });
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

    //FIXME: 에러로 던지지 말고 빈 배열로 던지도록 바꿔야 할듯
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
