import * as CartModel from './cart.model.js';
import {
  CartNotFoundError,
  PartialCartNotFoundError
} from '../../middleware/error.js';

export class CartService {
  constructor() {}

  async removeItemsFromCart(cartIds: string[]): Promise<number> {
    const existingIds = await CartModel.findExistingCartIds(cartIds);
    if (existingIds.length === 0) {
      throw new CartNotFoundError();
    }

    if (existingIds.length !== cartIds.length) {
      const missing = cartIds.filter((id) => !existingIds.includes(id));
      throw new PartialCartNotFoundError(missing);
    }

    const result = await CartModel.deleteByCartIds(existingIds);
    return result.count;
  }
}
