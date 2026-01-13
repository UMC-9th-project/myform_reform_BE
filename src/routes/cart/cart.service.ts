import { Prisma } from '@prisma/client';
import * as cartModel from './cart.model.js';
import {
  CartNotFoundError,
  PartialCartNotFoundError,
  ItemNotFoundError,
  PartialOptionItemNotFoundError
} from '../../routes/cart/cart.error.js';

export class CartService {
  constructor() {}

  async removeItemsFromCart(cartIds: string[]): Promise<number> {
    const existingIds = await cartModel.findExistingCartIds(cartIds);
    if (existingIds.length === 0) {
      throw new CartNotFoundError();
    }

    if (existingIds.length !== cartIds.length) {
      const missing = cartIds.filter((id) => !existingIds.includes(id));
      throw new PartialCartNotFoundError(missing);
    }

    const result = await cartModel.deleteByCartIds(existingIds);
    return result.count;
  }

  async addItemToCart(
    itemId: string,
    userId: string,
    quantity = 1,
    optionItemIds: string[] = []
  ) {
    const item = await cartModel.findItemById(itemId);
    if (!item) {
      throw new ItemNotFoundError(itemId);
    }

    if (optionItemIds && optionItemIds.length > 0) {
      const existing = await cartModel.findExistingOptionItemIds(optionItemIds);
      if (existing.length !== optionItemIds.length) {
        const missing = optionItemIds.filter((id) => !existing.includes(id));
        throw new PartialOptionItemNotFoundError(missing);
      }
    }

    // 모델에서 options_hash 기반으로 atomically create-or-increment 처리
    const cart = await cartModel.addItemToCart(
      itemId,
      userId,
      quantity,
      optionItemIds
    );
    return cart;
  }

  async getCartByUser(userId: string) {
    const rows = await cartModel.findCartByUserId(userId);

    const itemIds = Array.from(
      new Set(rows.map((r: any) => r.item_id).filter(Boolean))
    );
    const items = await cartModel.findItemsByIds(itemIds);
    const itemsMap = new Map(items.map((it: any) => [it.item_id, it]));

    // 판매자별 그룹핑
    const sellersMap = new Map<string, any>();

    for (const row of rows) {
      const item = itemsMap.get(row.item_id) || null;
      const owner = item?.owner || null;
      const ownerId = owner?.owner_id || 'unknown';

      if (!sellersMap.has(ownerId)) {
        sellersMap.set(ownerId, {
          ownerId,
          ownerName: owner?.name || null,
          items: [] as any[]
        });
      }

      const seller = sellersMap.get(ownerId);

      const price = item?.price ? Number(item.price) : 0;
      const quantity = row.quantity || 0;
      const delivery = item?.delivery ? Number(item.delivery) : 0;

      const options = (row.cart_option || []).map((co: any) => {
        const oi = co.option_item || null;
        return {
          option_item_id: oi?.option_item_id || null,
          name: oi?.name || null,
          extra_price: oi?.extra_price || 0
        };
      });

      seller.items.push({
        cartId: row.cart_id,
        itemId: item?.item_id || null,
        title: item?.title || null,
        price,
        quantity,
        delivery,
        options
      });
    }

    const sellers = Array.from(sellersMap.values()).map((s: any) => {
      // 동일판매자 묶음배송시 배송비는 최대값 하나만 적용
      const deliveryFee = Math.max(
        ...s.items.map((it: any) => it.delivery || 0),
        0
      );
      const total = (s.items || []).length;
      return { ...s, deliveryFee, total };
    });

    return sellers;
  }
}
