import { BasicError } from '../../middleware/error.js';

export class UserReqForbiddenError extends BasicError {
  constructor() {
    super(
      403,
      'Wish-403',
      'RoleForbiddenError',
      'USER는 REQUEST 타입을 생성할 수 없습니다.'
    );
  }
}

export class ReformerReqForbiddenError extends BasicError {
  constructor() {
    super(
      403,
      'Wish-403',
      'RoleForbiddenError',
      'REFORMER는 REQUEST 타입만 생성할 수 있습니다.'
    );
  }
}

export class UnknownRoleError extends BasicError {
  constructor() {
    super(400, 'Wish-400', 'UnknownRole', '알 수 없는 사용자입니다.');
  }
}

export class WishNotFoundError extends BasicError {
  constructor() {
    super(404, 'Wish-404', 'WishNotFound', '삭제할 위시를 찾을 수 없습니다.');
  }
}
