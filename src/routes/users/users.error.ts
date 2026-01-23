import { BasicError } from '../../middleware/error.js';

export class PhoneNumberDuplicateError extends BasicError {
  constructor(description: string) {
    super(400, 'Users_100', '전화번호 중복 오류', description);
  }
}


export class NicknameDuplicateError extends BasicError {
  constructor(description: string) {
    super(409, 'Users_101', '이미 존재하는 닉네임입니다.', description);
  }
}