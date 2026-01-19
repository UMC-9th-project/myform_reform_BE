import { prisma } from '../../config/prisma.config.js';
import {
  UserSelect,
  OwnerSelect,
  BannerSelect,
  ItemWithRelations,
  ReformProposalWithRelations,
  OwnerForBestReformers
} from './home.model.js';

export class HomeRepository {
  async findUserById(userId: string): Promise<UserSelect | null> {
    return await prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        nickname: true
      }
    });
  }

  async findOwnerById(ownerId: string): Promise<OwnerSelect | null> {
    return await prisma.owner.findUnique({
      where: { owner_id: ownerId },
      select: {
        owner_id: true,
        nickname: true,
        profile_photo: true
      }
    });
  }

  async countCartByUserId(userId: string): Promise<number> {
    return await prisma.cart.count({
      where: { user_id: userId }
    });
  }

  async findActiveBanners(): Promise<BannerSelect[]> {
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

  async findTrendingItems(): Promise<ItemWithRelations[]> {
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

  /**
   * @returns Set<string> - 찜한 아이템 ID 목록
   */
  async findUserWishListByUserId(userId: string): Promise<Set<string>> {
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

  /**
   * @param limit 조회할 개수 (기본값: 3)
   */
  async findRecentProposals(limit: number = 3): Promise<ReformProposalWithRelations[]> {
    return await prisma.reform_proposal.findMany({
      take: limit,
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

  /**
   * @param limit 조회할 개수 (기본값: 50)
   */
  async findBestReformers(limit: number = 50): Promise<OwnerForBestReformers[]> {
    return await prisma.owner.findMany({
      take: limit,
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
}
