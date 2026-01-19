import { BasicError } from '../../middleware/error.js';

export class ReformError extends BasicError {
  constructor(des: string) {
    super(500, 'err-reform', '리폼라우터 서버 오류가 발생했습니다', des);
  }
}

export class ReformDBError extends BasicError {
  constructor(des: string) {
    super(500, 'err-DB', '리폼라우터 서버 오류가 발생했습니다', des);
  }
}
