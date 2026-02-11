export class SendSmsRequest {
  /**
   * 인증번호를 받을 휴대폰 번호
   * @pattern ^01[016789]-?\d{3,4}-?\d{4}$ 유효한 휴대폰 번호 형식이 아닙니다 (예: 01012345678)
   * @minLength 10 휴대폰 번호가 너무 짧습니다
   * @maxLength 13 휴대폰 번호가 너무 깁니다
   * @example "01012345678"
   */
  phoneNumber!: string;
}

export class VerifySmsRequest {
  /**
   * 인증번호를 받은 휴대폰 번호
   * @pattern ^01[016789]-?\d{3,4}-?\d{4}$ 유효한 휴대폰 번호 형식이 아닙니다. (예: 01012345678)
   * @minLength 10 휴대폰 번호가 너무 짧습니다
   * @maxLength 13 휴대폰 번호가 너무 깁니다
   * @example "01012345678"
   */
  phoneNumber!: string;
  /**
   * 인증 코드 6자리 숫자
   * @pattern ^[0-9]{6}$ 유효한 인증 코드 형식이 아닙니다 (예: 123456)
   * @minLength 6 인증 코드가 너무 짧습니다
   * @maxLength 6 인증 코드가 너무 깁니다
   * @example "123456"
   */
  code!: string;
}

export type AuthStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type Role = 'user' | 'reformer';
export type RegistrationType = 'LOCAL' | 'KAKAO';

export class SendSmsResponse {
  statusCode!: number;
  message!: string;
}

export class VerifySmsResponse {
  statusCode!: number;
  message!: string;
}

export class KakaoSignupResponse {
  status!: 'signup';
  user!: {
    kakaoId: string;
    email: string;
    role: string;
    redirectUrl?: string;
  };
}

export class AuthLoginResponse {
  accessToken!: string;
  refreshToken!: string;
}

export class KakaoLoginResponse extends AuthLoginResponse {
  status!: 'login';
}

// 카카오 인증 응답 데이터
export type KakaoAuthResponse = KakaoSignupResponse | KakaoLoginResponse

export class JwtPayload {
  id!: string;
  role!: Role;
  auth_status?: AuthStatus;
}

export class LogoutResponse {
  statusCode!: number;
  message!: string;
}

export class PassportUserInfo {
  status!: 'signup' | 'login';
  role!: Role;
  kakaoId?: string;
  email?: string;
  id?: string;
  auth_status?: AuthStatus;
  redirectUrl?: string;
}

export class LoginResponse {
  accessToken!: string;
  refreshToken!: string;
}

// 일반 회원가입 요청 데이터 (Controller -> Service)
export class UserSignupRequest {
  name!: string;
  email!: string;
  nickname!: string;
  phoneNumber!: string;
  registration_type!: RegistrationType;
  oauthId?: string;
  password?: string;
  over14YearsOld!: boolean;
  termsOfService!: boolean;
  privacyPolicy!: boolean;
}

// 일반 회원가입 요청 데이터 (Controller -> Service)
export class UserCreateDto {
  name!: string;
  email!: string;
  registration_type!: RegistrationType;
  oauthId?: string;
  hashedPassword?: string;
  nickname!: string;
  phoneNumber!: string;
  role!: Role;
  privacyPolicy!: boolean;
}

export class UserCreateResponseDto {
  id!: string;
  email!: string;
  nickname!: string;
  role!: Role;
}

// 리폼러 회원가입 요청 데이터 (Controller -> Service)
export class ReformerSignupRequest extends UserSignupRequest {
  businessNumber?: string;
  description!: string;
  portfolioPhotos!: string[];
}

// 리폼러 db 생성 요청 데이터 (Service -> Model)
export class OwnerCreateDto extends UserCreateDto {
  businessNumber?: string;
  description!: string;
  portfolioPhotos!: string[];
}

export class OwnerCreateResponseDto extends UserCreateResponseDto {
  auth_status!: AuthStatus;
}

// 로그인 요청 데이터 (Controller -> Service)
export class LocalLoginRequest {
  email!: string;
  password!: string;
  role!: Role;
}

// 리프레시 토큰 갱신 요청 데이터 (Controller -> Service)
export class RefreshTokenRequest {
  refreshToken!: string;
}

export class RefreshTokenResponse {
  accessToken!: string;
  refreshToken!: string;
}

export class AuthPublicResponse {
  accessToken!: string;
}

export class RefreshTokenPublicResponse {
  accessToken!: string;
}