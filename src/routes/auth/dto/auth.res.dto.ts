// SMS 검증 응답 데이터
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

// SMS 전송 응답 데이터
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

// 로그아웃 응답 데이터
export class LogoutResponse {
  statusCode: number;
  message: string;

  constructor(
    statusCode: number,
    message: string
  ) {
    this.statusCode = statusCode,
    this.message = message
  }
}

// 액세스토큰 갱신 응답 데이터
export class RefreshTokenResponseDto{
  accessToken: string;
  constructor(
    accessToken: string
  ) {
    this.accessToken = accessToken
  }
}

