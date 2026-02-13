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
export class LogoutResponseDto {
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

// 계정 삭제 응답 데이터
export class WithdrawResponseDto {
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

// 공통 인증 응답 dto
export class AuthPublicResponseDto{
  accessToken: string;
  constructor(
    accessToken: string
  ){
    this.accessToken = accessToken
  }
}