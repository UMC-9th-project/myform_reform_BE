import prisma from '../../config/prisma.config.js';
import { review } from '@prisma/client';
import { PrismaClient } from '@prisma/client/extension';
import { RawItemInfo, RawProposalInfo, RawRequestInfo, RawReviewData, RawUserInfo, UnifiedProductInfo } from './reviews.model.js';

export class ReviewsRepository {
  private prisma: PrismaClient;
  constructor() {
    this.prisma = prisma;
  }

  async getReviewsWithAll(
    userId: string, 
    limit: number, 
    cursor: string | undefined, 
    order: 'asc' | 'desc' = 'desc')
    : Promise<RawReviewData[]>{
    const reviews = await this.prisma.review.findMany({
      where: {
        user_id: userId
      },
      take: limit + 1,
      orderBy: {
        created_at: order
      },
      ...(cursor && {
        cursor: { review_id: cursor },
        skip: 1
      }),
      select: {
        user_id: true,
        review_id: true,
        content: true,
        star: true,
        created_at: true,
        order: {
          select: {
            order_id: true,
            price: true,
            delivery_fee: true,
            target_type: true,
            target_id: true,
          }
        },
        review_photo: {
          select: {
            content: true,
          }
        }
      },
    });
    return reviews;
  }

  async getItemInfos(itemIds: string[] | undefined): Promise<UnifiedProductInfo[]>{
    const items = await this.prisma.item.findMany({
      where: {
        item_id: { in: itemIds }
      },
      select: {
        item_id: true,
        title: true,
        item_photo: {
          select: {
            content: true,
            photo_order: true,
          },
          take: 1,
          orderBy: {
            photo_order: 'asc'
          }
        },
      }
    });

    return items.map((item: RawItemInfo) => ({
      product_id: item.item_id,
      title: item.title,
      thumbnail: item.item_photo[0]?.content ?? ''
    }));
  }

  async getRequestInfos(requestIds: string[]): Promise<UnifiedProductInfo[]>{
    const requests = await this.prisma.reform_request.findMany({
      where: {
        reform_request_id: { in: requestIds }
      },
      select: {
        reform_request_id: true,
        title: true,
        reform_request_photo: {
          select: {
            content: true,
          },
          take: 1,
          orderBy: {
            photo_order: 'asc'
          }
        },
      }
    });
    return requests.map((request: RawRequestInfo) => ({
      product_id: request.reform_request_id,
      title: request.title,
      thumbnail: request.reform_request_photo[0]?.content ?? ''
    }));
  }
    
  async getProposalInfos(proposalIds: string[]): Promise<UnifiedProductInfo[]>{
    const proposals = await this.prisma.reform_proposal.findMany({
      where: {
        reform_proposal_id: { in: proposalIds }
      },
      select: {
        reform_proposal_id: true,
        title: true,
        reform_proposal_photo: {
          select: {
            content: true,
          },
          take: 1,
          orderBy: {
            photo_order: 'asc'
          }
        },
      }
    });
    return proposals.map((proposal: RawProposalInfo) => ({
      product_id: proposal.reform_proposal_id,
      title: proposal.title,
      thumbnail: proposal.reform_proposal_photo[0]?.content ?? ''
    }));
  }

  async getUserInfo(userId: string): Promise<RawUserInfo>{
    return await this.prisma.user.findUnique({
      where: {
        user_id: userId
      },
      select: {
        user_id: true,
        name: true,
        nickname: true,
        profile_photo: true,
      }
    });
  }

  async getUserInfos(userIds: string[]): Promise<RawUserInfo[]>{
    if (!userIds) {
      return [];
    }
    return await this.prisma.user.findMany({
      where: {
        user_id: { in: userIds }
      },
      select: {
        user_id: true,
        name: true,
        nickname: true,
        profile_photo: true,
      }
    });
  }

  async deleteReview(reviewId: string): Promise<void>{
    await this.prisma.review.delete({
      where: {
        review_id: reviewId
      }
    });
  }

  async deleteReviewPhotos(reviewId: string): Promise<void>{
    await this.prisma.review_photo.deleteMany({
      where: {
        review_id: reviewId
      }
    });
  }

  async findReviewById(reviewId: string): Promise< review | null>{
    return await this.prisma.review.findUnique({
      where: {
        review_id: reviewId
      }
    });
  }
}