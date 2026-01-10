export interface SendSmsRequest {
  phoneNumber: string;
}

export interface VerifySmsRequest {
  phoneNumber: string;
  code: string;
}

export interface SendSmsResponse {
  statusCode: number;
  message: string;
}

export interface VerifySmsResponse {
  statusCode: number;
  message: string;
}