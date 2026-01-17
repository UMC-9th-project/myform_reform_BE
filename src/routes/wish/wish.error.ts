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

export class OwnerReqForbiddenError extends BasicError {
  constructor() {
    super(
      403,
      'Wish-403',
      'RoleForbiddenError',
      'OWNER는 REQUEST 타입만 생성할 수 있습니다.'
    );
  }
}

export class UnknownRoleError extends BasicError {
  constructor() {
    super(400, 'Wish-400', 'UnknownRole', '알 수 없는 사용자입니다.');
  }
}
