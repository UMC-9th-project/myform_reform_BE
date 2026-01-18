import * as cartModel from './cart.model.js';
import { CartWithOptions, ItemWithDetails } from './cart.model.js';
import { DeleteItemsDTO, AddToCartDTO } from './dto/cart.req.dto.js';
import {
  CreateCartResDTO,
  CartGroupedResDTO,
  SellerCartDTO,
  CartItemDTO,
  OptionDTO
} from './dto/cart.res.dto.js';
import {
  CartNotFoundError,
  PartialCartNotFoundError,
  ItemNotFoundError,
  PartialOptionItemNotFoundError,
  IncompleteOptionSelectionError
} from '../../routes/cart/cart.error.js';

export class CartService {
  constructor() {}

  async removeItemsFromCart(req: DeleteItemsDTO): Promise<number> {
    const cartIds = req.cartIds || [];
    await this.validateExistingCartIds(cartIds);

    const result = await cartModel.deleteByCartIds(cartIds);
    return result.count;
  }

  async addItemToCart(
    itemId: string,
    userId: string,
    req: AddToCartDTO
  ): Promise<CreateCartResDTO> {
    const item = await cartModel.findItemById(itemId);
    if (!item) {
      throw new ItemNotFoundError(itemId);
    }

    await this.validateCartOptions(itemId, req.optionItemIds || []);

    // 모델에서 options_hash 기반으로 atomically create-or-increment 처리
    const cart = await cartModel.addItemToCart(req, userId, itemId);
    return {
      cartId: cart.cart_id,
      createdAt: new Date()
    };
  }

  async getCartByUser(userId: string): Promise<CartGroupedResDTO> {
    const rows = await cartModel.findCartByUserId(userId);
    if (rows.length === 0) return [];

    const itemsMap = await this.getItemsMapFromCartRows(rows);

    return this.assembleCartResponse(rows, itemsMap);
  }

  // Private Helper Methods
  private async validateExistingCartIds(cartIds: string[]): Promise<void> {
    if (cartIds.length === 0) return;

    const existingIds = await cartModel.findExistingCartIds(cartIds);
    if (existingIds.length === 0) throw new CartNotFoundError();
    if (existingIds.length !== cartIds.length) {
      const missing = cartIds.filter((id) => !existingIds.includes(id));
      throw new PartialCartNotFoundError(missing);
    }
  }

  private async validateCartOptions(
    itemId: string,
    optionItemIds: string[]
  ): Promise<void> {
    if (optionItemIds && optionItemIds.length > 0) {
      const existing = await cartModel.findExistingOptionItemIds(optionItemIds);
      if (existing.length !== optionItemIds.length) {
        const missing = optionItemIds.filter((id) => !existing.includes(id));
        throw new PartialOptionItemNotFoundError(missing);
      }
    }

    // option_group별로 모든 옵션이 하나씩 선택되었는지 검증
    const groups = await cartModel.findOptionGroupsByItemId(itemId);
    if (groups && groups.length > 0) {
      const provided = optionItemIds || [];
      const providedSet = new Set(provided);
      const missingGroups: any[] = [];
      const multiSelectedGroups: any[] = [];

      for (const g of groups) {
        const optionIds = (g.option_item || []).map(
          (oi: any) => oi.option_item_id
        );
        const matches = optionIds.filter((oid: string) => providedSet.has(oid));
        if (matches.length === 0) {
          missingGroups.push({
            groupId: g.option_group_id,
            groupName: g.name || null
          });
        } else if (matches.length > 1) {
          multiSelectedGroups.push({
            groupId: g.option_group_id,
            groupName: g.name || null,
            selected: matches
          });
        }
      }

      if (missingGroups.length > 0 || multiSelectedGroups.length > 0) {
        const parts: string[] = [];
        if (missingGroups.length > 0) {
          parts.push(
            `다음 옵션 그룹에서 선택이 필요합니다: ${missingGroups.map((m) => m.groupName || m.groupId).join(',')}`
          );
        }
        if (multiSelectedGroups.length > 0) {
          parts.push(
            `다음 옵션 그룹에는 하나만 선택해야 합니다: ${multiSelectedGroups.map((m) => m.groupName || m.groupId).join(',')}`
          );
        }
        throw new IncompleteOptionSelectionError(parts.join(' | '));
      }
    }
  }

  private async getItemsMapFromCartRows(
    rows: CartWithOptions
  ): Promise<Map<string, ItemWithDetails>> {
    const itemIds = Array.from(new Set(rows.map((r) => r.item_id))).filter(
      (id): id is string => id !== null
    );
    const items = await cartModel.findItemsByIds(itemIds);
    return new Map(items.map((it) => [it.item_id, it]));
  }

  private assembleCartResponse(
    rows: CartWithOptions,
    itemsMap: Map<string, ItemWithDetails>
  ): CartGroupedResDTO {
    const sellersMap = new Map<string, SellerCartDTO>();

    for (const row of rows) {
      const item = row.item_id ? (itemsMap.get(row.item_id) ?? null) : null;
      const owner = (item as any)?.owner || null;
      const ownerId = owner?.owner_id || 'unknown';

      if (!sellersMap.has(ownerId)) {
        sellersMap.set(
          ownerId,
          this.createInitialSellerDTO(ownerId, owner?.name)
        );
      }

      const seller = sellersMap.get(ownerId)!;
      seller.items.push(this.mapToCartItemDTO(row, item));
    }

    return this.finalizeSellerGroups(Array.from(sellersMap.values()));
  }
  private mapToCartItemDTO(
    row: CartWithOptions[number],
    item: ItemWithDetails | null
  ): CartItemDTO {
    return {
      cartId: row.cart_id,
      itemId: item?.item_id || null,
      title: item?.title || null,
      imageUrl:
        (item?.item_photo || []).find((p: any) => p.photo_order === 1)
          ?.content || null,
      price: item?.price ? Number(item.price) : 0,
      quantity: row.quantity || 0,
      delivery: item?.delivery ? Number(item.delivery) : 0,
      options: this.mapToOptionDTOs(row.cart_option || [])
    };
  }

  /**
   * 장바구니 옵션 데이터를 OptionDTO 배열로 변환
   */
  private mapToOptionDTOs(
    cartOptions: CartWithOptions[number]['cart_option']
  ): OptionDTO[] {
    return cartOptions.map((co) => ({
      option_item_id: co.option_item?.option_item_id || null,
      name: co.option_item?.name || null,
      extra_price: co.option_item?.extra_price || 0
    }));
  }

  /**
   * 판매자 그룹별 배송비 최대값 산출 및 최종 데이터 정리
   */
  private finalizeSellerGroups(sellers: SellerCartDTO[]): CartGroupedResDTO {
    return sellers.map((s) => ({
      ...s,
      deliveryFee: Math.max(...s.items.map((it) => it.delivery), 0),
      total: s.items.length
    }));
  }

  private createInitialSellerDTO(
    ownerId: string,
    ownerName?: string
  ): SellerCartDTO {
    return {
      ownerId,
      ownerName: ownerName || null,
      items: [],
      deliveryFee: 0,
      total: 0
    };
  }
}
