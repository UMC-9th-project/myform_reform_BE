export interface ErrorResponse {
  resultType: string;
  error: {
    errorCode?: string;
    reason?: string | null;
    data?: any | null;
  };
  success: null;
}

export interface SuccessResponse<T> {
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
