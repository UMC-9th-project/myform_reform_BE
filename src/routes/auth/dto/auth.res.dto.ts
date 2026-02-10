export class VerifySmsResponseDto {
  statusCode: number;
  message: string;

  constructor(
    statusCode: number,
    message: string
  ) {
    this.statusCode = statusCode;
    this.message = message;
  }
}

export class SendSmsResponseDto {
  statusCode: number;
  message: string;

  constructor(
    statusCode: number,
    message: string
  ) {
    this.statusCode = statusCode;
    this.message = message
  }
}
