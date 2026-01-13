import { prisma } from '../../config/prisma.config.js';
import {
  UserSession,
  Banner,
  TrendingItem,
  CustomOrder,
  BestReformer,
  HomeResponse
} from './home.model.js';
import { AuthUser } from './home.dto.js';

export class HomeService {
  /**
   * 사용자 세션 정보 조회
   * @param userId - 사용자 ID (선택적, JWT에서 추출 예정)
   * @param userRole - 사용자 역할 ('USER' 또는 'OWNER')
   */
  async getUserSession(
    userId?: string,
    userRole?: 'USER' | 'OWNER'
  ): Promise<UserSession> {
    if (!userId || !userRole) {
      return {
        is_logged_in: false,
        role: null,
        user_id: null,
        nickname: null,
        profile_image: null,
        cart_count: 0
      };
    }

    if (userRole === 'USER') {
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: {
          user_id: true,
          nickname: true
        }
      });

      if (!user) {
        return {
          is_logged_in: false,
          role: null,
          user_id: null,
          nickname: null,
          profile_image: null,
          cart_count: 0
        };
      }

      const cartCount = await prisma.cart.count({
        where: { user_id: userId }
      });

      return {
        is_logged_in: true,
        role: 'USER',
        user_id: user.user_id,
        nickname: user.nickname,
        profile_image: null,
        cart_count: cartCount
      };
    } else if (userRole === 'OWNER') {
      const owner = await prisma.owner.findUnique({
        where: { owner_id: userId },
        select: {
          owner_id: true,
          nickname: true,
          profile_photo: true
        }
      });

      if (!owner) {
        return {
          is_logged_in: false,
          role: null,
          user_id: null,
          nickname: null,
          profile_image: null,
          cart_count: 0
        };
      }

      return {
        is_logged_in: true,
        role: 'OWNER',
        user_id: owner.owner_id,
        nickname: owner.nickname,
        profile_image: owner.profile_photo || null,
        cart_count: 0
      };
    }

    return {
      is_logged_in: false,
      role: null,
      user_id: null,
      nickname: null,
      profile_image: null,
      cart_count: 0
    };
  }

  /**
   * 배너 데이터 조회
   */
  async getBanners(): Promise<Banner[]> {
    try {
      const banners = await prisma.banner.findMany({
        where: {
          is_active: true
        },
        orderBy: {
          sort_order: 'asc'
        },
        select: {
          banner_id: true,
          image_url: true
        }
      });

      return banners.map((banner: any) => ({
        id: banner.banner_id,
        image_url: banner.image_url
      }));
    } catch (error: any) {
      return [];
    }
  }

  /**
   * 인기 리폼 상품 조회 (리뷰 수와 평점 기준)
   * @param userId - 로그인한 사용자 ID (찜 여부 확인용)
   */
  async getTrendingItems(userId?: string): Promise<TrendingItem[]> {
    const items = await prisma.item.findMany({
      take: 50,
      where: {
        OR: [
          { review_count: { gt: 0 } },
          { avg_star: { not: null } }
        ]
      },
      include: {
        owner: {
          select: {
            owner_id: true,
            nickname: true
          }
        },
        item_photo: {
          take: 1,
          orderBy: {
            created_at: 'asc'
          },
          select: {
            content: true
          }
        }
      },
      orderBy: [
        { review_count: 'desc' },
        { avg_star: 'desc' }
      ]
    });
    const wishList =
      userId
        ? await prisma.user_wish.findMany({
            where: {
              user_id: userId,
              target_type: 'ITEM'
            },
            select: {
              target_id: true
            }
          })
        : [];
    const wishedItemIds = new Set(
      wishList
        .map((w: { target_id: string | null }) => w.target_id)
        .filter((id: string | null | undefined): id is string => !!id)
    );
    const trendingItems = items.map((item: any) => {
      const avgStar = item.avg_star ? Number(item.avg_star) : 0;
      const reviewCount = item.review_count || 0;
      const isWished = wishedItemIds.has(item.item_id);

      return {
        item_id: item.item_id,
        thumbnail: item.item_photo[0]?.content || '',
        title: item.title || '',
        price: item.price ? Number(item.price) : 0,
        star: Math.round(avgStar * 10) / 10,
        review_count: reviewCount,
        owner_id: item.owner_id,
        owner_nickname: item.owner.nickname || '',
        is_wished: isWished
      };
    });
    const sorted = trendingItems.sort((a, b) => {
      const scoreA = a.star * 0.7 + Math.min(a.review_count / 10, 5) * 0.3;
      const scoreB = b.star * 0.7 + Math.min(b.review_count / 10, 5) * 0.3;
      return scoreB - scoreA;
    });
    return sorted.slice(0, 3);
  }

  /**
   * 추천 리폼 상품 조회 (커스텀 오더 - reform_proposal)
   * @param userId - 로그인한 사용자 ID
   */
  async getCustomOrders(userId?: string): Promise<CustomOrder[]> {
    const proposals = await prisma.reform_proposal.findMany({
      take: 3,
      include: {
        owner: {
          select: {
            owner_id: true,
            nickname: true
          }
        },
        reform_proposal_photo: {
          take: 1,
          orderBy: {
            photo_order: 'asc'
          },
          select: {
            content: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    return proposals.map((proposal: any) => ({
      proposal_id: proposal.reform_proposal_id,
      thumbnail: proposal.reform_proposal_photo[0]?.content || '',
      title: proposal.title || '',
      min_price: proposal.price ? Number(proposal.price) : 0,
      owner_id: proposal.owner_id,
      owner_nickname: proposal.owner.nickname || ''
    }));
  }

  /**
   * 베스트 리폼러 조회 (평점 기준)
   */
  async getBestReformers(): Promise<BestReformer[]> {
    const owners = await prisma.owner.findMany({
      take: 50,
      where: {
        status: 'APPROVED',
        OR: [
          { review_count: { gt: 0 } },
          { avg_star: { not: null } }
        ]
      },
      select: {
        owner_id: true,
        nickname: true,
        profile_photo: true,
        bio: true,
        avg_star: true,
        review_count: true
      },
      orderBy: [
        { review_count: 'desc' },
        { avg_star: 'desc' }
      ]
    });
    const reformersWithScore = owners.map((owner: any) => {
      const avgStar = owner.avg_star ? Number(owner.avg_star) : 0;
      const reviewCount = owner.review_count || 0;

      return {
        owner_id: owner.owner_id,
        nickname: owner.nickname || '',
        profile_image: owner.profile_photo || '',
        bio: owner.bio || '',
        avgStar,
        reviewCount
      };
    });

    return reformersWithScore
      .sort((a, b) => {
        const scoreA = a.avgStar * 0.7 + Math.min(a.reviewCount / 10, 5) * 0.3;
        const scoreB = b.avgStar * 0.7 + Math.min(b.reviewCount / 10, 5) * 0.3;
        return scoreB - scoreA;
      })
      .slice(0, 8)
      .map(({ avgStar, reviewCount, ...rest }) => rest);
  }

  /**
   * 메인 페이지 전체 데이터 조회
   * 로그인/비로그인 상태에 따라 맞춤 정보 제공
   * @param authUser - 인증된 사용자 정보 (JWT에서 추출 예정)
   */
  async getHomeData(authUser?: AuthUser): Promise<HomeResponse> {
    const userSession = await this.getUserSession(
      authUser?.userId,
      authUser?.role
    );

    const effectiveUserId =
      userSession.is_logged_in && userSession.role === 'USER'
        ? userSession.user_id
        : undefined;
    const [banners, trendingItems, customOrders, bestReformers] =
      await Promise.all([
        this.getBanners(),
        this.getTrendingItems(effectiveUserId || undefined),
        this.getCustomOrders(effectiveUserId || undefined),
        this.getBestReformers()
      ]);

    return {
      result: true,
      user_session: userSession,
      home_data: {
        banners,
        trending_items: trendingItems,
        custom_orders: customOrders,
        best_reformers: bestReformers
      }
    };
  }
}
