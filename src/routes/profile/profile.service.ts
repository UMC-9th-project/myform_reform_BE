import { ProfileRepository } from './profile.repository.js';
import {
  CategoryNotExist,
  ItemAddError,
  OrderItemError,
  OwnerNotFound,
  ForbiddenAccessError,
  profileError
} from './profile.error.js';
import { OrderNotFoundError } from '../orders/orders.error.js';
import {
  AddFeedRequestDto,
  OrderRequestDto,
  RequestListRequestDto,
  SaleRequestDto
} from './dto/profile.req.dto.js';
import {
  Item,
  ItemDto,
  ItemUpdate,
  Order,
  Reform,
  ReformDto,
  Sale,
  SaleDetail,
  OrderDetail,
  RawOptionItemsWithGroup
} from './profile.model.js';
import type {
  AddFeedResponseDto,
  ProfileInfoResponse,
  FeedListResponse,
  MarketListResponse,
  ProposalListResponse,
  ReviewListResponse,
  OrderDetailResponseDto,
  RequestsListResponseDto
} from './dto/profile.res.dto.js';
import { MarketService } from '../market/market.service.js';
import { ReviewsRepository } from '../reviews/reviews.repository.js';
export class ProfileService {
  private profileRepository: ProfileRepository;
  private marketService: MarketService;
  private reviewsRepository: ReviewsRepository;

  constructor() {
    this.profileRepository = new ProfileRepository();
    this.reviewsRepository = new ReviewsRepository();
    this.marketService = new MarketService();
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

  async addFeed(
    ownerId: string,
    dto: AddFeedRequestDto
  ): Promise<AddFeedResponseDto> {
    const urls = Array.isArray(dto.imageUrls) ? dto.imageUrls : [];
    const trimmed = urls
      .map((u) => (typeof u === 'string' ? u.trim() : ''))
      .filter(Boolean);
    if (trimmed.length === 0) {
      throw new ItemAddError('이미지 URL을 1개 이상 입력해 주세요.');
    }
    try {
      const feed = await this.profileRepository.createFeed(
        ownerId,
        dto.isPinned === true
      );
      await this.profileRepository.createFeedPhotos(feed.feed_id, trimmed);
      return { feedId: feed.feed_id };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new ItemAddError(message);
    }
  }

  async getSales(dto: SaleRequestDto): Promise<Sale[]> {
    try {
      const orders = await this.profileRepository.getOrder(dto);

      const itemIds = new Set<string>();
      const requestIds = new Set<string>();
      const proposalIds = new Set<string>();
      const feedIds = new Set<string>();

      orders.forEach((o) => {
        if (!o.target_id) return;
        if (o.target_type === 'ITEM') itemIds.add(o.target_id);
        else if (o.target_type === 'REQUEST') requestIds.add(o.target_id);
        else if (o.target_type === 'PROPOSAL') proposalIds.add(o.target_id);
        else if (o.target_type === 'FEED') feedIds.add(o.target_id);
      });

      const [itemInfos, reqInfos, propInfos, feedInfos] = await Promise.all([
        this.profileRepository.getItemInfos(Array.from(itemIds)),
        this.profileRepository.getRequestInfos(Array.from(requestIds)),
        this.profileRepository.getProposalInfos(Array.from(proposalIds)),
        this.profileRepository.getFeedInfos(Array.from(feedIds))
      ]);

      const infoMap = new Map<string, { title: string; thumbnail: string }>();
      const addToMap = (list: any[], idKey: string) => {
        list.forEach((data) => {
          infoMap.set(data[idKey], {
            title: data.title,
            thumbnail: data.photo
          });
        });
      };

      addToMap(itemInfos, 'item_id');
      addToMap(reqInfos, 'reform_request_id');
      addToMap(propInfos, 'reform_proposal_id');
      addToMap(feedInfos, 'chatRequestId');

      // 4. 모든 주문 목록 preview 생성
      const ordersPreview = orders.map((order) => {
        const info = infoMap.get(order.target_id ?? '') ?? {
          title: '',
          thumbnail: ''
        };
        return Sale.create(order, info.title, info.thumbnail);
      });
      return ordersPreview;

      // const titleThumbnailMap =
      //   await this.profileRepository.getTitleAndThumbnailsForOrders(orders);

      // return orders.map((order) => {
      //   const info =
      //     order.target_id != null
      //       ? titleThumbnailMap.get(order.target_id)
      //       : undefined;
      //   const title = info?.title ?? '';
      //   const thumbnailOverride = info?.thumbnail;
      //   return Sale.create(order, title, { thumbnailOverride });
      // });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new OrderItemError(message);
    }
  }

  async updateTrackingNumber(
    ownerId: string,
    orderId: string,
    trackingNumber: string
  ) {
    try {
      const check = await this.profileRepository.isOrderOwner(ownerId, orderId);
      if (!check) {
        throw new OrderItemError('본인의 판매 내용이 아닙니다.');
      }

      await this.profileRepository.updateTrackingNumber(
        orderId,
        trackingNumber
      );
    } catch (err: any) {
      throw new OrderItemError(err);
    }
  }

  async getSaleDetail(ownerId: string, orderId: string): Promise<SaleDetail> {
    const check = await this.profileRepository.isOrderOwner(ownerId, orderId);
    if (!check) {
      throw new OrderItemError('본인의 판매 내용이 아닙니다.');
    }

    const order = await this.profileRepository.getOrderDetail(ownerId, orderId);
    const option = await this.profileRepository.getOption(orderId);

    const isChatOrder =
      order.target_id != null &&
      order.target_type != null &&
      ['FEED', 'REQUEST', 'PROPOSAL'].includes(order.target_type);
    const info = isChatOrder
      ? await this.profileRepository.getTitleAndThumbnailByTarget(
          order.target_type as 'FEED' | 'REQUEST' | 'PROPOSAL',
          order.target_id as string
        )
      : null;

    const title = info?.title ?? '';
    const thumbnailOverride = info?.thumbnail ?? undefined;
    return SaleDetail.create(order, option, title, { thumbnailOverride });
  }

  private async resolveOwner(idOrNickname: string) {
    const trimmed = idOrNickname.trim();
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        trimmed
      );
    const owner = isUuid
      ? await this.profileRepository.findOwnerById(trimmed)
      : await this.profileRepository.findOwnerByNickname(trimmed);
    if (!owner) throw new OwnerNotFound(idOrNickname);
    return owner;
  }

  async getProfileInfo(idOrNickname: string): Promise<ProfileInfoResponse> {
    const owner = await this.resolveOwner(idOrNickname);
    const ownerId = owner.owner_id;

    let avgStar = owner.avg_star ? Number(owner.avg_star) : null;
    let reviewCount = owner.review_count;

    if (avgStar === null || reviewCount === null) {
      const stats =
        await this.profileRepository.findReviewStatsByOwnerId(ownerId);
      avgStar = stats._avg.star !== null ? Number(stats._avg.star) : null;
      reviewCount = stats._count.review_id ?? 0;
    }

    const [totalSaleCount, avgStarRecent3mRaw] = await Promise.all([
      this.profileRepository.countSaleByOwnerId(ownerId),
      this.profileRepository.findAvgStarRecent3MonthsByOwnerId(ownerId)
    ]);
    const avgStarRecent3m = avgStarRecent3mRaw ?? 0;

    return {
      ownerId: owner.owner_id,
      profilePhoto: owner.profile_photo,
      nickname: owner.nickname,
      avgStar,
      avgStarRecent3m,
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
    const owner = await this.resolveOwner(id);
    const ownerId = owner.owner_id;

    const take = Math.min(limit, 50);
    const feeds = await this.profileRepository.findFeedsByOwnerId(
      ownerId,
      cursor,
      take
    );
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
      hasNext && actualFeeds.length > 0
        ? actualFeeds[actualFeeds.length - 1].feed_id
        : null;

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
    const owner = await this.resolveOwner(id);
    const ownerId = owner.owner_id;

    const take = Math.min(limit, 50);
    const items = await this.profileRepository.findItemsByOwnerId(
      ownerId,
      cursor,
      take
    );
    const hasNext = items.length > take;
    const actualItems = hasNext ? items.slice(0, take) : items;

    let wishedItemIds: string[] = [];
    if (userId && actualItems.length > 0) {
      const itemIds = actualItems.map((i: { item_id: string }) => i.item_id);
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
      hasNext && actualItems.length > 0
        ? actualItems[actualItems.length - 1].item_id
        : null;

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
    const owner = await this.resolveOwner(id);
    const ownerId = owner.owner_id;

    const take = Math.min(limit, 50);
    const proposals = await this.profileRepository.findProposalsByOwnerId(
      ownerId,
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

    const proposalList = await Promise.all(
      actualProposals.map(
        async (proposal: {
          reform_proposal_id: string;
          reform_proposal_photo: Array<{ content: string | null }>;
          title: string | null;
          content: string;
          price: unknown;
          avg_star: unknown;
          review_count: number | null;
          category: { category_id: string; parent_id: string };
        }) => {
          const avgStar = await this.reviewsRepository.findAverageStarForTarget(
            'PROPOSAL',
            proposal.reform_proposal_id
          );

          const review = {
            avgStar: avgStar._avg?.star ? Number(avgStar._avg.star) : 0,
            totalCount: await this.reviewsRepository.countReviewsForTarget(
              'PROPOSAL',
              proposal.reform_proposal_id
            )
          };

          return {
            proposalId: proposal.reform_proposal_id,
            photo: proposal.reform_proposal_photo[0]?.content ?? null,
            isWished: wishedProposalIds.includes(proposal.reform_proposal_id),
            title: proposal.title,
            content: proposal.content,
            category: await this.marketService.getCategoryName(
              proposal.category
            ),
            price: proposal.price !== null ? Number(proposal.price) : null,
            avgStar: review.avgStar,
            reviewCount: review.totalCount,
            sellerName: owner.nickname
          };
        }
      )
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
    limit: number,
    targetType?: 'ITEM' | 'PROPOSAL' | 'FEED' | 'REQUEST'
  ): Promise<ReviewListResponse> {
    const owner = await this.resolveOwner(id);
    const ownerId = owner.owner_id;

    const take = Math.min(limit, 50);
    const reviews = await this.profileRepository.findReviewsByOwnerId(
      ownerId,
      cursor,
      take,
      targetType
    );
    const hasNext = reviews.length > take;
    const actualReviews = hasNext ? reviews.slice(0, take) : reviews;

    type UserInfo = {
      user_id: string;
      name: string | null;
      nickname: string | null;
      profile_photo: string | null;
    };
    const userIds = actualReviews
      .map((r: { user_id: string | null }) => r.user_id)
      .filter((uid: string | null): uid is string => uid != null);
    const users = await this.profileRepository.findUsersByIds(userIds);
    const userMap = new Map<string, UserInfo>(
      users.map((u: UserInfo) => [u.user_id, u])
    );

    const itemIds: string[] = actualReviews
      .filter(
        (r: {
          order: {
            target_type: string | null;
            target_id: string | null;
          } | null;
        }) => r.order?.target_type === 'ITEM' && r.order?.target_id
      )
      .map(
        (r: { order: { target_id: string | null } | null }) =>
          r.order!.target_id!
      );
    const proposalIds: string[] = actualReviews
      .filter(
        (r: {
          order: {
            target_type: string | null;
            target_id: string | null;
          } | null;
        }) => r.order?.target_type === 'PROPOSAL' && r.order?.target_id
      )
      .map(
        (r: { order: { target_id: string | null } | null }) =>
          r.order!.target_id!
      );
    const requestIds: string[] = actualReviews
      .filter(
        (r: {
          order: {
            target_type: string | null;
            target_id: string | null;
          } | null;
        }) => r.order?.target_type === 'REQUEST' && r.order?.target_id
      )
      .map(
        (r: { order: { target_id: string | null } | null }) =>
          r.order!.target_id!
      );
    const feedIds: string[] = actualReviews
      .filter(
        (r: {
          order: {
            target_type: string | null;
            target_id: string | null;
          } | null;
        }) => r.order?.target_type === 'FEED' && r.order?.target_id
      )
      .map(
        (r: { order: { target_id: string | null } | null }) =>
          r.order!.target_id!
      );

    const [itemInfos, proposalInfos, requestInfos, feedInfos] =
      await Promise.all([
        this.profileRepository.getItemInfos([...new Set(itemIds)]),
        this.profileRepository.getProposalInfos([...new Set(proposalIds)]),
        this.profileRepository.getRequestInfos([...new Set(requestIds)]),
        this.profileRepository.getFeedInfos([...new Set(feedIds)])
      ]);
    type ProductInfo = {
      title: string | null;
      price: number | null;
      photo: string | null;
    };
    const itemMap = new Map<string, ProductInfo>(
      itemInfos.map((i: { item_id: string } & ProductInfo) => [
        i.item_id,
        { title: i.title, price: i.price, photo: i.photo }
      ])
    );
    const proposalMap = new Map<string, ProductInfo>(
      proposalInfos.map((p: { reform_proposal_id: string } & ProductInfo) => [
        p.reform_proposal_id,
        { title: p.title, price: p.price, photo: p.photo }
      ])
    );
    const requestMap = new Map<string, ProductInfo>(
      requestInfos.map(
        (r: {
          reform_request_id: string;
          title: string | null;
          minBudget: number | null;
          maxBudget: number | null;
          photo: string | null;
        }) => [
          r.reform_request_id,
          {
            title: r.title,
            price: r.minBudget ?? r.maxBudget ?? null,
            photo: r.photo
          }
        ]
      )
    );
    const feedMap = new Map<string, ProductInfo>(
      feedInfos.map(
        (f: {
          chatRequestId: string;
          title: string | null;
          photo: string | undefined;
        }) => [
          f.chatRequestId,
          { title: f.title, price: null, photo: f.photo ?? null }
        ]
      )
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
        let productType: 'ITEM' | 'PROPOSAL' | 'REQUEST' | 'FEED' | null = null;
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
                : order.target_type === 'REQUEST'
                  ? 'REQUEST'
                  : order.target_type === 'FEED'
                    ? 'FEED'
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
          } else if (productType === 'REQUEST' && productId) {
            const req = requestMap.get(productId);
            productTitle = req?.title ?? null;
            productPhoto = req?.photo ?? null;
            productPrice = req?.price ?? null;
          } else if (productType === 'FEED' && productId) {
            const feed = feedMap.get(productId);
            productTitle = feed?.title ?? null;
            productPhoto = feed?.photo ?? null;
            productPrice = feed?.price ?? null;
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

  // 주문 목록 조회
  async getOrders(
    dto: OrderRequestDto
  ): Promise<{ orders: Order[]; nextCursor: string | null; hasNext: boolean }> {
    // 1. 초기 조건에 맞는 주문 목록 조회
    const orders = await this.profileRepository.getOrdersByUserId(dto);

    // 1.1 다음 페이지 여부 확인
    const hasNext = orders.length > dto.limit;
    const actualOrders = hasNext ? orders.slice(0, dto.limit) : orders;

    // 2. ID 수집 (Set을 사용해 중복 제거)
    const itemIds = new Set<string>();
    const requestIds = new Set<string>();
    const proposalIds = new Set<string>();
    const feedIds = new Set<string>();

    actualOrders.forEach((o) => {
      if (!o.target_id) return;
      if (o.target_type === 'ITEM') itemIds.add(o.target_id);
      else if (o.target_type === 'REQUEST') requestIds.add(o.target_id);
      else if (o.target_type === 'PROPOSAL') proposalIds.add(o.target_id);
      else if (o.target_type === 'FEED') feedIds.add(o.target_id);
    });

    // 3. title 과 thumbnail(photo) 조회
    const [itemInfos, reqInfos, propInfos, feedInfos] = await Promise.all([
      this.profileRepository.getItemInfos(Array.from(itemIds)),
      this.profileRepository.getRequestInfos(Array.from(requestIds)),
      this.profileRepository.getProposalInfos(Array.from(proposalIds)),
      this.profileRepository.getFeedInfos(Array.from(feedIds))
    ]);

    const infoMap = new Map<string, { title: string; thumbnail: string }>();
    const addToMap = (list: any[], idKey: string) => {
      list.forEach((data) => {
        infoMap.set(data[idKey], { title: data.title, thumbnail: data.photo });
      });
    };

    addToMap(itemInfos, 'item_id');
    addToMap(reqInfos, 'reform_request_id');
    addToMap(propInfos, 'reform_proposal_id');
    addToMap(feedInfos, 'chatRequestId');

    // 4. 모든 주문 목록 preview 생성
    const ordersPreview = actualOrders.map((order) => {
      const info = infoMap.get(order.target_id ?? '') ?? {
        title: '',
        thumbnail: ''
      };
      return Order.create(order, info.title, info.thumbnail);
    });

    const nextCursor = hasNext
      ? actualOrders[actualOrders.length - 1].order_id
      : null;

    return {
      orders: ordersPreview,
      nextCursor,
      hasNext
    };
  }

  async getOrderDetail(
    userId: string,
    orderId: string
  ): Promise<OrderDetailResponseDto> {
    //1. 주문 조회
    const order = await this.profileRepository.getOrderDetailByOrderId(orderId);
    if (!order) {
      throw new OrderNotFoundError(orderId);
    }
    if (order.user_id !== userId) {
      throw new ForbiddenAccessError(orderId);
    }

    // 2. 옵션 조회
    const optionItemIds =
      await this.profileRepository.getOptionIdsByOrderId(orderId);
    let optionItemsWithGroup: RawOptionItemsWithGroup[] = [];
    if (optionItemIds.length > 0) {
      optionItemsWithGroup =
        await this.profileRepository.getOptionItemsWithGroup(optionItemIds);
    }

    const [info] = await Promise.all([
      this.getTargetInfo(order.target_type, order.target_id)
    ]);

    // 3. 결과값 리턴
    const orderDetail = OrderDetail.create(
      order,
      info?.title,
      info?.thumbnail,
      optionItemsWithGroup
    );
    return orderDetail.toResponse();
  }

  private async getTargetInfo(type: string | null, id: string | null) {
    if (!type || !id) return undefined;

    switch (type) {
      case 'ITEM':
        const items = await this.profileRepository.getItemInfos([id]);
        return items[0]
          ? { title: items[0].title ?? '', thumbnail: items[0].photo ?? '' }
          : undefined;
      case 'PROPOSAL':
        const proposals = await this.profileRepository.getProposalInfos([id]);
        return proposals[0]
          ? {
              title: proposals[0].title ?? '',
              thumbnail: proposals[0].photo ?? ''
            }
          : undefined;
      case 'REQUEST':
        const requests = await this.profileRepository.getRequestInfos([id]);
        return requests[0]
          ? {
              title: requests[0].title ?? '',

              thumbnail: requests[0].photo ?? ''
            }
          : undefined;
      case 'FEED':
        const feeds = await this.profileRepository.getFeedInfos([id]);
        return feeds[0]
          ? {
              title: feeds[0].title ?? '',
              thumbnail: feeds[0].photo ?? ''
            }
          : undefined;
      default:
        return undefined;
    }
  }

  async getRequests(
    dto: RequestListRequestDto
  ): Promise<RequestsListResponseDto> {
    const requests = await this.profileRepository.getRequestsByUserId(dto);
    const hasNext = requests.length > dto.limit;
    const actualRequests = hasNext ? requests.slice(0, dto.limit) : requests;
    const nextCursor = hasNext
      ? actualRequests[actualRequests.length - 1].reformRequestId
      : null;
    return {
      requestData: actualRequests,
      nextCursor,
      hasNext
    };
  }

  async updateItem(dto: ItemUpdate): Promise<string> {
    try {
      const data = dto.toUpdateData();

      // 소유자 확인
      const isOwner = await this.profileRepository.checkItemOwner(
        data.ownerId,
        data.itemId
      );
      if (!isOwner)
        throw new ItemAddError('본인의 판매 상품만 수정할 수 있습니다.');

      // 유효성 검사
      if (data.title !== undefined && data.title.length > 40)
        throw new ItemAddError('제목은 40자를 넘길 수 없습니다');

      if (data.content !== undefined && data.content.length > 1000)
        throw new ItemAddError('내용은 1000자를 넘길 수 없습니다');

      if (data.images !== undefined && data.images.length > 10)
        throw new ItemAddError('이미지는 최대 10장 까지 첨부 가능합니다');

      if (
        data.price !== undefined &&
        (data.price < 0 || data.price > 999999999)
      )
        throw new ItemAddError('가격은 0원~999999999원 까지입니다.');

      if (
        data.delivery !== undefined &&
        (data.delivery < 0 || data.delivery > 999999999)
      )
        throw new ItemAddError('배송비는 0원~999999999원 까지입니다.');

      // 카테고리 ID 조회
      let categoryId: string | undefined;
      if (data.category !== undefined) {
        const category = await this.profileRepository.getCategory({
          category: data.category
        } as ItemDto);
        if (!category)
          throw new CategoryNotExist('존재하지 않는 카테고리입니다');
        categoryId = category.category_id;
      }

      // 아이템 기본 정보 수정
      const updateData: {
        title?: string;
        content?: string;
        price?: number;
        delivery?: number;
        category_id?: string;
      } = {};

      if (data.title !== undefined) updateData.title = data.title;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.price !== undefined) updateData.price = data.price;
      if (data.delivery !== undefined) updateData.delivery = data.delivery;
      if (categoryId !== undefined) updateData.category_id = categoryId;

      await this.profileRepository.updateItem(data.itemId, updateData);

      // 이미지 수정
      if (data.images !== undefined && data.images.length > 0) {
        await this.profileRepository.deleteItemPhotos(data.itemId);
        await this.profileRepository.createItemPhotos(data.itemId, data.images);
      }

      // 옵션 수정
      if (data.option !== undefined) {
        await this.profileRepository.deleteOptionsByItemId(data.itemId);
        if (data.option.length > 0) {
          await this.profileRepository.addOption(data.itemId, data.option);
        }
      }

      return data.itemId;
    } catch (err: unknown) {
      if (err instanceof CategoryNotExist) throw err;
      if (err instanceof ItemAddError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new ItemAddError(message);
    }
  }
}
