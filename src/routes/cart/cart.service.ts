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
}
