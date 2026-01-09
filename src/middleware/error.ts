import { Request, Response, NextFunction } from 'express';
import { ValidateError } from 'tsoa';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  //커스텀 에러 처리
  if (err instanceof BasicError) {
    res.status(err.status).json({
      resultType: 'FAIL',
      error: {
        errorCode: err.code,
        reason: err.message,
        data: err.description
      },
      success: null
    });

    return;
  }

  //tsoa validation 에러 처리
  if (err instanceof ValidateError) {
    res.status(err.status).json({
      resultType: 'FAIL',
      error: {
        errorCode: err.status,
        reason: err.message,
        data: err.fields
      },
      success: null
    });

    return;
  }

  //기본 에러 처리 (500)
  res.status(500).json({
    resultType: 'FAIL',
    error: {
      errorCode: 'ERR-0',
      reason: err.message || 'Unknown server error.',
      data: null
    },
    success: null
  });
};

export class BasicError extends Error {
  public status: number;
  public code: string;
  public description: string;

  constructor(
    status: number,
    code: string,
    message: string,
    description: string
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.description = description || 'No description: 에러 설명이 없습니다.';
  }
  toJSON() {
    return {
      status: this.status,
      code: this.code,
      message: this.message,
      description: this.description
    };
  }
}

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    resultType: 'FAIL',
    error: {
      errorCode: 'ERR-404',
      reason: 'Not Found',
      data: `Cannot ${req.method} ${req.path}`
    },
    success: null
  });
};

export class CustomExample extends BasicError {
  constructor(description: string) {
    super(400, 'errcode', 'err message', description);
  }
}

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

export class TooManyCodeAttemptsError extends BasicError {
  constructor(description: string) {
    super(429, 'Auth_004', '인증 코드 입력 시도 횟수를 초과했습니다.', description);
  }
}