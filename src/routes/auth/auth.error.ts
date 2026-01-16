import { BasicError } from '../../middleware/error.js';

export class InputValidationError extends BasicError {
  constructor(description: string) {
    super(400, 'Auth_101', '입력 형식이 올바르지 않습니다.', description);
  }
}

export class InvalidCodeError extends BasicError {
  constructor(description: string) {
    super(400, 'Auth_102', '인증 코드가 만료되었거나 존재하지 않습니다.', description);
  }
}
  
export class CodeMismatchError extends BasicError {
  constructor(description: string) {
    super(400, 'Auth_103', '인증 코드가 일치하지 않습니다.', description);
  }
}
  
export class TooManyCodeAttemptsError<T = any> extends BasicError<T> {
  constructor(description: T) {
    super(429, 'Auth_104', '인증 코드 입력 시도 횟수를 초과했습니다.', description);
  }
}

export class SmsProviderError extends BasicError {
  constructor(description: string) {
    super(500, 'Auth_501', 'SMS 전송 중 오류가 발생했습니다.', description);
  }
}
  
export class RedisStorageError extends BasicError {
  constructor(description: string) {
    super(500, 'Auth_502', 'Redis에 인증 정보 저장 중 오류가 발생했습니다.', description);
  }
}

export class UnknownAuthError extends BasicError {
  constructor(description: string) {
    super(500, 'Auth_999', '인증 중 알 수 없는 오류가 발생했습니다.', description);
  }
}

export class UnauthorizedError extends BasicError {
  constructor(description: string) {
    super(401, 'Auth_105', '로그인 되어있지 않습니다.', description);
  }
}

export class KakaoAuthError extends BasicError {
  constructor(description: string) {
    super(400, 'Auth_106', '카카오 로그인 후 회원 정보를 찾을 수 없습니다.', description);
  }
}

export class InvalidStateError extends BasicError {
  constructor(description: string) {
    super(400, 'Auth_107', 'state 값이 유효하지 않습니다. \'user\' 또는 \'reformer\' 중 하나여야 합니다.', description);
  }
}

export class MissingAuthInfoError extends BasicError {
  constructor(description: string) {
    super(500, 'Auth_503', '로그인에 필요한 유저 정보가 누락되었습니다.', description);
  }
}

export class VerificationRequiredError extends BasicError {
  constructor(description: string) {
    super(400, 'Auth_108', '휴대폰 인증이 완료되지 않았거나 만료되었습니다.', description);
  }
}

export class NicknameDuplicateError extends BasicError {
  constructor(description: string) {
    super(409, 'Auth_109', '이미 존재하는 닉네임입니다.', description);
  }
}

export class EmailDuplicateError extends BasicError {
  constructor(description: string) {
    super(409, 'Auth_110', '이미 존재하는 이메일입니다.', description);
  }
}