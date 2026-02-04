import { ErrorResponse } from '../../config/tsoaResponse.js';
import { BasicError } from '../../middleware/error.js';

export const profileError = {
  testError: {
    resultType: 'FAIL',
    error: {
      errorCode: 'ERR-0',
      reason: 'Unknown server error.',
      data: null
    },
    success: null
  } as ErrorResponse
};


export class ReviewNotFoundError extends BasicError {
  constructor(description: string) {
    super(404, 'Reviews_101', '리뷰를 찾을 수 없습니다.', description);
  }
};

export class NotReviewOwnerError extends BasicError {
  constructor(description: string) {
    super(403, 'Reviews_102', '권한이 없어 리뷰를 삭제할 수 없습니다. 리뷰 작성자가 아닙니다.', description);
  }
};