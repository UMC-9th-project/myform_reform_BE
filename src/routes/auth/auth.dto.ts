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
    role: 'user' | 'reformer';
    auth_status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  };
}

export type KakaoAuthResponse = KakaoSignupResponse | KakaoLoginResponse

export interface JwtPayload {
  id: string;
  email: string;
  role: 'user' | 'reformer';
  auth_status?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface LogoutResponse {
  statusCode: number;
  message: string;
}

export interface PassportUserInfo {
  status: 'signup' | 'login';
  role: 'user' | 'reformer';
  kakaoId?: string;
  email?: string;
  id?: string;
  auth_status?: 'PENDING' | 'APPROVED' | 'REJECTED';
}