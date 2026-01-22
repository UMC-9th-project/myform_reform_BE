import { prisma } from '../../config/prisma.config.js';
import { cart, item, Prisma } from '@prisma/client';
import crypto from 'crypto';
import { AddToCartDTO, DeleteItemsDTO } from '../cart/dto/cart.req.dto.js';

export type OptionGroupWithItems = Prisma.option_groupGetPayload<{
  include: { option_item: { select: { option_item_id: true; name: true } } };
}>[];
export type CartWithOptions = Prisma.cartGetPayload<{
  include: { cart_option: { include: { option_item: true } } };
}>[];
export type ItemWithDetails = Prisma.itemGetPayload<{
  include: {
    item_photo: true;
    option_group: { include: { option_item: true } };
    owner: true;
  };
}>;

export async function deleteByCartIds(
  cartIds: DeleteItemsDTO['cartIds']
): Promise<{ count: number }> {
  if (!cartIds || cartIds.length === 0) return { count: 0 };
  return prisma.cart.deleteMany({ where: { cart_id: { in: cartIds } } });
}

export async function findExistingCartIds(
  cartIds: DeleteItemsDTO['cartIds']
): Promise<string[]> {
  if (!cartIds || cartIds.length === 0) return [];
  const rows = await prisma.cart.findMany({
    where: { cart_id: { in: cartIds } },
    select: { cart_id: true }
  });
  return rows.map((r) => r.cart_id);
}

export async function findItemById(
  itemId: string
): Promise<ItemWithDetails | null> {
  return prisma.item.findUnique({
    where: { item_id: itemId },
    include: {
      item_photo: true,
      option_group: { include: { option_item: true } },
      owner: true
    }
  });
}

export async function findExistingOptionItemIds(
  optionItemIds: string[]
): Promise<string[]> {
  if (!optionItemIds || optionItemIds.length === 0) return [];
  const rows = await prisma.option_item.findMany({
    where: { option_item_id: { in: optionItemIds } },
    select: { option_item_id: true }
  });
  return rows.map((r) => r.option_item_id);
}

export function computeOptionsHash(optionItemIds: string[] = []) {
  const normalized = (optionItemIds || []).map((s) => String(s)).sort();
  const payload = JSON.stringify(normalized);
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export async function addItemToCart(
  dto: AddToCartDTO,
  userId: string,
  itemId: string
): Promise<cart> {
  const options_hash = computeOptionsHash(dto.optionItemIds || []) || '';

  return prisma.$transaction(async (tx) => {
    const data = (dto.optionItemIds || []).map((option_item_id) => ({
      option_item_id
    }));

    const cart = await tx.cart.upsert({
      where: {
        user_id_item_id_options_hash: {
          user_id: userId,
          item_id: itemId,
          options_hash: options_hash
        }
      },
      create: (() => {
        const createData: any = {
          item_id: itemId,
          user_id: userId,
          quantity: dto.quantity,
          options_hash: options_hash
        };
        if (data && data.length > 0) {
          createData.cart_option = { createMany: { data } };
        }
        return createData;
      })(),
      update: {
        quantity: { increment: dto.quantity }
      }
    });

    return cart;
  });
}

export async function findCartByUserId(
  userId: string
): Promise<CartWithOptions> {
  if (!userId) return [];

  return prisma.cart.findMany({
    where: { user_id: userId },
    include: {
      cart_option: { include: { option_item: true } }
    }
  });
}

export async function findItemsByIds(
  itemIds: string[]
): Promise<ItemWithDetails[]> {
  if (!itemIds || itemIds.length === 0) return [];
  return prisma.item.findMany({
    where: { item_id: { in: itemIds } },
    include: {
      item_photo: true,
      option_group: { include: { option_item: true } },
      owner: true
    }
  });
}

export async function findOptionGroupsByItemId(
  itemId: string
): Promise<OptionGroupWithItems> {
  if (!itemId) return [];
  return prisma.option_group.findMany({
    where: { item_id: itemId },
    include: { option_item: { select: { option_item_id: true, name: true } } },
    orderBy: { sort_order: 'asc' }
  });
}
