import { prisma } from '../../config/prisma.config.js';
import crypto from 'crypto';

export async function deleteByCartIds(cartIds: string[]) {
  if (!cartIds || cartIds.length === 0) return { count: 0 };
  return prisma.cart.deleteMany({ where: { cart_id: { in: cartIds } } });
}

export async function findExistingCartIds(cartIds: string[]) {
  if (!cartIds || cartIds.length === 0) return [];
  const rows = await prisma.cart.findMany({
    where: { cart_id: { in: cartIds } },
    select: { cart_id: true }
  });
  return rows.map((r) => r.cart_id);
}

export async function findItemById(itemId: string) {
  return prisma.item.findUnique({ where: { item_id: itemId } });
}

export async function findExistingOptionItemIds(optionItemIds: string[]) {
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
  itemId: string,
  userId: string,
  quantity = 1,
  optionItemIds: string[] = []
) {
  const options_hash = computeOptionsHash(optionItemIds || []) || '';

  return prisma.$transaction(async (tx) => {
    const data = (optionItemIds || []).map((option_item_id) => ({ option_item_id }));

    const cart = await tx.cart.upsert({
      where: {
        user_id_item_id_options_hash: {
          user_id: userId,
          item_id: itemId,
          options_hash: options_hash
        }
      },
      create: {
        item_id: itemId,
        user_id: userId,
        quantity: quantity,
        options_hash: options_hash,
        cart_option: {
          createMany: { data }
        }
      },
      update: {
        quantity: { increment: quantity }
      }
    });

    return cart;
  });
}
