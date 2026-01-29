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

export class BasicError<T = string> extends Error {
  public status: number;
  public code: string;
  public description: T;

  constructor(
    status: number,
    code: string,
    message: string,
    description: T
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.description = description ?? ('No description: 에러 설명이 없습니다.' as T);
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
};

export class S3UploadError extends BasicError {
  constructor(des: string) {
    super(500, 'e-s3', '서버에 사진을 올리는중 오류가 발생했습니다.', des);
  }
};