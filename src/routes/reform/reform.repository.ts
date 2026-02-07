import prisma from '../../config/prisma.config.js';
import { ReformFilter } from './dto/reform.req.dto.js';
import { Category } from '../../@types/item.js';
import {
  RawProposalDetail,
  RawProposalDetailImages,
  RawProposalLatest,
  RawRequestDetail,
  RawRequestDetailImages,
  RawRequestLatest,
  ReformProposalUpdate,
  ReformQuote,
  ReformRequestCreate,
  ReformRequestUpdate
} from './reform.model.js';
import { UUID } from '../../@types/common.js';

export class ReformRepository {
  private prisma;
  constructor() {
    this.prisma = prisma;
  }

  async selectRequestLatest(): Promise<RawRequestLatest[]> {
    return this.prisma.reform_request.findMany({
      select: {
        reform_request_id: true,
        title: true,
        min_budget: true,
        max_budget: true,
        reform_request_photo: {
          take: 1,
          select: {
            content: true
          },
          orderBy: {
            photo_order: { sort: 'asc' }
          }
        }
      },
      take: 3,
      orderBy: {
        updated_at: { sort: 'desc' }
      }
    });
  }

  async selectProposalLatest(): Promise<RawProposalLatest[]> {
    return this.prisma.reform_proposal.findMany({
      select: {
        reform_proposal_id: true,
        title: true,
        price: true,
        avg_star: true,
        review_count: true,
        reform_proposal_photo: {
          take: 1,
          select: {
            content: true
          },
          orderBy: {
            photo_order: { sort: 'asc' }
          }
        },
        owner: {
          select: { name: true }
        }
      },
      take: 3,
      orderBy: {
        updated_at: { sort: 'desc' }
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

  async getRequestByRecent(
    filter: ReformFilter,
    categoryId: string[]
  ): Promise<RawRequestLatest[]> {
    const { page, limit } = filter;

    return await this.prisma.reform_request.findMany({
      take: limit,
      skip: (page - 1) * limit,
      select: {
        reform_request_id: true,
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
      orderBy: { created_at: 'desc' }
    });
  }

  async getRequestByPopular(
    filter: ReformFilter,
    categoryId: string[]
  ): Promise<RawRequestLatest[]> {
    const { page, limit } = filter;

    return await this.prisma.reform_request.findMany({
      take: limit,
      skip: (page - 1) * limit,
      select: {
        reform_request_id: true,
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
      orderBy: {
        owner_wish: {
          _count: 'desc'
        }
      }
    });
  }

  async getProposalByRecent(
    filter: ReformFilter,
    categoryId: string[]
  ): Promise<RawProposalLatest[]> {
    const { page, limit } = filter;

    return await this.prisma.reform_proposal.findMany({
      take: limit,
      skip: (page - 1) * limit,
      select: {
        reform_proposal_id: true,
        title: true,
        price: true,
        avg_star: true,
        review_count: true,
        reform_proposal_photo: {
          take: 1,
          select: {
            content: true
          },
          orderBy: {
            photo_order: { sort: 'asc' }
          }
        },
        owner: {
          select: { name: true }
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
      orderBy: { created_at: 'desc' }
    });
  }

  async getProposalByPopular(
    filter: ReformFilter,
    categoryId: string[]
  ): Promise<RawProposalLatest[]> {
    const { page, limit } = filter;

    return await this.prisma.reform_proposal.findMany({
      take: limit,
      skip: (page - 1) * limit,
      select: {
        reform_proposal_id: true,
        title: true,
        price: true,
        avg_star: true,
        review_count: true,
        reform_proposal_photo: {
          take: 1,
          select: {
            content: true
          },
          orderBy: {
            photo_order: { sort: 'asc' }
          }
        },
        owner: {
          select: { name: true }
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
      orderBy: [{ review_count: 'desc' }, { avg_star: 'desc' }]
    });
  }

  async insertRequest(
    dto: ReformRequestCreate,
    categoryId: UUID
  ): Promise<string> {
    const { images, ...data } = dto.toCreateData();
    const result = await this.prisma.$transaction(async (tx) => {
      const ans = await tx.reform_request.create({
        data: {
          user_id: data.userId,
          title: data.title,
          content: data.contents,
          min_budget: data.minBudget,
          max_budget: data.maxBudget,
          due_date: data.dueDate,
          category_id: categoryId
        }
      });
      await tx.reform_request_photo.createMany({
        data: images.map((img, index) => ({
          reform_request_id: ans.reform_request_id,
          content: img,
          photo_order: index + 1
        }))
      });

      return ans.reform_request_id;
    });
    return result;
  }

  async checkRequestOwner(userId: UUID, requestId: UUID) {
    return (
      (await prisma.reform_request.findFirst({
        where: {
          reform_request_id: requestId,
          user_id: userId
        }
      })) !== null
    );
  }

  async selectDetailRequest(id: UUID): Promise<{
    images: RawRequestDetailImages[];
    body: RawRequestDetail | null;
  }> {
    const [images, body] = await Promise.all([
      this.prisma.reform_request_photo.findMany({
        where: { reform_request_id: id },
        select: { content: true, photo_order: true }
      }),
      this.prisma.reform_request.findFirst({
        where: { reform_request_id: id },
        select: {
          reform_request_id: true,
          title: true,
          max_budget: true,
          min_budget: true,
          content: true,
          due_date: true,
          user: {
            select: {
              name: true,
              profile_photo: true
            }
          }
        }
      })
    ]);
    return { images, body };
  }

  async checkProposalOwner(ownerId: UUID, proposalId: UUID) {
    return (
      (await prisma.reform_proposal.findFirst({
        where: {
          reform_proposal_id: proposalId,
          owner_id: ownerId
        }
      })) !== null
    );
  }

  async selectDetailProposal(id: UUID): Promise<{
    images: RawProposalDetailImages[];
    body: RawProposalDetail | null;
  }> {
    const [images, body] = await Promise.all([
      this.prisma.reform_proposal_photo.findMany({
        where: { reform_proposal_id: id },
        select: { content: true, photo_order: true }
      }),
      this.prisma.reform_proposal.findFirst({
        where: { reform_proposal_id: id },
        select: {
          reform_proposal_id: true,
          title: true,
          content: true,
          price: true,
          delivery: true,
          expected_working: true,
          owner_id: true,
          owner: {
            select: {
              name: true,
              profile_photo: true
            }
          }
        }
      })
    ]);
    return { images, body };
  }

  async updateRequest(
    dto: ReformRequestUpdate,
    categoryId?: UUID
  ): Promise<string> {
    const data = dto.toUpdateData();
    const result = await this.prisma.$transaction(async (tx) => {
      const updateData: {
        title?: string;
        content?: string;
        min_budget?: number;
        max_budget?: number;
        due_date?: Date;
        category_id?: string;
      } = {};

      if (data.title !== undefined) updateData.title = data.title;
      if (data.contents !== undefined) updateData.content = data.contents;
      if (data.minBudget !== undefined) updateData.min_budget = data.minBudget;
      if (data.maxBudget !== undefined) updateData.max_budget = data.maxBudget;
      if (data.dueDate !== undefined) updateData.due_date = data.dueDate;
      if (categoryId !== undefined) updateData.category_id = categoryId;

      await tx.reform_request.update({
        where: { reform_request_id: data.requestId },
        data: updateData
      });

      // 이미지가 있으면 기존 이미지 삭제 후 새 이미지 추가
      if (data.images !== undefined && data.images.length > 0) {
        await tx.reform_request_photo.deleteMany({
          where: { reform_request_id: data.requestId }
        });

        await tx.reform_request_photo.createMany({
          data: data.images.map((img, index) => ({
            reform_request_id: data.requestId,
            content: img,
            photo_order: index + 1
          }))
        });
      }

      return data.requestId;
    });
    return result;
  }

  async deleteRequestPhotos(requestId: string) {
    await this.prisma.reform_request_photo.deleteMany({
      where: {
        reform_request_id: requestId
      }
    });
  }

  async deleteRequest(requestId: string, userId: string) {
    await this.prisma.reform_request.deleteMany({
      where: {
        reform_request_id: requestId,
        user_id: userId
      }
    });
  }

  async updateProposal(
    dto: ReformProposalUpdate,
    categoryId?: UUID
  ): Promise<string> {
    const data = dto.toUpdateData();
    const result = await this.prisma.$transaction(async (tx) => {
      const updateData: {
        title?: string;
        content?: string;
        price?: number;
        delivery?: number;
        expected_working?: number;
        category_id?: string;
      } = {};

      if (data.title !== undefined) updateData.title = data.title;
      if (data.contents !== undefined) updateData.content = data.contents;
      if (data.price !== undefined) updateData.price = data.price;
      if (data.delivery !== undefined) updateData.delivery = data.delivery;
      if (data.expectedWorking !== undefined)
        updateData.expected_working = data.expectedWorking;
      if (categoryId !== undefined) updateData.category_id = categoryId;

      await tx.reform_proposal.update({
        where: { reform_proposal_id: data.proposalId },
        data: updateData
      });

      // 이미지가 있으면 기존 이미지 삭제 후 새 이미지 추가
      if (data.images !== undefined && data.images.length > 0) {
        await tx.reform_proposal_photo.deleteMany({
          where: { reform_proposal_id: data.proposalId }
        });

        await tx.reform_proposal_photo.createMany({
          data: data.images.map((img, index) => ({
            reform_proposal_id: data.proposalId,
            content: img,
            photo_order: index + 1
          }))
        });
      }

      return data.proposalId;
    });
    return result;
  }

  async selectReformRequestUser(
    id: string
  ): Promise<{ user_id: string } | null> {
    return await prisma.reform_request.findFirst({
      where: { reform_request_id: id },
      select: { user_id: true }
    });
  }
  async insertReformQuotePhoto(dto: ReformQuote, order_id: string) {
    const { images, ...data } = dto.toDto();
    return await prisma.quote_photo.createMany({
      data: images.map((img, index) => ({
        order_id: order_id,
        content: img,
        photo_order: index + 1
      }))
    });
  }

  async insertReformQuote(dto: ReformQuote) {
    const body = dto.toDto();
    return await prisma.order.create({
      data: {
        owner_id: body.ownerId,
        user_id: body.userId,
        content: body.contents,
        price: body.price,
        target_type: 'REQUEST',
        target_id: body.target_id,
        delivery_fee: body.delivery,
        status: 'PENDING'
      },
      select: {
        order_id: true
      }
    });
  }
  async checkIsWishUser(targetId: UUID, userId: UUID) {
    return (
      (await prisma.user_wish.findFirst({
        where: { target_id: targetId, user_id: userId }
      })) !== null
    );
  }
}
