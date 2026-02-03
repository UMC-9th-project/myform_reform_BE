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