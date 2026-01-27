import {
  ItemNotFoundError,
  ReviewNotFoundError,
  MarketError
} from './market.error.js';
import type { Prisma } from '@prisma/client';
import { Prisma as PrismaClient } from '@prisma/client';
import type {
  GetItemListResponseDto,
  GetItemDetailResponseDto,
  GetItemReviewsResponseDto,
  GetItemReviewPhotosResponseDto,
  GetReviewDetailResponseDto
} from './market.dto.js';
import type { ItemWithRelations, ReviewWithPhotos } from './market.model.js';
import { MarketRepository } from './market.repository.js';
import { DatabaseForeignKeyError } from '../../utils/dbErrorHandler.js';

export class MarketService {
  constructor(private repository: MarketRepository = new MarketRepository()) {}
  private static readonly DEFAULT_DELIVERY_INFO = '평균 3일 이내 배송 시작';
  private static readonly MAX_PREVIEW_PHOTOS = 7;
  private static readonly DEFAULT_REVIEW_LIMIT = 5;

  /**
   * 상품 목록 조회
   */
  async getItemList(
    categoryId: string | undefined,
    sort: 'popular' | 'latest',
    page: number,
    limit: number,
    userId: string | undefined
  ): Promise<GetItemListResponseDto> {
    try {
      const skip = (page - 1) * limit;

      const categoryFilter = categoryId ? { category_id: categoryId } : {};

      const orderBy =
        sort === 'latest'
          ? { created_at: 'desc' as const }
          : [
              { review_count: 'desc' as const },
              { avg_star: 'desc' as const },
              { created_at: 'desc' as const }
            ];

      const [items, totalCount] = await Promise.all([
        this.repository.findItemsWithFilters(categoryFilter, orderBy, skip, limit),
        this.repository.countItems(categoryFilter)
      ]);

      const wishedItemIds = await this.getWishedItemIds(
        userId,
        items.map((item: { item_id: string }) => item.item_id)
      );
      const itemCards = this.transformItemsToCards(items, wishedItemIds, userId);

      return {
        items: itemCards,
        total_count: totalCount,
        page,
        limit
      };
    } catch (error) {
      if (error instanceof MarketError) {
        throw error;
      }
      if (error instanceof DatabaseForeignKeyError) {
        throw new MarketError(
          '존재하지 않는 카테고리입니다.',
          error.description || `categoryId: ${categoryId}`
        );
      }
      if (error instanceof PrismaClient.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new MarketError(
            '존재하지 않는 카테고리입니다.',
            `categoryId: ${categoryId}`
          );
        }
      }
      if (error instanceof Error && (error.message.includes('Invalid') || error.message.includes('UUID') || error.message.includes('Inconsistent column data'))) {
        throw new MarketError(
          '상품 목록 조회 실패',
          '입력값이 올바르지 않습니다.'
        );
      }
      throw new MarketError(
        `상품 목록 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        `categoryId: ${categoryId}, page: ${page}, limit: ${limit}`
      );
    }
  }

  /**
   * 상품 상세 조회
   */
  async getItemDetail(
    itemId: string,
    userId: string | undefined
  ): Promise<GetItemDetailResponseDto> {
    try {
      const item = await this.getItemWithRelations(itemId);
      if (!item) {
        throw new ItemNotFoundError(itemId);
      }

      const isWished = await this.checkItemWished(userId, itemId);
      const images = this.extractItemImages(item);
      const optionGroups = this.transformOptionGroups(item);
      const reviewData = await this.getReviewDataForItem(itemId);
      const itemThumbnail = await this.getItemThumbnail(itemId);
      const reviews = await this.transformReviews(reviewData.allReviews, itemThumbnail);

      return {
        item_id: item.item_id,
        title: item.title,
        images,
        price: item.price ? Number(item.price) : 0,
        delivery: item.delivery ? Number(item.delivery) : 0,
        delivery_info: MarketService.DEFAULT_DELIVERY_INFO,
        option_groups: optionGroups,
        reformer: {
          owner_id: item.owner.owner_id,
          profile_image: item.owner.profile_photo,
          nickname: item.owner.nickname,
          star: item.owner.avg_star ? Number(item.owner.avg_star) : 0,
          order_count: item.owner.trade_count || 0
        },
        is_wished: isWished,
        review_summary: {
          total_review_count: reviewData.totalReviewCount,
          photo_review_count: reviewData.photoReviewCount,
          avg_star: reviewData.avgStar,
          preview_photos: reviewData.previewPhotos,
          remaining_photo_count: reviewData.remainingPhotoCount
        },
        reviews
      };
    } catch (error) {
      if (error instanceof ItemNotFoundError || error instanceof MarketError) {
        throw error;
      }
      throw new MarketError(
        `상품 상세 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        `itemId: ${itemId}`
      );
    }
  }

  /**
   * 상품 리뷰 목록 조회
   */
  async getItemReviews(
    itemId: string,
    page: number,
    limit: number,
    sort: 'latest' | 'star_high' | 'star_low' = 'latest'
  ): Promise<GetItemReviewsResponseDto> {
    try {
      const skip = (page - 1) * limit;
      const orderBy = this.getReviewOrderBy(sort);

      const [reviews, totalCount, avgStarResult, itemThumbnail] = await Promise.all([
        this.getReviewsForItem(itemId, orderBy, skip, limit),
        this.getReviewCountForItem(itemId),
        this.getAverageStarForItem(itemId),
        this.getItemThumbnail(itemId)
      ]);

    const avgStar = avgStarResult._avg?.star ? Number(avgStarResult._avg.star) : 0;
    const userMap = await this.getUserMapForReviews(reviews);
    const reviewList = this.transformReviewList(reviews, userMap, itemThumbnail);

      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        reviews: reviewList,
        total_count: totalCount,
        avg_star: avgStar,
        page,
        limit,
        total_pages: totalPages,
        has_next_page: hasNextPage,
        has_prev_page: hasPrevPage
      };
    } catch (error) {
      if (error instanceof ItemNotFoundError || error instanceof MarketError) {
        throw error;
      }
      throw new MarketError(
        `리뷰 목록 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        `itemId: ${itemId}, page: ${page}, limit: ${limit}`
      );
    }
  }

  /**
   * 사진 후기 조회 (무한 스크롤)
   */
  async getItemReviewPhotos(
    itemId: string,
    offset: number,
    limit: number
  ): Promise<GetItemReviewPhotosResponseDto> {
    try {
      const [totalPhotoCount, photos] = await Promise.all([
        this.getTotalPhotoCountForItem(itemId),
        this.repository.findReviewPhotosForItem(itemId, offset, limit)
      ]);

      const hasMore = photos.length > limit;
      const paginatedPhotos = hasMore ? photos.slice(0, limit) : photos;
      const photosWithIndices = this.addPhotoIndices(paginatedPhotos, offset);

      return {
        photos: photosWithIndices,
        has_more: hasMore,
        offset,
        limit,
        total_count: totalPhotoCount
      };
    } catch (error) {
      if (error instanceof ItemNotFoundError || error instanceof MarketError) {
        throw error;
      }
      throw new MarketError(
        `리뷰 사진 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        `itemId: ${itemId}, offset: ${offset}, limit: ${limit}`
      );
    }
  }

  /**
   * 리뷰 상세 조회
   */
  async getReviewDetail(
    itemId: string,
    reviewId: string,
    photoIndex?: number
  ): Promise<GetReviewDetailResponseDto> {
    try {
      const review = await this.getReviewWithPhotos(itemId, reviewId);
      if (!review) {
        throw new ReviewNotFoundError(reviewId);
      }

      const [user, itemThumbnail] = await Promise.all([
        this.getUserForReview(review.user_id),
        this.getItemThumbnail(itemId)
      ]);

    const photoUrls = this.extractReviewPhotoUrls(review);
    const navigationInfo = photoIndex !== undefined
      ? await this.getPhotoNavigationInfo(itemId, photoIndex)
      : this.getEmptyNavigationInfo();

      return {
        review_id: review.review_id,
        user_profile_image: user?.profile_photo || null,
        user_nickname: user?.nickname || null,
        star: review.star || 0,
        created_at: review.created_at || new Date(),
        content: review.content,
        photo_urls: photoUrls,
        product_thumbnail: itemThumbnail?.content || null,
        ...navigationInfo
      };
    } catch (error) {
      if (
        error instanceof ItemNotFoundError ||
        error instanceof ReviewNotFoundError ||
        error instanceof MarketError
      ) {
        throw error;
      }
      throw new MarketError(
        `리뷰 상세 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        `itemId: ${itemId}, reviewId: ${reviewId}`
      );
    }
  }

  /**
   * 찜한 상품 ID 목록 조회
   */
  private async getWishedItemIds(
    userId: string | undefined,
    itemIds: string[]
  ): Promise<Set<string>> {
    try {
      if (!userId || itemIds.length === 0) {
        return new Set<string>();
      }

      const wishes = await this.repository.findUserWishes(userId, itemIds);

      return new Set(
        wishes
          .map((w: { target_id: string | null }) => w.target_id)
          .filter((id: string | null): id is string => id !== null)
      );
    } catch (error) {
      throw new MarketError(
        `찜 목록 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        `userId: ${userId}`
      );
    }
  }

  /**
   * 상품 목록을 ItemCard 배열로 변환
   */
  private transformItemsToCards(
    items: Array<{
      item_id: string;
      title: string | null;
      price: Prisma.Decimal | null;
      avg_star: Prisma.Decimal | null;
      review_count: number | null;
      owner: { nickname: string | null };
      item_photo: Array<{ content: string | null }>;
    }>,
    wishedItemIds: Set<string>,
    userId: string | undefined
  ): GetItemListResponseDto['items'] {
    return items.map((item: {
      item_id: string;
      title: string | null;
      price: Prisma.Decimal | null;
      avg_star: Prisma.Decimal | null;
      review_count: number | null;
      owner: { nickname: string | null };
      item_photo: Array<{ content: string | null }>;
    }) => ({
      item_id: item.item_id,
      thumbnail: item.item_photo[0]?.content || '',
      title: item.title || '',
      price: item.price ? Number(item.price) : 0,
      star: item.avg_star ? Number(item.avg_star) : 0,
      review_count: item.review_count || 0,
      owner_nickname: item.owner.nickname || '',
      is_wished: userId ? wishedItemIds.has(item.item_id) : false
    }));
  }

  /**
   * 상품 상세 정보 조회 (관계 포함)
   */
  private async getItemWithRelations(itemId: string): Promise<ItemWithRelations | null> {
    try {
      return await this.repository.findItemWithRelations(itemId);
    } catch (error) {
      if (error instanceof Error && (error.message.includes('Invalid') || error.message.includes('UUID') || error.message.includes('Inconsistent column data'))) {
        return null;
      }
      throw new MarketError(
        `상품 정보 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        `itemId: ${itemId}`
      );
    }
  }

  /**
   * 상품 찜 여부 확인
   */
  private async checkItemWished(
    userId: string | undefined,
    itemId: string
  ): Promise<boolean> {
    try {
      if (!userId) {
        return false;
      }

      return await this.repository.checkItemWished(userId, itemId);
    } catch (error) {
      throw new MarketError(
        `찜 여부 확인 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        `userId: ${userId}, itemId: ${itemId}`
      );
    }
  }

  /**
   * 상품 이미지 배열 추출
   */
  private extractItemImages(item: ItemWithRelations): string[] {
    const filteredPhotos = item.item_photo.filter(
      (photo): photo is { content: string; photo_order: number | null } =>
        photo.content !== null
    );
    
    return filteredPhotos
      .sort(
        (a, b) =>
          (a.photo_order || 0) - (b.photo_order || 0)
      )
      .map((photo) => photo.content);
  }

  /**
   * 옵션 그룹 변환
   */
  private transformOptionGroups(
    item: ItemWithRelations
  ): GetItemDetailResponseDto['option_groups'] {
    return item.option_group.map((group: {
      option_group_id: string;
      name: string | null;
      option_item: Array<{
        option_item_id: string;
        name: string | null;
        extra_price: number | null;
        quantity: number | null;
      }>;
    }) => ({
      option_group_id: group.option_group_id,
      name: group.name || '',
      option_items: group.option_item.map((item: {
        option_item_id: string;
        name: string | null;
        extra_price: number | null;
        quantity: number | null;
      }) => ({
        option_item_id: item.option_item_id,
        name: item.name || '',
        extra_price: item.extra_price || 0,
        quantity: item.quantity,
        is_sold_out: item.quantity !== null && item.quantity <= 0
      }))
    }));
  }

  /**
   * 상품의 리뷰 데이터 조회 (통계, 미리보기 등)
   */
  private async getReviewDataForItem(itemId: string): Promise<{
    totalReviewCount: number;
    photoReviewCount: number;
    avgStar: number;
    previewPhotos: GetItemDetailResponseDto['review_summary']['preview_photos'];
    remainingPhotoCount: number;
    allReviews: ReviewWithPhotos[];
  }> {
    try {
      const [
        totalReviewCount,
        photoReviewCount,
        avgStarResult,
        allReviews,
        totalPhotoCount
      ] = await Promise.all([
        this.repository.countReviewsForItem(itemId),
        this.repository.countPhotoReviewsForItem(itemId),
        this.repository.findAverageStarForItem(itemId),
        this.repository.findReviewsForItemPreview(itemId, MarketService.DEFAULT_REVIEW_LIMIT),
        this.repository.countPhotosForItem(itemId)
      ]);

      const avgStar = avgStarResult._avg?.star ? Number(avgStarResult._avg.star) : 0;
      
      const reviewsWithPhotos = allReviews.filter(
        (review: ReviewWithPhotos) => review.review_photo.length > 0
      );
      const previewPhotos = this.flattenPreviewPhotos(
        reviewsWithPhotos,
        MarketService.MAX_PREVIEW_PHOTOS
      );
      const remainingPhotoCount = Math.max(
        0,
        totalPhotoCount - MarketService.MAX_PREVIEW_PHOTOS
      );

      return {
        totalReviewCount,
        photoReviewCount,
        avgStar,
        previewPhotos,
        remainingPhotoCount,
        allReviews
      };
    } catch (error) {
      throw new MarketError(
        `리뷰 데이터 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        `itemId: ${itemId}`
      );
    }
  }

  /**
   * 사진 리뷰 미리보기 평탄화 (최대 개수 제한)
   */
  private flattenPreviewPhotos(
    reviews: ReviewWithPhotos[],
    maxCount: number
  ): GetItemDetailResponseDto['review_summary']['preview_photos'] {
    const flattened: GetItemDetailResponseDto['review_summary']['preview_photos'] = [];

    for (const review of reviews) {
      const sortedPhotos = review.review_photo.sort(
        (a: { photo_order: number | null }, b: { photo_order: number | null }) =>
          (a.photo_order || 0) - (b.photo_order || 0)
      );

      for (const photo of sortedPhotos) {
        if (photo.content && flattened.length < maxCount) {
          flattened.push({
            photo_index: flattened.length,
            review_id: review.review_id,
            photo_url: photo.content
          });
          if (flattened.length >= maxCount) break;
        }
      }
      if (flattened.length >= maxCount) break;
    }

    return flattened;
  }

  /**
   * 상품 썸네일 조회
   */
  private async getItemThumbnail(itemId: string): Promise<{ content: string | null } | null> {
    try {
      return await this.repository.findItemThumbnail(itemId);
    } catch (error) {
      throw new MarketError(
        `상품 썸네일 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        `itemId: ${itemId}`
      );
    }
  }

  /**
   * 리뷰 목록 변환 (사용자 정보 포함)
   */
  private async transformReviews(
    reviews: ReviewWithPhotos[],
    itemThumbnail: { content: string | null } | null
  ): Promise<GetItemDetailResponseDto['reviews']> {
    try {
      const userIds = reviews
        .map((r: ReviewWithPhotos) => r.user_id)
        .filter((id): id is string => id !== null);
      const uniqueUserIds = [...new Set(userIds)];

      const users = await this.repository.findUsersByIds(uniqueUserIds);
      const userMap = new Map<
        string,
        { user_id: string; profile_photo: string | null; nickname: string | null }
      >(
        users.map((u: { user_id: string; profile_photo: string | null; nickname: string | null }) => [
          u.user_id,
          u
        ])
      );

      return reviews.map((review: ReviewWithPhotos) => {
        const photos = review.review_photo
          .sort(
            (a: { photo_order: number | null }, b: { photo_order: number | null }) =>
              (a.photo_order || 0) - (b.photo_order || 0)
          )
          .map((photo: { content: string | null }) => photo.content || '');
        const user = review.user_id ? userMap.get(review.user_id) : undefined;

        return {
          review_id: review.review_id,
          user_profile_image: user?.profile_photo || null,
          user_nickname: user?.nickname || null,
          star: review.star || 0,
          created_at: review.created_at || new Date(),
          content: review.content,
          product_thumbnail: itemThumbnail?.content || null,
          photos
        };
      });
    } catch (error) {
      throw new MarketError(
        `리뷰 변환 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      );
    }
  }

  /**
   * 리뷰 정렬 기준 반환
   */
  private getReviewOrderBy(
    sort: 'latest' | 'star_high' | 'star_low'
  ): Prisma.reviewOrderByWithRelationInput | Prisma.reviewOrderByWithRelationInput[] {
    switch (sort) {
      case 'star_high':
        return [
          { star: 'desc' as const },
          { created_at: 'desc' as const }
        ];
      case 'star_low':
        return [
          { star: 'asc' as const },
          { created_at: 'desc' as const }
        ];
      case 'latest':
      default:
        return {
          created_at: 'desc' as const
        };
    }
  }

  /**
   * 상품의 리뷰 목록 조회
   */
  private async getReviewsForItem(
    itemId: string,
    orderBy: Prisma.reviewOrderByWithRelationInput | Prisma.reviewOrderByWithRelationInput[],
    skip: number,
    take: number
  ): Promise<ReviewWithPhotos[]> {
    try {
      return await this.repository.findReviewsForItem(itemId, orderBy, skip, take);
    } catch (error) {
      throw new MarketError(
        `리뷰 목록 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        `itemId: ${itemId}`
      );
    }
  }

  /**
   * 상품의 리뷰 개수 조회
   */
  private async getReviewCountForItem(itemId: string): Promise<number> {
    try {
      return await this.repository.countReviewsForItem(itemId);
    } catch (error) {
      throw new MarketError(
        `리뷰 개수 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        `itemId: ${itemId}`
      );
    }
  }

  /**
   * 상품의 평균 별점 조회
   */
  private async getAverageStarForItem(itemId: string) {
    try {
      return await this.repository.findAverageStarForItem(itemId);
    } catch (error) {
      throw new MarketError(
        `평균 별점 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        `itemId: ${itemId}`
      );
    }
  }

  /**
   * 리뷰 목록의 사용자 정보 맵 조회
   */
  private async getUserMapForReviews(
    reviews: ReviewWithPhotos[]
  ): Promise<Map<string, { user_id: string; profile_photo: string | null; nickname: string | null }>> {
    try {
      const userIds = reviews
        .map((r: ReviewWithPhotos) => r.user_id)
        .filter((id): id is string => id !== null);
      const uniqueUserIds = [...new Set(userIds)];

      const users = await this.repository.findUsersByIds(uniqueUserIds);

      return new Map(
        users.map(
          (u: { user_id: string; profile_photo: string | null; nickname: string | null }) => [
            u.user_id,
            u
          ]
        )
      );
    } catch (error) {
      throw new MarketError(
        `사용자 정보 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      );
    }
  }

  /**
   * 리뷰 목록 변환
   */
  private transformReviewList(
    reviews: ReviewWithPhotos[],
    userMap: Map<string, { user_id: string; profile_photo: string | null; nickname: string | null }>,
    itemThumbnail: { content: string | null } | null
  ): GetItemReviewsResponseDto['reviews'] {
    return reviews.map((review: ReviewWithPhotos) => {
      const photos = review.review_photo
        .sort(
          (a: { photo_order: number | null }, b: { photo_order: number | null }) =>
            (a.photo_order || 0) - (b.photo_order || 0)
        )
        .map((photo: { content: string | null }) => photo.content || '');
      const user = review.user_id ? userMap.get(review.user_id) : null;

      return {
        review_id: review.review_id,
        user_profile_image: user?.profile_photo || null,
        user_nickname: user?.nickname || null,
        star: review.star || 0,
        created_at: review.created_at || new Date(),
        content: review.content,
        product_thumbnail: itemThumbnail?.content || null,
        photos
      };
    });
  }

  /**
   * 상품의 전체 사진 개수 조회
   */
  private async getTotalPhotoCountForItem(itemId: string): Promise<number> {
    try {
      return await this.repository.countTotalPhotosForItem(itemId);
    } catch (error) {
      throw new MarketError(
        `사진 개수 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        `itemId: ${itemId}`
      );
    }
  }

  /**
   * 사진에 인덱스 추가
   */
  private addPhotoIndices(
    photos: Array<{ review_id: string; photo_url: string; photo_order: number }>,
    offset: number
  ): GetItemReviewPhotosResponseDto['photos'] {
    return photos.map((photo: { review_id: string; photo_url: string; photo_order: number }, idx: number) => ({
      photo_index: offset + idx,
      review_id: photo.review_id,
      photo_url: photo.photo_url,
      photo_order: photo.photo_order
    }));
  }

  /**
   * 리뷰 상세 조회 (사진 포함)
   */
  private async getReviewWithPhotos(
    itemId: string,
    reviewId: string
  ): Promise<ReviewWithPhotos | null> {
    try {
      return await this.repository.findReviewWithPhotos(itemId, reviewId);
    } catch (error) {
      if (error instanceof Error && (error.message.includes('Invalid') || error.message.includes('UUID') || error.message.includes('Inconsistent column data'))) {
        return null;
      }
      throw new MarketError(
        `리뷰 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        `itemId: ${itemId}, reviewId: ${reviewId}`
      );
    }
  }

  /**
   * 리뷰 작성자 정보 조회
   */
  private async getUserForReview(
    userId: string | null
  ): Promise<{ user_id: string; profile_photo: string | null; nickname: string | null } | null> {
    try {
      if (!userId) {
        return null;
      }

      return await this.repository.findUserById(userId);
    } catch (error) {
      throw new MarketError(
        `사용자 정보 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        `userId: ${userId}`
      );
    }
  }

  /**
   * 리뷰 사진 URL 배열 추출
   */
  private extractReviewPhotoUrls(review: ReviewWithPhotos): string[] {
    return review.review_photo
      .filter((photo) => photo.content !== null)
      .sort(
        (a, b) =>
          (a.photo_order ?? 0) - (b.photo_order ?? 0)
      )
      .map((photo) => photo.content as string);
  }

  /**
   * 사진 네비게이션 정보 조회 (전체 사진 리스트 기준)
   */
  private async getPhotoNavigationInfo(
    itemId: string,
    photoIndex: number
  ): Promise<{
    current_photo_index: number;
    total_photo_count: number;
    has_prev: boolean;
    has_next: boolean;
    prev_photo_index: number | undefined;
    next_photo_index: number | undefined;
  }> {
    try {
      const totalPhotoCount = await this.repository.countTotalPhotosForItem(itemId);

      const hasPrev = photoIndex > 0;
      const hasNext = photoIndex < totalPhotoCount - 1;

      return {
        current_photo_index: photoIndex,
        total_photo_count: totalPhotoCount,
        has_prev: hasPrev,
        has_next: hasNext,
        prev_photo_index: hasPrev ? photoIndex - 1 : undefined,
        next_photo_index: hasNext ? photoIndex + 1 : undefined
      };
    } catch (error) {
      throw new MarketError(
        `사진 네비게이션 정보 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        `itemId: ${itemId}, photoIndex: ${photoIndex}`
      );
    }
  }

  /**
   * 빈 네비게이션 정보 반환 (전체 리뷰에서 사진 클릭한 경우)
   */
  private getEmptyNavigationInfo(): {
    current_photo_index: undefined;
    total_photo_count: undefined;
    has_prev: false;
    has_next: false;
    prev_photo_index: undefined;
    next_photo_index: undefined;
  } {
    return {
      current_photo_index: undefined,
      total_photo_count: undefined,
      has_prev: false,
      has_next: false,
      prev_photo_index: undefined,
      next_photo_index: undefined
    };
  }
}
