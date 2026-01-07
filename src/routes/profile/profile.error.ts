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

export class ItemAddError extends BasicError {
  constructor(des: string) {
    super(400, 'e400', '아이템 등록 오류', des);
  }
}
