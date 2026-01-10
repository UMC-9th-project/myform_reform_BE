import { prisma } from '../../config/prisma.config.js';

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

export default {};
