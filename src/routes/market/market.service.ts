import prisma from '../../config/prisma.config.js';
import {
  ItemNotFoundError,
  ReviewNotFoundError,
  MarketError
} from './market.error.js';
import type { Prisma } from '@prisma/client';
import type {
  GetItemListResponseDto,
  GetItemDetailResponseDto,
  GetItemReviewsResponseDto,
  GetItemReviewPhotosResponseDto,
  GetReviewDetailResponseDto
} from './market.dto.js';
import type { ItemWithRelations, ReviewWithPhotos } from './market.model.js';

export class MarketService {
  private static readonly DEFAULT_DELIVERY_INFO = '평균 3일 이내 배송 시작';
  private static readonly MAX_PREVIEW_PHOTOS = 7;
  private static readonly MAX_PAGE_LIMIT = 100;
  private static readonly MIN_PAGE_LIMIT = 1;
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
    if (page < 1) {
      throw new MarketError('페이지 번호는 1 이상이어야 합니다.', `page: ${page}`);
    }
    if (
      limit < MarketService.MIN_PAGE_LIMIT ||
      limit > MarketService.MAX_PAGE_LIMIT
    ) {
      throw new MarketError(
        `페이지당 개수는 ${MarketService.MIN_PAGE_LIMIT} 이상 ${MarketService.MAX_PAGE_LIMIT} 이하여야 합니다.`,
        `limit: ${limit}`
      );
    }

    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { category_id: categoryId },
        select: { category_id: true }
      });
      if (!category) {
        throw new MarketError(
          '존재하지 않는 카테고리입니다.',
          `categoryId: ${categoryId}`
        );
      }
    }

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
      prisma.item.findMany({
        where: categoryFilter,
        include: {
          owner: {
            select: {
              nickname: true
            }
          },
          item_photo: {
            select: {
              content: true,
              photo_order: true
            },
            orderBy: {
              photo_order: 'asc'
            },
            take: 1
          }
        },
        orderBy: orderBy,
        skip,
        take: limit
      }),
      prisma.item.count({
        where: categoryFilter
      })
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
  }

  /**
   * 상품 상세 조회
   */
  async getItemDetail(
    itemId: string,
    userId: string | undefined
  ): Promise<GetItemDetailResponseDto> {
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
    await this.validateItemExists(itemId);

    if (page < 1) {
      throw new MarketError('페이지 번호는 1 이상이어야 합니다.', `page: ${page}`);
    }
    if (
      limit < MarketService.MIN_PAGE_LIMIT ||
      limit > MarketService.MAX_PAGE_LIMIT
    ) {
      throw new MarketError(
        `페이지당 개수는 ${MarketService.MIN_PAGE_LIMIT} 이상 ${MarketService.MAX_PAGE_LIMIT} 이하여야 합니다.`,
        `limit: ${limit}`
      );
    }

    const skip = (page - 1) * limit;
    const orderBy = this.getReviewOrderBy(sort);

    const [reviews, totalCount, avgStarResult, itemThumbnail] = await Promise.all([
      this.getReviewsForItem(itemId, orderBy, skip, limit),
      this.getReviewCountForItem(itemId),
      this.getAverageStarForItem(itemId),
      this.getItemThumbnail(itemId)
    ]);

    const avgStar = avgStarResult._avg.star ? Number(avgStarResult._avg.star) : 0;
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
  }

  /**
   * 사진 후기 조회 (무한 스크롤) - 사진 단위로 평탄화
   * 최신순(created_at DESC)으로 정렬된 리뷰의 사진을 평탄화하여 반환
   */
  async getItemReviewPhotos(
    itemId: string,
    offset: number,
    limit: number
  ): Promise<GetItemReviewPhotosResponseDto> {
    await this.validateItemExists(itemId);

    if (offset < 0) {
      throw new MarketError('offset은 0 이상이어야 합니다.', `offset: ${offset}`);
    }
    if (limit < 1 || limit > 100) {
      throw new MarketError(
        'limit은 1 이상 100 이하여야 합니다.',
        `limit: ${limit}`
      );
    }

    const [totalPhotoCount, allReviews] = await Promise.all([
      this.getTotalPhotoCountForItem(itemId),
      this.getReviewsWithPhotosForItem(itemId)
    ]);

    const flattenedPhotos = this.flattenReviewPhotos(allReviews);
    const paginatedPhotos = this.paginatePhotos(flattenedPhotos, offset, limit);
    const photos = this.addPhotoIndices(paginatedPhotos, offset);

    return {
      photos,
      has_more: paginatedPhotos.length > limit,
      offset,
      limit,
      total_count: totalPhotoCount
    };
  }

  /**
   * 리뷰 상세 조회
   */
  async getReviewDetail(
    itemId: string,
    reviewId: string,
    photoIndex?: number
  ): Promise<GetReviewDetailResponseDto> {
    await this.validateItemExists(itemId);

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
  }

  /**
   * 찜한 상품 ID 목록 조회
   */
  private async getWishedItemIds(
    userId: string | undefined,
    itemIds: string[]
  ): Promise<Set<string>> {
    if (!userId || itemIds.length === 0) {
      return new Set<string>();
    }

    const wishes = await prisma.user_wish.findMany({
      where: {
        user_id: userId,
        target_type: 'ITEM',
        target_id: { in: itemIds }
      },
      select: {
        target_id: true
      }
    });

    return new Set(
      wishes
        .map((w: { target_id: string | null }) => w.target_id)
        .filter((id: string | null): id is string => id !== null)
    );
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
    return prisma.item.findUnique({
      where: { item_id: itemId },
      include: {
        owner: {
          select: {
            owner_id: true,
            profile_photo: true,
            nickname: true,
            avg_star: true,
            trade_count: true
          }
        },
        item_photo: {
          select: {
            content: true,
            photo_order: true
          },
          orderBy: {
            photo_order: 'asc'
          }
        },
        option_group: {
          select: {
            option_group_id: true,
            name: true,
            sort_order: true,
            option_item: {
              select: {
                option_item_id: true,
                name: true,
                extra_price: true,
                quantity: true,
                sort_order: true
              },
              orderBy: {
                sort_order: 'asc'
              }
            }
          },
          orderBy: {
            sort_order: 'asc'
          }
        }
      }
    });
  }

  /**
   * 상품 찜 여부 확인
   */
  private async checkItemWished(
    userId: string | undefined,
    itemId: string
  ): Promise<boolean> {
    if (!userId) {
      return false;
    }

    const wish = await prisma.user_wish.findFirst({
      where: {
        user_id: userId,
        target_type: 'ITEM',
        target_id: itemId
      }
    });

    return wish !== null;
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
        quantity: item.quantity
      }))
    }));
  }

  /**
   * 상품의 리뷰 데이터 조회 (통계, 미리보기 등)
   * 쿼리 최적화: 필요한 데이터를 최소한의 쿼리로 조회
   */
  private async getReviewDataForItem(itemId: string): Promise<{
    totalReviewCount: number;
    photoReviewCount: number;
    avgStar: number;
    previewPhotos: GetItemDetailResponseDto['review_summary']['preview_photos'];
    remainingPhotoCount: number;
    allReviews: ReviewWithPhotos[];
  }> {
    const itemFilter = {
      reciept: {
        order: {
          target_type: 'ITEM' as const,
          target_id: itemId
        }
      }
    };

    const [
      totalReviewCount,
      photoReviewCount,
      avgStarResult,
      allReviews,
      totalPhotoCount
    ] = await Promise.all([
      prisma.review.count({ where: itemFilter }),
      prisma.review.count({
        where: {
          ...itemFilter,
          review_photo: { some: {} }
        }
      }),
      prisma.review.aggregate({
        where: itemFilter,
        _avg: { star: true }
      }),
      prisma.review.findMany({
        where: itemFilter,
        include: {
          review_photo: {
            select: {
              content: true,
              photo_order: true
            },
            orderBy: {
              photo_order: 'asc'
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        take: MarketService.DEFAULT_REVIEW_LIMIT
      }),
      prisma.review_photo.count({
        where: {
          review: itemFilter
        }
      })
    ]);

    const avgStar = avgStarResult._avg.star ? Number(avgStarResult._avg.star) : 0;
    
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
    return prisma.item_photo.findFirst({
      where: { item_id: itemId },
      orderBy: { photo_order: 'asc' },
      select: { content: true }
    });
  }

  /**
   * 리뷰 목록 변환 (사용자 정보 포함)
   */
  private async transformReviews(
    reviews: ReviewWithPhotos[],
    itemThumbnail: { content: string | null } | null
  ): Promise<GetItemDetailResponseDto['reviews']> {
    const userIds = reviews
      .map((r: ReviewWithPhotos) => r.user_id)
      .filter((id): id is string => id !== null);
    const uniqueUserIds = [...new Set(userIds)];

    const users =
      uniqueUserIds.length > 0
        ? await prisma.user.findMany({
            where: { user_id: { in: uniqueUserIds } },
            select: { user_id: true, profile_photo: true, nickname: true }
          })
        : [];
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
  }

  /**
   * 상품 존재 여부 확인
   */
  private async validateItemExists(itemId: string): Promise<void> {
    const item = await prisma.item.findUnique({
      where: { item_id: itemId },
      select: { item_id: true }
    });

    if (!item) {
      throw new ItemNotFoundError(itemId);
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
    return prisma.review.findMany({
      where: {
        reciept: {
          order: {
            target_type: 'ITEM',
            target_id: itemId
          }
        }
      },
      include: {
        review_photo: {
          select: {
            content: true,
            photo_order: true
          },
          orderBy: {
            photo_order: 'asc'
          }
        }
      },
      orderBy: orderBy,
      skip,
      take
    });
  }

  /**
   * 상품의 리뷰 개수 조회
   */
  private async getReviewCountForItem(itemId: string): Promise<number> {
    return prisma.review.count({
      where: {
        reciept: {
          order: {
            target_type: 'ITEM',
            target_id: itemId
          }
        }
      }
    });
  }

  /**
   * 상품의 평균 별점 조회
   */
  private async getAverageStarForItem(itemId: string) {
    return prisma.review.aggregate({
      where: {
        reciept: {
          order: {
            target_type: 'ITEM',
            target_id: itemId
          }
        }
      },
      _avg: {
        star: true
      }
    });
  }

  /**
   * 리뷰 목록의 사용자 정보 맵 조회
   */
  private async getUserMapForReviews(
    reviews: ReviewWithPhotos[]
  ): Promise<Map<string, { user_id: string; profile_photo: string | null; nickname: string | null }>> {
    const userIds = reviews
      .map((r: ReviewWithPhotos) => r.user_id)
      .filter((id): id is string => id !== null);
    const uniqueUserIds = [...new Set(userIds)];

    const users =
      uniqueUserIds.length > 0
        ? await prisma.user.findMany({
            where: { user_id: { in: uniqueUserIds } },
            select: { user_id: true, profile_photo: true, nickname: true }
          })
        : [];

    return new Map(
      users.map(
        (u: { user_id: string; profile_photo: string | null; nickname: string | null }) => [
          u.user_id,
          u
        ]
      )
    );
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
    return prisma.review_photo.count({
      where: {
        review: {
          reciept: {
            order: {
              target_type: 'ITEM',
              target_id: itemId
            }
          }
        }
      }
    });
  }

  /**
   * 사진이 있는 리뷰 목록 조회 (최신순)
   */
  private async getReviewsWithPhotosForItem(itemId: string): Promise<ReviewWithPhotos[]> {
    return prisma.review.findMany({
      where: {
        reciept: {
          order: {
            target_type: 'ITEM',
            target_id: itemId
          }
        },
        review_photo: {
          some: {}
        }
      },
      include: {
        review_photo: {
          select: {
            content: true,
            photo_order: true
          },
          orderBy: {
            photo_order: 'asc'
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });
  }

  /**
   * 리뷰 사진 평탄화
   */
  private flattenReviewPhotos(
    reviews: ReviewWithPhotos[]
  ): Array<{ review_id: string; photo_url: string; photo_order: number }> {
    const flattened: Array<{ review_id: string; photo_url: string; photo_order: number }> = [];

    for (const review of reviews) {
      const sortedPhotos = review.review_photo.sort(
        (a: { photo_order: number | null }, b: { photo_order: number | null }) =>
          (a.photo_order ?? 0) - (b.photo_order ?? 0)
      );

      for (const photo of sortedPhotos) {
        if (photo.content) {
          flattened.push({
            review_id: review.review_id,
            photo_url: photo.content,
            photo_order: photo.photo_order ?? 0
          });
        }
      }
    }

    return flattened;
  }

  /**
   * 사진 목록 페이지네이션
   */
  private paginatePhotos(
    photos: Array<{ review_id: string; photo_url: string; photo_order: number }>,
    offset: number,
    limit: number
  ): Array<{ review_id: string; photo_url: string; photo_order: number }> {
    const paginated = photos.slice(offset, offset + limit + 1);
    return paginated.length > limit ? paginated.slice(0, limit) : paginated;
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
    return prisma.review.findFirst({
      where: {
        review_id: reviewId,
        reciept: {
          order: {
            target_type: 'ITEM',
            target_id: itemId
          }
        }
      },
      include: {
        review_photo: {
          select: {
            content: true,
            photo_order: true
          },
          orderBy: {
            photo_order: 'asc'
          }
        }
      }
    });
  }

  /**
   * 리뷰 작성자 정보 조회
   */
  private async getUserForReview(
    userId: string | null
  ): Promise<{ user_id: string; profile_photo: string | null; nickname: string | null } | null> {
    if (!userId) {
      return null;
    }

    return prisma.user.findUnique({
      where: { user_id: userId },
      select: { user_id: true, profile_photo: true, nickname: true }
    });
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
    const totalPhotoCount = await prisma.review_photo.count({
      where: {
        review: {
          reciept: {
            order: {
              target_type: 'ITEM',
              target_id: itemId
            }
          }
        }
      }
    });

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
