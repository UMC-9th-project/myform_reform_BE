import prisma from '../../config/prisma.config.js';
import { review } from '@prisma/client';
import { PrismaClient } from '@prisma/client/extension';
import {
  RawItemInfo,
  RawProposalInfo,
  RawRequestInfo,
  RawReviewData,
  RawUserInfo,
  UnifiedProductInfo,
  RawProposalReviewData,
  ProposalReviewStats,
  ProposalReviewSortBy
} from './reviews.model.js';

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

  async findReviewById(reviewId: string): Promise<review | null> {
    return await this.prisma.review.findUnique({
      where: {
        review_id: reviewId
      }
    });
  }

  // 리폼러 ID로 연결된 order ID 목록 조회 (리폼러의 모든 제안서에 대한 주문)
  async getOrderIdsByReformerId(reformerId: string): Promise<string[]> {
    // 1. 리폼러의 모든 제안서 ID 조회
    const proposals = await this.prisma.reform_proposal.findMany({
      where: {
        owner_id: reformerId
      },
      select: {
        reform_proposal_id: true
      }
    });
    const proposalIds = proposals.map((p: { reform_proposal_id: string }) => p.reform_proposal_id);

    if (proposalIds.length === 0) return [];

    // 2. 해당 제안서들에 연결된 order ID 조회
    const orders = await this.prisma.order.findMany({
      where: {
        target_type: 'PROPOSAL',
        target_id: { in: proposalIds }
      },
      select: {
        order_id: true
      }
    });
    return orders.map((o: { order_id: string }) => o.order_id);
  }

  // 리폼러 리뷰 통계 조회 (총 리뷰 수, 평균 별점, 사진 후기 수, 리뷰 사진 목록)
  async getReformerReviewStats(orderIds: string[]): Promise<ProposalReviewStats> {
    if (orderIds.length === 0) {
      return { totalCount: 0, avgStar: 0, photoReviewCount: 0, reviewPhotos: [] };
    }

    const [stats, photoReviews, reviewPhotos] = await Promise.all([
      // 총 리뷰 수 및 평균 별점
      this.prisma.review.aggregate({
        where: { order_id: { in: orderIds } },
        _count: { review_id: true },
        _avg: { star: true }
      }),
      // 사진이 있는 리뷰 수
      this.prisma.review.count({
        where: {
          order_id: { in: orderIds },
          review_photo: { some: {} }
        }
      }),
      // 전체 리뷰 사진 목록 (최대 10개)
      this.prisma.review_photo.findMany({
        where: {
          review: { order_id: { in: orderIds } }
        },
        select: { content: true },
        take: 10,
        orderBy: { created_at: 'desc' }
      })
    ]);

    return {
      totalCount: stats._count.review_id,
      avgStar: stats._avg.star ?? 0,
      photoReviewCount: photoReviews,
      reviewPhotos: reviewPhotos
        .map((p: { content: string | null }) => p.content ?? '')
        .filter((p: string) => p !== '')
    };
  }

  // 리폼러 리뷰 목록 조회 (페이지네이션, 정렬)
  async getReviewsByOrderIds(
    orderIds: string[],
    limit: number,
    cursor: string | undefined,
    sortBy: ProposalReviewSortBy
  ): Promise<RawProposalReviewData[]> {
    if (orderIds.length === 0) return [];

    const orderByClause = this.getReviewSortOrder(sortBy);

    return await this.prisma.review.findMany({
      where: { order_id: { in: orderIds } },
      take: limit + 1,
      ...(cursor && {
        cursor: { review_id: cursor },
        skip: 1
      }),
      orderBy: orderByClause,
      select: {
        review_id: true,
        user_id: true,
        star: true,
        content: true,
        created_at: true,
        review_photo: {
          select: {
            content: true,
            photo_order: true
          },
          orderBy: { photo_order: 'asc' }
        }
      }
    });
  }

  private getReviewSortOrder(sortBy: ProposalReviewSortBy) {
    switch (sortBy) {
      case 'high_rating':
        return [{ star: 'desc' as const }, { created_at: 'desc' as const }];
      case 'low_rating':
        return [{ star: 'asc' as const }, { created_at: 'desc' as const }];
      case 'recent':
      default:
        return { created_at: 'desc' as const };
    }
  }
}