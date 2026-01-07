export interface ErrorResponse {
  resultType: string;
  error: {
    errorCode?: string;
    reason?: string | null;
    data?: any | null;
  };
  success: null;
}

export interface TsoaResponse<T> {
  resultType: string;
  error: null;
  success: T;
}

export class ResponseHandler<T> {
  resultType: string = 'SUCCESS';
  error = null;
  success: T;

  constructor(success: T) {
    this.success = success;
  }
}

export const commonError = {
  serverError: {
    resultType: 'FAIL',
    error: {
      errorCode: 'ERR-0',
      reason: 'Unknown server error.',
      data: null
    },
    success: null
  } as ErrorResponse,

  badRequest: {
    resultType: 'FAIL',
    error: {
      errorCode: 'ERR-400',
      reason: 'Bad request.',
      data: null
    },
    success: null
  } as ErrorResponse,

  unauthorized: {
    resultType: 'FAIL',
    error: {
      errorCode: 'ERR-401',
      reason: 'Unauthorized.',
      data: null
    },
    success: null
  } as ErrorResponse,

  notFound: {
    resultType: 'FAIL',
    error: {
      errorCode: 'ERR-404',
      reason: 'Resource not found.',
      data: null
    },
    success: null
  } as ErrorResponse
};
