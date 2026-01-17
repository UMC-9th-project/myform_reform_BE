import { prisma } from '../../config/prisma.config.js';
import {
  UserSelect,
  OwnerSelect,
  BannerSelect,
  ItemWithRelations,
  ReformProposalWithRelations,
  OwnerForBestReformers
} from './home.model.js';
import {
  AuthUser,
  UserSessionDto,
  BannerDto,
  TrendingItemDto,
  CustomOrderDto,
  BestReformerDto,
  HomeDataDto,
  HomeDataResponseDto
} from './home.dto.js';

export class HomeService {
  private createGuestSession(): UserSessionDto {
    return {
      is_logged_in: false,
      role: null,
      user_id: null,
      nickname: null,
      profile_image: null,
      cart_count: 0
    };
  }

  private async getUserInfo(userId: string): Promise<UserSelect | null> {
    return await prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        nickname: true
      }
    });
  }

  private async getOwnerInfo(userId: string): Promise<OwnerSelect | null> {
    return await prisma.owner.findUnique({
      where: { owner_id: userId },
      select: {
        owner_id: true,
        nickname: true,
        profile_photo: true
      }
    });
  }

  private async getCartCount(userId: string): Promise<number> {
    return await prisma.cart.count({
      where: { user_id: userId }
    });
  }

  private async createUserSessionDto(user: UserSelect): Promise<UserSessionDto> {
    const cartCount = await this.getCartCount(user.user_id);
    return {
      is_logged_in: true,
      role: 'USER',
      user_id: user.user_id,
      nickname: user.nickname,
      profile_image: null,
      cart_count: cartCount
    };
  }

  private createOwnerSessionDto(owner: OwnerSelect): UserSessionDto {
    return {
      is_logged_in: true,
      role: 'OWNER',
      user_id: owner.owner_id,
      nickname: owner.nickname,
      profile_image: owner.profile_photo || null,
      cart_count: 0
    };
  }

  async getUserSession(
    userId?: string,
    userRole?: 'USER' | 'OWNER'
  ): Promise<UserSessionDto> {
    if (!userId || !userRole) {
      return this.createGuestSession();
    }

    if (userRole === 'USER') {
      const user = await this.getUserInfo(userId);
      if (!user) {
        return this.createGuestSession();
      }
      return await this.createUserSessionDto(user);
    }

    if (userRole === 'OWNER') {
      const owner = await this.getOwnerInfo(userId);
      if (!owner) {
        return this.createGuestSession();
      }
      return this.createOwnerSessionDto(owner);
    }

    return this.createGuestSession();
  }

  private async fetchBannersFromDb(): Promise<BannerSelect[]> {
    return await prisma.banner.findMany({
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
  }

  private mapBannerToDto(banner: BannerSelect): BannerDto {
    return {
      id: banner.banner_id,
      image_url: banner.image_url
    };
  }

  async getBanners(): Promise<BannerDto[]> {
    try {
      const banners = await this.fetchBannersFromDb();
      return banners.map((banner) => this.mapBannerToDto(banner));
    } catch (error: any) {
      return [];
    }
  }

  private async getUserWishList(userId: string): Promise<Set<string>> {
    const wishList = await prisma.user_wish.findMany({
      where: {
        user_id: userId,
        target_type: 'ITEM'
      },
      select: {
        target_id: true
      }
    });

    return new Set(
      wishList
        .map((w) => w.target_id)
        .filter((id): id is string => !!id)
    );
  }

  private async fetchTrendingItemsFromDb(): Promise<ItemWithRelations[]> {
    return await prisma.item.findMany({
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
  }

  private calculateItemScore(star: number, reviewCount: number): number {
    return star * 0.7 + Math.min(reviewCount / 10, 5) * 0.3;
  }

  private mapItemToTrendingItemDto(
    item: ItemWithRelations,
    wishedItemIds: Set<string>
  ): TrendingItemDto {
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
  }

  private sortAndLimitTrendingItems(
    items: TrendingItemDto[],
    limit: number = 3
  ): TrendingItemDto[] {
    return items
      .sort((a, b) => {
        const scoreA = this.calculateItemScore(a.star, a.review_count);
        const scoreB = this.calculateItemScore(b.star, b.review_count);
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  async getTrendingItems(userId?: string): Promise<TrendingItemDto[]> {
    const [items, wishedItemIds] = await Promise.all([
      this.fetchTrendingItemsFromDb(),
      userId ? this.getUserWishList(userId) : Promise.resolve(new Set<string>())
    ]);

    const trendingItems = items.map((item) =>
      this.mapItemToTrendingItemDto(item, wishedItemIds)
    );

    return this.sortAndLimitTrendingItems(trendingItems);
  }

  private async fetchCustomOrdersFromDb(): Promise<ReformProposalWithRelations[]> {
    return await prisma.reform_proposal.findMany({
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
  }

  private mapProposalToCustomOrderDto(
    proposal: ReformProposalWithRelations
  ): CustomOrderDto {
    return {
      proposal_id: proposal.reform_proposal_id,
      thumbnail: proposal.reform_proposal_photo[0]?.content || '',
      title: proposal.title || '',
      min_price: proposal.price ? Number(proposal.price) : 0,
      owner_id: proposal.owner_id,
      owner_nickname: proposal.owner.nickname || ''
    };
  }

  async getCustomOrders(userId?: string): Promise<CustomOrderDto[]> {
    const proposals = await this.fetchCustomOrdersFromDb();
    return proposals.map((proposal) => this.mapProposalToCustomOrderDto(proposal));
  }

  private async fetchBestReformersFromDb(): Promise<OwnerForBestReformers[]> {
    return await prisma.owner.findMany({
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
  }

  private calculateReformerScore(avgStar: number, reviewCount: number): number {
    return avgStar * 0.7 + Math.min(reviewCount / 10, 5) * 0.3;
  }

  private mapOwnerToBestReformerDto(owner: OwnerForBestReformers): BestReformerDto {
    return {
      owner_id: owner.owner_id,
      nickname: owner.nickname || '',
      profile_image: owner.profile_photo || '',
      bio: owner.bio || ''
    };
  }

  private sortAndLimitBestReformers(
    owners: OwnerForBestReformers[],
    limit: number = 8
  ): BestReformerDto[] {
    return owners
      .map((owner) => ({
        owner,
        score: this.calculateReformerScore(
          owner.avg_star ? Number(owner.avg_star) : 0,
          owner.review_count || 0
        )
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ owner }) => this.mapOwnerToBestReformerDto(owner));
  }

  async getBestReformers(): Promise<BestReformerDto[]> {
    const owners = await this.fetchBestReformersFromDb();
    return this.sortAndLimitBestReformers(owners);
  }

  private createHomeDataDto(
    banners: BannerDto[],
    trendingItems: TrendingItemDto[],
    customOrders: CustomOrderDto[],
    bestReformers: BestReformerDto[]
  ): HomeDataDto {
    return {
      banners,
      trending_items: trendingItems,
      custom_orders: customOrders,
      best_reformers: bestReformers
    };
  }

  async getHomeData(authUser?: AuthUser): Promise<HomeDataResponseDto> {
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

    const homeData = this.createHomeDataDto(
      banners,
      trendingItems,
      customOrders,
      bestReformers
    );

    return {
      result: true,
      user_session: userSession,
      home_data: homeData
    };
  }
}
