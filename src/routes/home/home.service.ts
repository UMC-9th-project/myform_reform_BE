import {
  UserSelect,
  OwnerSelect,
  BannerSelect
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
import {
  HomeError,
  BannerNotFoundError,
  UserSessionError,
  TrendingItemsError,
  CustomOrdersError,
  BestReformersError
} from './home.error.js';
import { HomeRepository } from './home.repository.js';

export class HomeService {
  constructor(private repository: HomeRepository = new HomeRepository()) {}
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
    try {
      return await this.repository.findUserById(userId);
    } catch (error) {
      if (error instanceof Error && (error.message.includes('Invalid') || error.message.includes('UUID') || error.message.includes('Inconsistent column data'))) {
        return null;
      }
      throw new UserSessionError(`사용자 정보 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  private async getOwnerInfo(userId: string): Promise<OwnerSelect | null> {
    try {
      return await this.repository.findOwnerById(userId);
    } catch (error) {
      if (error instanceof Error && (error.message.includes('Invalid') || error.message.includes('UUID') || error.message.includes('Inconsistent column data'))) {
        return null;
      }
      throw new UserSessionError(`오너 정보 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  private async getCartCount(userId: string): Promise<number> {
    try {
      return await this.repository.countCartByUserId(userId);
    } catch (error) {
      throw new UserSessionError(`장바구니 개수 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  private async createUserSessionDto(user: UserSelect): Promise<UserSessionDto> {
    try {
      const cartCount = await this.getCartCount(user.user_id);
      return {
        is_logged_in: true,
        role: 'USER',
        user_id: user.user_id,
        nickname: user.nickname,
        profile_image: null,
        cart_count: cartCount
      };
    } catch (error) {
      if (error instanceof UserSessionError) {
        throw error;
      }
      throw new UserSessionError(`사용자 세션 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
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
    try {
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
    } catch (error) {
      if (error instanceof UserSessionError) {
        throw error;
      }
      throw new UserSessionError(`사용자 세션 조회 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  private async fetchBannersFromDb(): Promise<BannerSelect[]> {
    try {
      return await this.repository.findActiveBanners();
    } catch (error) {
      throw new BannerNotFoundError(`배너 데이터 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
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
    } catch (error) {
      if (error instanceof BannerNotFoundError) {
        throw error;
      }
      throw new HomeError(`배너 조회 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  private async getUserWishList(userId: string): Promise<Set<string>> {
    try {
      return await this.repository.findUserWishListByUserId(userId);
    } catch (error) {
      throw new TrendingItemsError(`찜 목록 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  private async fetchTrendingItemsFromDb() {
    try {
      return await this.repository.findTrendingItems();
    } catch (error) {
      throw new TrendingItemsError(`인기 상품 데이터 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  private calculateItemScore(star: number, reviewCount: number): number {
    return star * 0.7 + Math.min(reviewCount / 10, 5) * 0.3;
  }

  private mapItemToTrendingItemDto(
    item: Awaited<ReturnType<typeof this.repository.findTrendingItems>>[0],
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
    try {
      const [items, wishedItemIds] = await Promise.all([
        this.fetchTrendingItemsFromDb(),
        userId ? this.getUserWishList(userId) : Promise.resolve(new Set<string>())
      ]);

      const trendingItems = items.map((item) =>
        this.mapItemToTrendingItemDto(item, wishedItemIds)
      );

      return this.sortAndLimitTrendingItems(trendingItems);
    } catch (error) {
      if (error instanceof TrendingItemsError) {
        throw error;
      }
      throw new TrendingItemsError(`인기 상품 조회 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  private async fetchCustomOrdersFromDb() {
    try {
      return await this.repository.findRecentProposals(3);
    } catch (error) {
      throw new CustomOrdersError(`커스텀 오더 데이터 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  private mapProposalToCustomOrderDto(
    proposal: Awaited<ReturnType<typeof this.repository.findRecentProposals>>[0]
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
    try {
      const proposals = await this.fetchCustomOrdersFromDb();
      return proposals.map((proposal) => this.mapProposalToCustomOrderDto(proposal));
    } catch (error) {
      if (error instanceof CustomOrdersError) {
        throw error;
      }
      throw new CustomOrdersError(`커스텀 오더 조회 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  private async fetchBestReformersFromDb() {
    try {
      return await this.repository.findBestReformers(50);
    } catch (error) {
      throw new BestReformersError(`베스트 리폼러 데이터 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  private calculateReformerScore(avgStar: number, reviewCount: number): number {
    return avgStar * 0.7 + Math.min(reviewCount / 10, 5) * 0.3;
  }

  private mapOwnerToBestReformerDto(
    owner: Awaited<ReturnType<typeof this.repository.findBestReformers>>[0]
  ): BestReformerDto {
    return {
      owner_id: owner.owner_id,
      nickname: owner.nickname || '',
      profile_image: owner.profile_photo || '',
      bio: owner.bio || ''
    };
  }

  private sortAndLimitBestReformers(
    owners: Awaited<ReturnType<typeof this.repository.findBestReformers>>,
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
    try {
      const owners = await this.fetchBestReformersFromDb();
      return this.sortAndLimitBestReformers(owners);
    } catch (error) {
      if (error instanceof BestReformersError) {
        throw error;
      }
      throw new BestReformersError(`베스트 리폼러 조회 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
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
    try {
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
    } catch (error) {
      if (
        error instanceof HomeError ||
        error instanceof UserSessionError ||
        error instanceof BannerNotFoundError ||
        error instanceof TrendingItemsError ||
        error instanceof CustomOrdersError ||
        error instanceof BestReformersError
      ) {
        throw error;
      }
      throw new HomeError(`메인 페이지 데이터 조회 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }
}
