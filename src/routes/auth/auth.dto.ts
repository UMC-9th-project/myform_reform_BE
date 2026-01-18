export interface SendSmsRequest {
  /**
   * 인증번호를 받을 휴대폰 번호
   * @pattern ^01[016789]-?\d{3,4}-?\d{4}$ 유효한 휴대폰 번호 형식이 아닙니다 (예: 01012345678)
   * @minLength 10 휴대폰 번호가 너무 짧습니다
   * @maxLength 13 휴대폰 번호가 너무 깁니다
   * @example "01012345678"
   */
  phoneNumber: string;
}

export interface VerifySmsRequest {
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
}

export type AuthStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type Role = 'user' | 'reformer';
export type RegistrationType = 'LOCAL' | 'KAKAO';

export interface SendSmsResponse {
  statusCode: number;
  message: string;
}

export interface VerifySmsResponse {
  statusCode: number;
  message: string;
}

export interface KakaoSignupResponse {
  status: 'signup';
  user: {
    kakaoId: string;
    email: string;
    role: string;
  };
}

export interface KakaoLoginResponse {
  status: 'login';
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: Role;
    auth_status?: AuthStatus;
  };
}

export type KakaoAuthResponse = KakaoSignupResponse | KakaoLoginResponse

export interface JwtPayload {
  id: string;
  email: string;
  role: Role;
  auth_status?: AuthStatus;
}

export interface LogoutResponse {
  statusCode: number;
  message: string;
}

export interface PassportUserInfo {
  status: 'signup' | 'login';
  role: Role;
  kakaoId?: string;
  email?: string;
  id?: string;
  auth_status?: AuthStatus;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ReformerSignupRequest extends UserSignupRequest {
  businessNumber: string;
  description: string;
}

// Controller -> Service 전달할 유저 데이터
export interface UserSignupRequest {
  name: string;
  email: string;
  nickname: string;
  phoneNumber: string;
  registration_type: RegistrationType;
  oauthId?: string;
  password?: string;
  over14YearsOld: boolean;
  termsOfService: boolean;
  privacyPolicy: boolean;
  role: Role;
}

// Service -> Controller 반환할 유저 데이터
export interface UserSignupResponse {
  user: {
    id: string;
    email: string;
    nickname: string;
    role: Role;
  };
  accessToken: string;
  refreshToken: string;
}

// Service -> Model 전달할 유저 데이터
export interface UserCreateDto {
  name: string;
  email: string;
  registration_type: RegistrationType;
  oauthId?: string;
  hashedPassword?: string;
  nickname: string;
  phoneNumber: string;
  role: Role;
  privacyPolicy: boolean;
}

// Model -> Service 반환할 유저 데이터
export interface UserCreateResponseDto {
  id: string;
  email: string;
  nickname: string;
  role: Role;
}

// Controller -> Service 전달할 리폼러 데이터
export interface ReformerSignupRequest extends UserSignupRequest {
  businessNumber: string;
  description: string;
}

// Service -> Controller 반환할 리폼러 데이터
export interface ReformerSignupResponse {
  user: {
    id: string;
    email: string;
    nickname: string;
    role: Role;
    auth_status: AuthStatus;
  };
  accessToken: string;
  refreshToken: string;
}

export interface OwnerCreateDto extends UserCreateDto {
  businessNumber: string;
  description: string;
  portfolioPhotos: string[];
}

export interface OwnerCreateResponseDto extends UserCreateResponseDto {
  auth_status: AuthStatus;
}