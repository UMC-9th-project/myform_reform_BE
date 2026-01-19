import prisma from '../../config/prisma.config.js';
import type { Prisma } from '@prisma/client';
import type { ItemWithRelations, ReviewWithPhotos } from './market.model.js';

export class MarketRepository {
  /**
   * 카테고리 ID로 카테고리 조회
   */
  async findCategoryById(categoryId: string) {
    return await prisma.category.findUnique({
      where: { category_id: categoryId },
      select: { category_id: true }
    });
  }

  /**
   * 상품 목록 조회 (필터 및 정렬 적용)
   */
  async findItemsWithFilters(
    categoryFilter: { category_id?: string } | {},
    orderBy: Prisma.itemOrderByWithRelationInput | Prisma.itemOrderByWithRelationInput[],
    skip: number,
    take: number
  ) {
    return await prisma.item.findMany({
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
      take
    });
  }

  /**
   * 상품 개수 조회
   */
  async countItems(categoryFilter: { category_id?: string } | {}): Promise<number> {
    return await prisma.item.count({
      where: categoryFilter
    });
  }

  /**
   * 상품 ID로 상품 조회 (관계 포함)
   */
  async findItemWithRelations(itemId: string): Promise<ItemWithRelations | null> {
    return await prisma.item.findUnique({
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
   * 상품 ID로 상품 존재 여부 확인
   */
  async findItemById(itemId: string) {
    return await prisma.item.findUnique({
      where: { item_id: itemId },
      select: { item_id: true }
    });
  }

  /**
   * 사용자 찜 목록 조회
   */
  async findUserWishes(userId: string, itemIds: string[]) {
    return await prisma.user_wish.findMany({
      where: {
        user_id: userId,
        target_type: 'ITEM',
        target_id: { in: itemIds }
      },
      select: {
        target_id: true
      }
    });
  }

  /**
   * 상품 찜 여부 확인
   */
  async checkItemWished(userId: string, itemId: string) {
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
   * 상품 썸네일 조회
   */
  async findItemThumbnail(itemId: string) {
    return await prisma.item_photo.findFirst({
      where: { item_id: itemId },
      orderBy: { photo_order: 'asc' },
      select: { content: true }
    });
  }

  /**
   * 상품의 리뷰 개수 조회
   */
  async countReviewsForItem(itemId: string): Promise<number> {
    return await prisma.review.count({
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
   * 상품의 사진 리뷰 개수 조회
   */
  async countPhotoReviewsForItem(itemId: string): Promise<number> {
    return await prisma.review.count({
      where: {
        reciept: {
          order: {
            target_type: 'ITEM',
            target_id: itemId
          }
        },
        review_photo: { some: {} }
      }
    });
  }

  /**
   * 상품의 평균 별점 조회
   */
  async findAverageStarForItem(itemId: string) {
    return await prisma.review.aggregate({
      where: {
        reciept: {
          order: {
            target_type: 'ITEM',
            target_id: itemId
          }
        }
      },
      _avg: { star: true }
    });
  }

  /**
   * 상품의 리뷰 목록 조회 (제한된 개수)
   */
  async findReviewsForItemPreview(itemId: string, limit: number): Promise<ReviewWithPhotos[]> {
    return await prisma.review.findMany({
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
      orderBy: {
        created_at: 'desc'
      },
      take: limit
    });
  }

  /**
   * 상품의 전체 리뷰 사진 개수 조회
   */
  async countPhotosForItem(itemId: string): Promise<number> {
    return await prisma.review_photo.count({
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
   * 상품의 리뷰 목록 조회 (페이지네이션)
   */
  async findReviewsForItem(
    itemId: string,
    orderBy: Prisma.reviewOrderByWithRelationInput | Prisma.reviewOrderByWithRelationInput[],
    skip: number,
    take: number
  ): Promise<ReviewWithPhotos[]> {
    return await prisma.review.findMany({
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
   * 사진이 있는 리뷰 목록 조회
   */
  async findReviewsWithPhotosForItem(itemId: string): Promise<ReviewWithPhotos[]> {
    return await prisma.review.findMany({
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
   * 리뷰 상세 조회 (사진 포함)
   */
  async findReviewWithPhotos(itemId: string, reviewId: string): Promise<ReviewWithPhotos | null> {
    return await prisma.review.findFirst({
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
   * 사용자 ID 목록으로 사용자 정보 조회
   */
  async findUsersByIds(userIds: string[]) {
    if (userIds.length === 0) {
      return [];
    }

    return await prisma.user.findMany({
      where: { user_id: { in: userIds } },
      select: { user_id: true, profile_photo: true, nickname: true }
    });
  }

  /**
   * 사용자 ID로 사용자 정보 조회
   */
  async findUserById(userId: string) {
    return await prisma.user.findUnique({
      where: { user_id: userId },
      select: { user_id: true, profile_photo: true, nickname: true }
    });
  }

  /**
   * 상품의 전체 사진 개수 조회 (네비게이션용)
   */
  async countTotalPhotosForItem(itemId: string): Promise<number> {
    return await prisma.review_photo.count({
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
}
