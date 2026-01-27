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

export class UnauthorizedError extends BasicError {
  constructor(description: string) {
    super(401, 'Auth_105', '로그인 되어있지 않습니다.', description);
  }
}

export class KakaoAuthError extends BasicError {
  constructor(description: string) {
    super(400, 'Auth_106', '카카오 로그인 처리 중 오류가 발생했습니다.', description);
  }
}

export class InvalidStateError extends BasicError {
  constructor(description: string) {
    super(400, 'Auth_107', 'state 값이 유효하지 않습니다. \'user\' 또는 \'reformer\' 중 하나여야 합니다.', description);
  }
}

export class VerificationRequiredError extends BasicError {
  constructor(description: string) {
    super(400, 'Auth_108', '휴대폰 인증이 완료되지 않았거나 만료되었습니다.', description);
  }
}


export class InvalidDescriptionLengthError extends BasicError {
  constructor(description: string) {
    super(400, 'Auth_109', '자기 소개 설명은 1자 이상 500자 이하로 입력해주세요.', description);
  }
}

export class EmailDuplicateError extends BasicError {
  constructor(description: string) {
    super(409, 'Auth_110', '이미 존재하는 이메일입니다.', description);
  }
}

export class InvalidPhotoNumberError extends BasicError {
  constructor(description: string) {
    super(400, 'Auth_111', '입력한 사진의 개수가 올바르지 않습니다.', description);
  }
}

export class InvalidBusinessNumberError extends BasicError {
  constructor(description: string) {
    super(400, 'Auth_112', '입력한 사업자 번호의 형식이 올바르지 않습니다.', description);
  }
}

export class AccountNotFoundError extends BasicError {
  constructor(description: string) {
    super(404, 'Auth_113', '존재하지 않는 계정입니다.', description);
  }
}

export class passwordInvalidError extends BasicError {
  constructor(description: string) {
    super(400, 'Auth_114', '비밀번호가 일치하지 않습니다.', description);
  }
}

export class SocialAccountDuplicateError extends BasicError {
  constructor(description: string) {
    super(409, 'Auth_115', '이미 존재하는 소셜 계정입니다.', description);
  }
}

export class ForbiddenError extends BasicError {
  constructor(description: string) {
    super(403, 'Auth_116', '해당 리소스에 접근 권한이 없습니다.', description);
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

export class MissingAuthInfoError extends BasicError {
  constructor(description: string) {
    super(500, 'Auth_503', '로그인에 필요한 유저 정보가 누락되었습니다.', description);
  }
}

export class RefreshTokenError extends BasicError {
  constructor(description: string) {
    super(500, 'Auth_504', '리프레시 토큰 재발급 실패', description);
  }
}


export class UnknownAuthError extends BasicError {
  constructor(description: string) {
    super(500, 'Auth_999', '인증 중 알 수 없는 오류가 발생했습니다.', description);
  }
}
