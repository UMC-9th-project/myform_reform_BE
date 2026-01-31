import { BasicError } from '../../middleware/error.js';

export class CartNotFoundError extends BasicError {
  constructor() {
    super(
      404,
      'CART-404',
      'Cart not found',
      '장바구니 아이템을 찾을 수 없습니다.'
    );
  }
}

export class PartialCartNotFoundError extends BasicError {
  constructor(missingIds: string[]) {
    super(
      404,
      'CART-404-PARTIAL',
      'Some cart items not found',
      `${missingIds.join(',')}에 해당하는 장바구니아이템을 찾을 수 없습니다.`
    );
  }
}

export class UnauthorizedCartAccessError extends BasicError {
  constructor(cartIds: string[]) {
    super(
      403,
      'CART-403',
      'Unauthorized cart access',
      `${cartIds.join(',')}에 해당하는 장바구니 아이템에 대한 권한이 없거나 존재하지 않습니다.`
    );
  }
}

export class ValidationError extends BasicError {
  constructor(description: any) {
    super(400, 'ERR-VALIDATION', 'Validation failed', description);
  }
}

export class ItemNotFoundError extends BasicError {
  constructor(itemId: string) {
    super(
      404,
      'ITEM-404',
      'Item not found',
      `${itemId}에 해당하는 아이템을 찾을 수 없습니다.`
    );
  }
}

export class PartialOptionItemNotFoundError extends BasicError {
  constructor(missingIds: string[]) {
    super(
      404,
      'OPTION_ITEM-404-PARTIAL',
      'Some option items not found',
      `${missingIds.join(',')}에 해당하는 옵션사항을 찾을 수 없습니다.`
    );
  }
}

export class IncompleteOptionSelectionError extends BasicError {
  constructor(description: any) {
    super(
      422,
      'OPTION-422-INCOMPLETE',
      'Incomplete option selection',
      description
    );
  }
}
