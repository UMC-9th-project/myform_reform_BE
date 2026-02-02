import { ProfileRepository } from './profile.repository.js';
import {
  CategoryNotExist,
  ItemAddError,
  OrderItemError,
  OwnerNotFound
} from './profile.error.js';
import { SaleRequestDto } from './dto/profile.req.dto.js';
import {
  Item,
  ItemDto,
  Reform,
  ReformDto,
  Sale,
  SaleDetail
} from './profile.model.js';
import type {
  ProfileInfoResponse,
  FeedListResponse,
  MarketListResponse,
  ProposalListResponse,
  ReviewListResponse
} from './dto/profile.res.dto.js';
export class ProfileService {
  private profileRepository: ProfileRepository;

  constructor() {
    this.profileRepository = new ProfileRepository();
  }

  async addProduct(mode: 'ITEM' | 'REFORM', dto: Item | Reform) {
    try {
      const data = dto.toDto();

      const category = await this.profileRepository.getCategory(data);
      if (category === null) {
        throw new CategoryNotExist('카테고리가 없습니다');
      }
      const categoryId = category.category_id;

      switch (mode) {
        case 'ITEM': {
          const itemDto = data as ItemDto;
          const item = await this.profileRepository.addItem(
            itemDto,
            categoryId
          );
          if (itemDto.option && itemDto.option.length > 0) {
            await this.profileRepository.addOption(
              item.item_id,
              itemDto.option
            );
          }
          break;
        }
        case 'REFORM':
          await this.profileRepository.addReform(data as ReformDto, categoryId);
          break;
      }
    } catch (err: unknown) {
      if (err instanceof CategoryNotExist) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new ItemAddError(message);
    }
  }

  async getSales(dto: SaleRequestDto): Promise<Sale[]> {
    try {
      // 1. order 기본 정보 조회
      const orders = await this.profileRepository.getOrder(dto);

      // 2. target_type별로 ID 분리
      const requestIds = orders
        .filter((o) => o.target_type === 'REQUEST' && o.target_id !== null)
        .map((o) => o.target_id!);

      const proposalIds = orders
        .filter((o) => o.target_type === 'PROPOSAL' && o.target_id !== null)
        .map((o) => o.target_id!);

      // 3. batch로 title 조회 (병렬)
      const [requests, proposals] = await Promise.all([
        this.profileRepository.getRequestTitles(requestIds),
        this.profileRepository.getProposalTitles(proposalIds)
      ]);

      // 4. title Map 생성
      const titleMap = new Map<string, string | null>();
      for (const r of requests) {
        titleMap.set(r.reform_request_id, r.title);
      }
      for (const p of proposals) {
        titleMap.set(p.reform_proposal_id, p.title);
      }

      // 5. Sale 도메인 객체 생성
      return orders.map((order) => {
        const title = titleMap.get(order.target_id ?? '') ?? '';
        return Sale.create(order, title);
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new OrderItemError(message);
    }
  }

  async getSaleDetail(ownerId: string, orderId: string): Promise<SaleDetail> {
    const check = await this.profileRepository.isOrderOwner(ownerId, orderId);
    if (!check) {
      throw new OrderItemError('본인의 판매 내용이 아닙니다.');
    }

    const order = await this.profileRepository.getOrderDetail(ownerId, orderId);
    const option = await this.profileRepository.getOption(orderId);

    let title: string = '';
    switch (order.target_type) {
      case 'PROPOSAL':
        title =
          (await this.profileRepository.getProposalTitle(order.target_id!))
            ?.title ?? '';
        break;

      case 'REQUEST':
        title =
          (await this.profileRepository.getRequestTitle(order.target_id!))
            ?.title ?? '';
        break;
    }

    return SaleDetail.create(order, option, title);
  }

  async getProfileInfo(id: string): Promise<ProfileInfoResponse> {
    const owner = await this.profileRepository.findOwnerById(id);
    if (!owner) {
      throw new OwnerNotFound(id);
    }

    let avgStar = owner.avg_star ? Number(owner.avg_star) : null;
    let reviewCount = owner.review_count;

    if (avgStar === null || reviewCount === null) {
      const stats = await this.profileRepository.findReviewStatsByOwnerId(id);
      avgStar = stats._avg.star !== null ? Number(stats._avg.star) : null;
      reviewCount = stats._count.review_id ?? 0;
    }

    const totalSaleCount = await this.profileRepository.countSaleByOwnerId(id);

    return {
      profilePhoto: owner.profile_photo,
      nickname: owner.nickname,
      avgStar,
      reviewCount,
      totalSaleCount,
      keywords: owner.keywords ?? [],
      bio: owner.bio
    };
  }

  async getProfileFeed(
    id: string,
    cursor: string | undefined,
    limit: number
  ): Promise<FeedListResponse> {
    const owner = await this.profileRepository.findOwnerById(id);
    if (!owner) {
      throw new OwnerNotFound(id);
    }

    const take = Math.min(limit, 50);
    const feeds = await this.profileRepository.findFeedsByOwnerId(id, cursor, take);
    const hasNext = feeds.length > take;
    const actualFeeds = hasNext ? feeds.slice(0, take) : feeds;

    const feedItems = actualFeeds.map(
      (feed: {
        feed_id: string;
        feed_photo: Array<{ content: string | null }>;
        is_pinned: boolean | null;
      }) => ({
        feedId: feed.feed_id,
        images: feed.feed_photo
          .map((p: { content: string | null }) => p.content ?? '')
          .filter((url: string) => url !== ''),
        isPinned: feed.is_pinned ?? false
      })
    );

    const nextCursor =
      hasNext && actualFeeds.length > 0 ? actualFeeds[actualFeeds.length - 1].feed_id : null;

    return {
      feeds: feedItems,
      nextCursor,
      hasNext
    };
  }

  async getProfileItems(
    id: string,
    cursor: string | undefined,
    limit: number,
    userId: string | undefined
  ): Promise<MarketListResponse> {
    const owner = await this.profileRepository.findOwnerById(id);
    if (!owner) {
      throw new OwnerNotFound(id);
    }

    const take = Math.min(limit, 50);
    const items = await this.profileRepository.findItemsByOwnerId(id, cursor, take);
    const hasNext = items.length > take;
    const actualItems = hasNext ? items.slice(0, take) : items;

    let wishedItemIds: string[] = [];
    if (userId && actualItems.length > 0) {
      const itemIds = actualItems.map(
        (i: { item_id: string }) => i.item_id
      );
      wishedItemIds = await this.profileRepository.findUserWishTargetIds(
        userId,
        'ITEM',
        itemIds
      );
    }

    const itemList = actualItems.map(
      (item: {
        item_id: string;
        item_photo: Array<{ content: string | null }>;
        title: string | null;
        price: unknown;
        avg_star: unknown;
        review_count: number | null;
      }) => ({
      itemId: item.item_id,
      photo: item.item_photo[0]?.content ?? null,
      isWished: wishedItemIds.includes(item.item_id),
      title: item.title,
      price: item.price !== null ? Number(item.price) : null,
      avgStar: item.avg_star !== null ? Number(item.avg_star) : null,
      reviewCount: item.review_count,
      sellerName: owner.nickname
      })
    );

    const nextCursor =
      hasNext && actualItems.length > 0 ? actualItems[actualItems.length - 1].item_id : null;

    return {
      items: itemList,
      nextCursor,
      hasNext
    };
  }

  async getProfileProposals(
    id: string,
    cursor: string | undefined,
    limit: number,
    userId: string | undefined
  ): Promise<ProposalListResponse> {
    const owner = await this.profileRepository.findOwnerById(id);
    if (!owner) {
      throw new OwnerNotFound(id);
    }

    const take = Math.min(limit, 50);
    const proposals = await this.profileRepository.findProposalsByOwnerId(
      id,
      cursor,
      take
    );
    const hasNext = proposals.length > take;
    const actualProposals = hasNext ? proposals.slice(0, take) : proposals;

    let wishedProposalIds: string[] = [];
    if (userId && actualProposals.length > 0) {
      const proposalIds = actualProposals.map(
        (p: { reform_proposal_id: string }) => p.reform_proposal_id
      );
      wishedProposalIds = await this.profileRepository.findUserWishTargetIds(
        userId,
        'PROPOSAL',
        proposalIds
      );
    }

    const proposalList = actualProposals.map(
      (proposal: {
        reform_proposal_id: string;
        reform_proposal_photo: Array<{ content: string | null }>;
        title: string | null;
        price: unknown;
        avg_star: unknown;
        review_count: number | null;
      }) => ({
      proposalId: proposal.reform_proposal_id,
      photo: proposal.reform_proposal_photo[0]?.content ?? null,
      isWished: wishedProposalIds.includes(proposal.reform_proposal_id),
      title: proposal.title,
      price: proposal.price !== null ? Number(proposal.price) : null,
      avgStar: proposal.avg_star !== null ? Number(proposal.avg_star) : null,
      reviewCount: proposal.review_count,
      sellerName: owner.nickname
      })
    );

    const nextCursor =
      hasNext && actualProposals.length > 0
        ? actualProposals[actualProposals.length - 1].reform_proposal_id
        : null;

    return {
      proposals: proposalList,
      nextCursor,
      hasNext
    };
  }

  async getProfileReviews(
    id: string,
    cursor: string | undefined,
    limit: number
  ): Promise<ReviewListResponse> {
    const owner = await this.profileRepository.findOwnerById(id);
    if (!owner) {
      throw new OwnerNotFound(id);
    }

    const take = Math.min(limit, 50);
    const reviews = await this.profileRepository.findReviewsByOwnerId(id, cursor, take);
    const hasNext = reviews.length > take;
    const actualReviews = hasNext ? reviews.slice(0, take) : reviews;

    type UserInfo = { user_id: string; name: string | null; nickname: string | null; profile_photo: string | null };
    const userIds = actualReviews
      .map((r: { user_id: string | null }) => r.user_id)
      .filter((uid: string | null): uid is string => uid != null);
    const users = await this.profileRepository.findUsersByIds(userIds);
    const userMap = new Map<string, UserInfo>(users.map((u: UserInfo) => [u.user_id, u]));

    const itemIds: string[] = actualReviews
      .filter(
        (r: { order: { target_type: string | null; target_id: string | null } | null }) =>
          r.order?.target_type === 'ITEM' && r.order?.target_id
      )
      .map((r: { order: { target_id: string | null } | null }) => r.order!.target_id!);
    const proposalIds: string[] = actualReviews
      .filter(
        (r: { order: { target_type: string | null; target_id: string | null } | null }) =>
          r.order?.target_type === 'PROPOSAL' && r.order?.target_id
      )
      .map((r: { order: { target_id: string | null } | null }) => r.order!.target_id!);

    const [itemInfos, proposalInfos] = await Promise.all([
      this.profileRepository.getItemInfos([...new Set(itemIds)]),
      this.profileRepository.getProposalInfos([...new Set(proposalIds)])
    ]);
    type ProductInfo = { title: string | null; price: number | null; photo: string | null };
    const itemMap = new Map<string, ProductInfo>(
      itemInfos.map((i: { item_id: string } & ProductInfo) => [i.item_id, { title: i.title, price: i.price, photo: i.photo }])
    );
    const proposalMap = new Map<string, ProductInfo>(
      proposalInfos.map((p: { reform_proposal_id: string } & ProductInfo) => [
        p.reform_proposal_id,
        { title: p.title, price: p.price, photo: p.photo }
      ])
    );

    const reviewList = actualReviews.map(
      (review: {
        review_id: string;
        user_id: string | null;
        order: { target_type: string | null; target_id: string | null } | null;
        star: number | null;
        created_at: Date | null;
        content: string | null;
        review_photo: Array<{ content: string | null }>;
      }) => {
        const order = review.order;
        const user = review.user_id ? userMap.get(review.user_id) : null;
        let productId: string | null = null;
        let productType: 'ITEM' | 'PROPOSAL' | null = null;
        let productTitle: string | null = null;
        let productPhoto: string | null = null;
        let productPrice: number | null = null;

        if (order?.target_id && order?.target_type) {
          productId = order.target_id;
          productType =
            order.target_type === 'ITEM'
              ? 'ITEM'
              : order.target_type === 'PROPOSAL'
                ? 'PROPOSAL'
                : null;

          if (productType === 'ITEM' && productId) {
            const item = itemMap.get(productId);
            productTitle = item?.title ?? null;
            productPhoto = item?.photo ?? null;
            productPrice = item?.price ?? null;
          } else if (productType === 'PROPOSAL' && productId) {
            const proposal = proposalMap.get(productId);
            productTitle = proposal?.title ?? null;
            productPhoto = proposal?.photo ?? null;
            productPrice = proposal?.price ?? null;
          }
        }

        return {
          reviewId: review.review_id,
          userId: user?.user_id ?? review.user_id ?? null,
          userName: user?.name ?? null,
          userNickname: user?.nickname ?? null,
          userProfilePhoto: user?.profile_photo ?? null,
          star: review.star,
          createdAt: review.created_at,
          content: review.content,
          productId,
          productType,
          productTitle,
          productPhoto,
          productPrice,
          photos: review.review_photo
            .map((p: { content: string | null }) => p.content ?? '')
            .filter((url: string) => url !== '')
        };
      }
    );

    const nextCursor =
      hasNext && actualReviews.length > 0
        ? actualReviews[actualReviews.length - 1].review_id
        : null;

    return {
      reviews: reviewList,
      nextCursor,
      hasNext
    };
  }
}
