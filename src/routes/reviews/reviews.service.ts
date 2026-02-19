import type { Prisma } from '@prisma/client';
import { ReviewsRepository } from './reviews.repository.js';
import {
  ReviewDto,
  ReviewResponseDto,
  UnifiedProductInfo,
  RawUserInfo,
  ProposalReviewListResponseDto,
  ProposalReviewDto,
  ProposalReviewSortBy,
  ItemReviewWithPhotos,
  GetItemReviewsResponseDto,
  GetItemReviewPhotosResponseDto,
  GetReviewDetailResponseDto,
  ReviewTargetType
} from './reviews.model.js';
import { NotReviewOwnerError, ReviewNotFoundError } from './reviews.error.js';
import { runInTransaction } from '../../config/prisma.config.js';
export class ReviewsService {
  private reviewsRepository: ReviewsRepository;
  constructor() {
    this.reviewsRepository = new ReviewsRepository();
  }

  async getReviews(
    userId: string, 
    limit: number,
    cursor: string | undefined,
    order: 'asc' | 'desc'): Promise<ReviewResponseDto> {
    //리뷰와 관련 테이블 조회
    const reviews = await this.reviewsRepository.getReviewsWithAll(userId, limit, cursor, order);
    const hasNext = reviews.length > limit;
    const actualReviews = hasNext ? reviews.slice(0, limit) : reviews;
    
    // 아이템, 요청, 제안 Id 저장
    const itemIds = [
        ...new Set(actualReviews
        .filter((r) => r.order.target_type === 'ITEM')
        .map((r) => r.order.target_id))];
    const requestIds = [
        ...new Set(actualReviews
        .filter((r) => r.order.target_type === 'REQUEST')
        .map((r) => r.order.target_id))];
    const proposalIds = [
        ...new Set(actualReviews
        .filter((r) => r.order.target_type === 'PROPOSAL')
        .map((r) => r.order.target_id))];
    const feedIds = [
      ...new Set(actualReviews
        .filter((r) => r.order.target_type === 'FEED')
        .map((r) => r.order.target_id))
    ].filter((id): id is string => id !== null);

    const userIds = [
      ...new Set(actualReviews.map((r) => r.user_id))
    ];
        
    // 아이템, 요청, 제안, FEED 정보 조회 (title, thumbnail)
    const [items, requests, proposals, feeds] = await Promise.all([
      this.reviewsRepository.getItemInfos(
        itemIds.filter((id): id is string => id !== null)
    ) as Promise<UnifiedProductInfo[]>,

      this.reviewsRepository.getRequestInfos(
        requestIds.filter((id): id is string => id !== null)
    ) as Promise<UnifiedProductInfo[]>,
    
      this.reviewsRepository.getProposalInfos(
        proposalIds.filter((id): id is string => id !== null)
    ) as Promise<UnifiedProductInfo[]>,
      this.reviewsRepository.getFeedInfos(feedIds)
    ]);

    // 유저 정보 조회 (name, nickname, profile_photo)
    const userInfos = await this.reviewsRepository.getUserInfos(
      userIds.filter((id): id is string => id !== null));

    // 아이템, 요청, 제안, FEED 정보 맵 생성
    const productMap = new Map<string, UnifiedProductInfo>();
    items.forEach(i => productMap.set(i.product_id, i));
    requests.forEach(r => productMap.set(r.product_id, r));
    proposals.forEach(p => productMap.set(p.product_id, p));
    feeds.forEach(f => productMap.set(f.product_id, f));

    // 유저 정보 맵 생성
    const userInfoMap = new Map<string, RawUserInfo>();
    userInfos.forEach((u) => userInfoMap.set(u.user_id, u));

  const nextCursor = actualReviews.length > 0 ? actualReviews[actualReviews.length - 1].review_id : null;
  
  // 리뷰 정보 조회
  const data: ReviewDto[] = actualReviews.map((review) => {
    const user = userInfoMap.get(review.user_id ?? '');
    const product = productMap.get(review.order.target_id ?? '');
    const price = review.order.price?.toNumber() ?? 0;
    const deliveryFee = review.order.delivery_fee?.toNumber() ?? 0;
    const finalPrice = (price + deliveryFee).toString();
    const targetType = review.order.target_type ?? 'ITEM';
    const targetId = review.order.target_id ?? '';

    return {
      reviewId: review.review_id,
      userId: user?.user_id ?? review.user_id ?? '',
      userName: user?.name ?? '탈퇴한 사용자',
      userNickname: user?.nickname?? '알 수 없음',
      userProfilePhoto: user?.profile_photo ?? '',
      star: review.star ?? 0,
      createdAt: review.created_at!,
      content: review.content ?? '',
      orderId: review.order.order_id,
      price: price,
      deliveryFee: deliveryFee,
      finalPrice: finalPrice,
      orderTitle: product?.title ?? '',
      orderThumbnail: product?.thumbnail ?? '',
      targetType: targetType,
      targetId: targetId,
      reviewPhotos: review.review_photo.map((photo) => photo.content ?? '') ?? []
    }
  });

  return {
    data: data,
      cursor: nextCursor ?? null,
      hasNext: hasNext
    };
  }

  async deleteReview(userId: string, reviewId: string): Promise<string> {
    const review = await this.reviewsRepository.findReviewById(reviewId);
    const ownerId = review?.owner_id!;
    if (!review) {
      throw new ReviewNotFoundError('리뷰를 찾을 수 없습니다.');
    }
    if (review.user_id !== userId) {
      throw new NotReviewOwnerError('리뷰를 삭제할 수 없습니다.');
    }
    return await runInTransaction(async () => {
      await this.reviewsRepository.deleteReviewPhotos(reviewId);
      await this.reviewsRepository.deleteReview(reviewId);
      const reformerReviewstat = await this.reviewsRepository.getReformerReviewStat(ownerId);
      const reviewCount = reformerReviewstat._count.review_id
      const avgStar = reformerReviewstat._avg.star
      await this.reviewsRepository.syncReformerReviewStat(ownerId, reviewCount, avgStar)
      return '리뷰 삭제가 완료되었습니다.';
    });
  }

  // 리폼러 ID로 리뷰 목록 조회
  async getReviewsByReformerId(
    reformerId: string,
    limit: number,
    cursor: string | undefined,
    sortBy: ProposalReviewSortBy = 'recent'
  ): Promise<ProposalReviewListResponseDto> {
    // 리폼러의 모든 제안서에 연결된 order ID 목록 조회
    const orderIds =
      await this.reviewsRepository.getOrderIdsByReformerId(reformerId);

    // 리뷰 통계 및 리뷰 목록 병렬 조회
    const [stats, reviews] = await Promise.all([
      this.reviewsRepository.getReformerReviewStats(orderIds),
      this.reviewsRepository.getReviewsByOrderIds(orderIds, limit, cursor, sortBy)
    ]);

    const hasNext = reviews.length > limit;
    const actualReviews = hasNext ? reviews.slice(0, limit) : reviews;

    // 유저 정보 조회
    const userIds = [...new Set(actualReviews.map((r) => r.user_id))];
    const userInfos = await this.reviewsRepository.getUserInfos(
      userIds.filter((id): id is string => id !== null)
    );
    const userInfoMap = new Map<string, RawUserInfo>();
    userInfos.forEach((u) => userInfoMap.set(u.user_id, u));

    // 리뷰 DTO 변환
    const reviewDtos: ProposalReviewDto[] = actualReviews.map((review) => {
      const user = userInfoMap.get(review.user_id ?? '');
      return {
        reviewId: review.review_id,
        userId: user?.user_id ?? review.user_id ?? '',
        userNickname: user?.nickname ?? '알 수 없음',
        userProfilePhoto: user?.profile_photo ?? '',
        star: review.star ?? 0,
        createdAt: review.created_at!,
        content: review.content ?? '',
        reviewPhotos: review.review_photo.map((p) => p.content ?? '')
      };
    });

    const nextCursor =
      actualReviews.length > 0
        ? actualReviews[actualReviews.length - 1].review_id
        : null;

    return {
      totalCount: stats.totalCount,
      avgStar: stats.avgStar,
      photoReviewCount: stats.photoReviewCount,
      reviewPhotos: stats.reviewPhotos,
      reviews: reviewDtos,
      cursor: nextCursor,
      hasNext
    };
  }

  private getItemReviewOrderBy(
    sort: 'latest' | 'star_high' | 'star_low'
  ):
    | Prisma.reviewOrderByWithRelationInput
    | Prisma.reviewOrderByWithRelationInput[] {
    switch (sort) {
      case 'star_high':
        return [{ star: 'desc' as const }, { created_at: 'desc' as const }];
      case 'star_low':
        return [{ star: 'asc' as const }, { created_at: 'desc' as const }];
      case 'latest':
      default:
        return { created_at: 'desc' as const };
    }
  }

  /** 4종 타입 공통: 대상(targetType + targetId)별 리뷰 목록 조회 */
  async getTargetReviews(
    targetType: ReviewTargetType,
    targetId: string,
    page: number,
    limit: number,
    sort: 'latest' | 'star_high' | 'star_low' = 'latest'
  ): Promise<GetItemReviewsResponseDto> {
    const skip = (page - 1) * limit;
    const orderBy = this.getItemReviewOrderBy(sort);

    const [reviews, totalCount, avgStarResult, thumbnail] =
      await Promise.all([
        this.reviewsRepository.findReviewsForTarget(
          targetType,
          targetId,
          orderBy,
          skip,
          limit
        ),
        this.reviewsRepository.countReviewsForTarget(targetType, targetId),
        this.reviewsRepository.findAverageStarForTarget(targetType, targetId),
        this.reviewsRepository.findTargetThumbnail(targetType, targetId)
      ]);

    const avgStar = avgStarResult._avg?.star
      ? Number(avgStarResult._avg.star)
      : 0;
    const userIds = [...new Set(
      reviews
        .map((r: ItemReviewWithPhotos) => r.user_id)
        .filter((id): id is string => id !== null)
    )];
    const userInfos = await this.reviewsRepository.getUserInfos(userIds);
    const userMap = new Map(userInfos.map((u: RawUserInfo) => [u.user_id, u]));

    const reviewList = reviews.map((review: ItemReviewWithPhotos) => {
      const photos = review.review_photo
        .sort((a, b) => (a.photo_order ?? 0) - (b.photo_order ?? 0))
        .map((p) => p.content ?? '');
      const user = review.user_id ? userMap.get(review.user_id) : null;
      return {
        review_id: review.review_id,
        user_profile_image: user?.profile_photo ?? null,
        user_nickname: user?.nickname ?? null,
        star: review.star ?? 0,
        created_at: review.created_at ?? new Date(),
        content: review.content,
        product_thumbnail: thumbnail ?? null,
        photos
      };
    });

    const totalPages = Math.ceil(totalCount / limit);
    return {
      reviews: reviewList,
      total_count: totalCount,
      avg_star: avgStar,
      page,
      limit,
      total_pages: totalPages,
      has_next_page: page < totalPages,
      has_prev_page: page > 1
    };
  }

  /** 4종 타입 공통: 대상별 사진 후기 조회 */
  async getTargetReviewPhotos(
    targetType: ReviewTargetType,
    targetId: string,
    offset: number,
    limit: number
  ): Promise<GetItemReviewPhotosResponseDto> {
    const [totalPhotoCount, photos] = await Promise.all([
      this.reviewsRepository.countTotalPhotosForTarget(targetType, targetId),
      this.reviewsRepository.findReviewPhotosForTarget(
        targetType,
        targetId,
        offset,
        limit
      )
    ]);

    const hasMore = photos.length > limit;
    const paginatedPhotos = hasMore ? photos.slice(0, limit) : photos;
    const photosWithIndices = paginatedPhotos.map((photo, idx) => ({
      photo_index: offset + idx,
      review_id: photo.review_id,
      photo_url: photo.photo_url,
      photo_order: photo.photo_order
    }));

    return {
      photos: photosWithIndices,
      has_more: hasMore,
      offset,
      limit,
      total_count: totalPhotoCount
    };
  }

  /** 4종 타입 공통: 대상별 리뷰 상세 조회 */
  async getTargetReviewDetail(
    targetType: ReviewTargetType,
    targetId: string,
    reviewId: string,
    photoIndex?: number
  ): Promise<GetReviewDetailResponseDto> {
    const review =
      await this.reviewsRepository.findReviewWithPhotosByTarget(
        targetType,
        targetId,
        reviewId
      );
    if (!review) {
      throw new ReviewNotFoundError(reviewId);
    }

    const [user, thumbnail] = await Promise.all([
      review.user_id
        ? this.reviewsRepository.getUserInfo(review.user_id)
        : Promise.resolve(null),
      this.reviewsRepository.findTargetThumbnail(targetType, targetId)
    ]);
    const userRes = user ?? null;

    const photoUrls = review.review_photo
      .filter((p) => p.content !== null)
      .sort((a, b) => (a.photo_order ?? 0) - (b.photo_order ?? 0))
      .map((p) => p.content as string);

    if (photoIndex !== undefined) {
      const totalPhotoCount =
        await this.reviewsRepository.countTotalPhotosForTarget(
          targetType,
          targetId
        );
      const hasPrev = photoIndex > 0;
      const hasNext = photoIndex < totalPhotoCount - 1;
      return {
        review_id: review.review_id,
        user_profile_image: userRes?.profile_photo ?? null,
        user_nickname: userRes?.nickname ?? null,
        star: review.star ?? 0,
        created_at: review.created_at ?? new Date(),
        content: review.content,
        photo_urls: photoUrls,
        product_thumbnail: thumbnail ?? null,
        current_photo_index: photoIndex,
        total_photo_count: totalPhotoCount,
        has_prev: hasPrev,
        has_next: hasNext,
        prev_photo_index: hasPrev ? photoIndex - 1 : undefined,
        next_photo_index: hasNext ? photoIndex + 1 : undefined
      };
    }

    return {
      review_id: review.review_id,
      user_profile_image: userRes?.profile_photo ?? null,
      user_nickname: userRes?.nickname ?? null,
      star: review.star ?? 0,
      created_at: review.created_at ?? new Date(),
      content: review.content,
      photo_urls: photoUrls,
      product_thumbnail: thumbnail ?? null
    };
  }

}