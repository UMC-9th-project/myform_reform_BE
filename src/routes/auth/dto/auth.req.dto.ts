import { IsString, Matches, MinLength, MaxLength } from 'class-validator'
import { Role } from './auth.dto.js'

export class SendSmsRequestDto {
  /**
   * 인증번호를 받을 휴대폰 번호
   * @pattern ^01[016789]-?\d{3,4}-?\d{4}$
   * @minLength 10
   * @maxLength 13
   * @example "01012345678"
   */
  @IsString()
  @Matches(/^01[016789]-?\d{3,4}-?\d{4}$/, { message: '유효한 휴대폰 번호 형식이 아닙니다.' })
  @MinLength(10)
  @MaxLength(13)
  phoneNumber: string;

  constructor(
    phoneNumber: string,
  ){
    this.phoneNumber = phoneNumber
  }
}

export class VerifySmsRequestDto {
  /**
   * 인증번호를 받은 휴대폰 번호
   * @pattern ^01[016789]-?\d{3,4}-?\d{4}$ 유효한 휴대폰 번호 형식이 아닙니다. (예: 01012345678)
   * @minLength 10 휴대폰 번호가 너무 짧습니다
   * @maxLength 13 휴대폰 번호가 너무 깁니다
   * @example "01012345678"
   */
  phoneNumber: string;
  /**
   * 인증 코드 6자리 숫자
   * @pattern ^[0-9]{6}$ 유효한 인증 코드 형식이 아닙니다 (예: 123456)
   * @minLength 6 인증 코드가 너무 짧습니다
   * @maxLength 6 인증 코드가 너무 깁니다
   * @example "123456"
   */
  code: string;
  
  constructor(
    phoneNumber: string,
    code: string
  ) {
    this.phoneNumber = phoneNumber;
    this.code = code;
  }
}

export class LocalLoginRequestDto {
  email: string;
  password: string;
  role: Role;

  constructor(
    email: string,
    password: string,
    role: Role,
  ){
    this.email = email,
    this.password = password,
    this.role = role
  }
}