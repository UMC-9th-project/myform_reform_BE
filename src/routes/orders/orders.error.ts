import { BasicError } from '../../middleware/error.js';

export class OrderError extends BasicError {
  constructor(message: string, description?: string) {
    super(500, 'ORDER-ERROR', message, description || '');
  }
}

export class OrderNotFoundError extends BasicError {
  constructor(orderId: string) {
    super(404, 'ORDER-NOT-FOUND', '주문을 찾을 수 없습니다.', `Order ID: ${orderId}`);
  }
}

export class ItemNotFoundError extends BasicError {
  constructor(itemId: string) {
    super(404, 'ITEM-NOT-FOUND', '상품을 찾을 수 없습니다.', `Item ID: ${itemId}`);
  }
}

export class InsufficientStockError extends BasicError {
  constructor(itemName: string, description?: string) {
    super(400, 'INSUFFICIENT-STOCK', '재고가 부족합니다.', description || `Item: ${itemName}`);
  }
}

export class PaymentError extends BasicError {
  constructor(message: string, description?: string) {
    super(500, 'PAYMENT-ERROR', message, description || '');
  }
}

export class PaymentVerificationError extends BasicError {
  constructor(message: string, description?: string) {
    super(400, 'PAYMENT-VERIFICATION-ERROR', message, description || '');
  }
}

export class PaymentAmountMismatchError extends BasicError {
  constructor(expected: number, actual: number) {
    super(
      400,
      'PAYMENT-AMOUNT-MISMATCH',
      '결제 금액이 일치하지 않습니다.',
      `예상 금액: ${expected}, 실제 금액: ${actual}`
    );
  }
}
