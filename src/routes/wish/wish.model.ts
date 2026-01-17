import prisma from '../../config/prisma.config.js';
import type { owner_wish, Prisma, user_wish } from '@prisma/client';

// type UserWishPayload = Prisma.user_wishGetPayload<{}>;
// type OwnerWishPayload = Prisma.owner_wishGetPayload<{}>;

export const createUserWish = async (
  userId: string,
  targetType: string,
  targetId: string
): Promise<user_wish> => {
  return prisma.user_wish.create({
    data: {
      user_id: userId,
      target_type: targetType as 'PROPOSAL' | 'ITEM',
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
  targetType: string,
  targetId: string
): Promise<user_wish | null> => {
  const found = await prisma.user_wish.findFirst({
    where: {
      user_id: userId,
      target_type: targetType as 'PROPOSAL' | 'ITEM',
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
