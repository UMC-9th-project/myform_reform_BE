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

// Cart 관련 에러
export class CartNotFoundError extends BasicError {
  constructor() {
    super(
      404,
      'CART-404',
      'Cart not found',
      '장바구니 아이템을 찾을 수 없습니다.'
    );
  }
}

export class PartialCartNotFoundError extends BasicError {
  constructor(missingIds: string[]) {
    super(
      404,
      'CART-404-PARTIAL',
      'Some cart items not found',
      `${missingIds.join(',')}에 해당하는 장바구니아이템을 찾을 수 없습니다.`
    );
  }
}

export class ValidationError extends BasicError {
  constructor(description: any) {
    super(400, 'ERR-VALIDATION', 'Validation failed', description);
  }
}

export class ItemNotFoundError extends BasicError {
  constructor(itemId: string) {
    super(
      404,
      'ITEM-404',
      'Item not found',
      `${itemId}에 해당하는 아이템을 찾을 수 없습니다.`
    );
  }
}

export class PartialOptionItemNotFoundError extends BasicError {
  constructor(missingIds: string[]) {
    super(
      404,
      'OPTION_ITEM-404-PARTIAL',
      'Some option items not found',
      `${missingIds.join(',')}에 해당하는 옵션사항을 찾을 수 없습니다.`
    );
  }
}
