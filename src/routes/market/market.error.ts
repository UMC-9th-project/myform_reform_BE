import { BasicError } from '../../middleware/error.js';

export class MarketError extends BasicError {
  constructor(message: string, description?: string) {
    super(500, 'MARKET-ERROR', message, description || '');
  }
}

export class ItemNotFoundError extends BasicError {
  constructor(itemId: string) {
    super(404, 'ITEM-NOT-FOUND', '상품을 찾을 수 없습니다.', `Item ID: ${itemId}`);
  }
}

export class ReviewNotFoundError extends BasicError {
  constructor(reviewId: string) {
    super(404, 'REVIEW-NOT-FOUND', '리뷰를 찾을 수 없습니다.', `Review ID: ${reviewId}`);
  }
}
