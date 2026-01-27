// @ts-nocheck
import prisma from '../../config/prisma.config.js';
import type {
  owner_wish,
  user_wish,
  target_type_enum,
  Prisma
} from '@prisma/client';
import type { WishDetailDTO } from './wish.dto.js';

export type UserAllowedTarget = Exclude<target_type_enum, 'REQUEST'>;

export const createUserWish = async (
  userId: string,
  targetType: UserAllowedTarget,
  targetId: string
): Promise<user_wish> => {
  return prisma.user_wish.create({
    data: {
      user_id: userId,
      target_type: targetType,
      target_id: targetId
    }
  });
};

export const createOwnerWish = async (
  ownerId: string,
  reformRequestId: string
): Promise<owner_wish> => {
  return prisma.owner_wish.create({
    data: {
      owner_id: ownerId,
      reform_request_id: reformRequestId
    }
  });
};

export const deleteUserWish = async (
  userId: string,
  targetType: UserAllowedTarget,
  targetId: string
): Promise<user_wish | null> => {
  const found = await prisma.user_wish.findFirst({
    where: {
      user_id: userId,
      target_type: targetType,
      target_id: targetId
    }
  });
  if (!found) return null;
  await prisma.user_wish.delete({ where: { wish_id: found.wish_id } });
  return found;
};

export const deleteOwnerWish = async (
  ownerId: string,
  reformRequestId: string
): Promise<owner_wish | null> => {
  const found = await prisma.owner_wish.findFirst({
    where: {
      owner_id: ownerId,
      reform_request_id: reformRequestId
    }
  });
  if (!found) return null;
  await prisma.owner_wish.delete({ where: { wish_id: found.wish_id } });
  return found;
};

export const getUserWishList = async (
  userId: string,
  type: UserAllowedTarget
): Promise<WishDetailDTO[]> => {
  const wishes = await prisma.user_wish.findMany({
    where: { user_id: userId, target_type: type },
    orderBy: [{ created_at: 'desc' }]
  });

  const ids = wishes.map((w) => w.target_id);

  if (type === 'ITEM') {
    const items = await prisma.item.findMany({
      where: { item_id: { in: ids as string[] } },
      select: {
        item_id: true,
        title: true,
        price: true,
        avg_star: true,
        review_count: true,
        owner: { select: { name: true } },
        item_photo: { select: { content: true }, take: 1 }
      }
    });
    return items.map((it) => ({
      itemId: it.item_id,
      title: it.title ?? '',
      price: Number(it.price ?? 0),
      avgStar: it.avg_star ? Number(it.avg_star) : null,
      reviewCount: it.review_count,
      name: it.owner?.name ?? '',
      content: it.item_photo?.[0]?.content ?? '',
      wishType: 'ITEM' as const
    }));
  }

  if (type === 'PROPOSAL') {
    const proposals = await prisma.reform_proposal.findMany({
      where: { reform_proposal_id: { in: ids as string[] } },
      select: {
        reform_proposal_id: true,
        title: true,
        price: true,
        owner: { select: { name: true } },
        reform_proposal_photo: { select: { content: true }, take: 1 }
      }
    });
    return proposals.map((p) => ({
      itemId: p.reform_proposal_id,
      title: p.title ?? '',
      price: Number(p.price ?? 0),
      avgStar: null,
      reviewCount: null,
      name: p.owner?.name ?? '',
      content: p.reform_proposal_photo?.[0]?.content ?? '',
      wishType: 'PROPOSAL' as const
    }));
  }

  return [];
};

export const getOwnerWishList = async (
  ownerId: string
): Promise<WishDetailDTO[]> => {
  const wishes = await prisma.owner_wish.findMany({
    where: { owner_id: ownerId },
    orderBy: [{ created_at: 'desc' }]
  });
  const ids = wishes.map((w) => w.reform_request_id);
  const requests = await prisma.reform_request.findMany({
    where: { reform_request_id: { in: ids } },
    select: {
      reform_request_id: true,
      title: true,
      min_budget: true,
      max_budget: true,
      user: { select: { name: true } },
      reform_request_photo: { select: { content: true }, take: 1 }
    }
  });

  return requests.map((r) => ({
    itemId: r.reform_request_id,
    title: r.title ?? '',
    price: Number(r.min_budget ?? r.max_budget ?? 0),
    avgStar: null,
    reviewCount: null,
    name: r.user?.name ?? '',
    content: r.reform_request_photo?.[0]?.content ?? '',
    wishType: 'REQUEST' as const
  }));
};
