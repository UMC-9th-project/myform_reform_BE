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
