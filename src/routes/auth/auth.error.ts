import { BasicError } from '../../middleware/error.js';

export class InputValidationError extends BasicError {
  constructor(description: string) {
    super(400, 'Auth_001', '입력 형식이 올바르지 않습니다.', description);
  }
}
  
export class SmsProviderError extends BasicError {
  constructor(description: string) {
    super(500, 'Auth_002', 'SMS 전송 중 오류가 발생했습니다.', description);
  }
}
  
export class RedisStorageError extends BasicError {
  constructor(description: string) {
    super(500, 'Auth_003', 'Redis에 인증 정보 저장 중 오류가 발생했습니다.', description);
  }
}
  
export class TooManyCodeAttemptsError<T = any> extends BasicError<T> {
  constructor(description: T) {
    super(429, 'Auth_004', '인증 코드 입력 시도 횟수를 초과했습니다.', description);
  }
}
  
export class InvalidCodeError extends BasicError {
  constructor(description: string) {
    super(400, 'Auth_005', '인증 코드가 만료되었거나 존재하지 않습니다.', description);
  }
}
  
export class CodeMismatchError extends BasicError {
  constructor(description: string) {
    super(400, 'Auth_006', '인증 코드가 일치하지 않습니다.', description);
  }
}
  
export class UnknownAuthError extends BasicError {
  constructor(description: string) {
    super(500, 'Auth_999', '인증 중 알 수 없는 오류가 발생했습니다.', description);
  }
}