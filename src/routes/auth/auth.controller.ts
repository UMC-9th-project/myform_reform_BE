import {
  Route,
  Controller,
  Post,
  Get,
  SuccessResponse,
  Body,
  Response,
  Example,
  Tags,
  Request,
  Query,
  Security,
  Delete
} from 'tsoa';
import {
  TsoaResponse,
  ResponseHandler,
  ErrorResponse
} from '../../config/tsoaResponse.js';
import { AuthService } from './auth.service.js';
import {
  Role
} from './dto/auth.dto.js';
import {
  VerifySmsResponseDto,
  SendSmsResponseDto,
  AuthPublicResponseDto,
  LogoutResponseDto,
  WithdrawResponseDto
} from './dto/auth.res.dto.js';

import {
  ReformerSignupRequestDto,
  UserSignupRequestDto
} from './dto/auth.req.dto.js';
import {
  PassportUserInfo
} from './auth.model.js';
import { Request as ExRequest } from 'express';
import {
  VerifySmsRequestDto,
  SendSmsRequestDto,
  LocalLoginRequestDto
} from './dto/auth.req.dto.js';
import express from 'express';
import passport from './passport.js';
import { KakaoAuthError, UnauthorizedError } from './auth.error.js';

@Route('auth')
@Tags('인증 기능')
export class AuthController extends Controller {
  private authService = new AuthService();
  /**
   * 입력한 휴대폰 번호로 인증 코드를 발송합니다.
   *
   * @summary 입력한 휴대폰 번호로 인증 코드를 발송합니다.
   * @returns 인증 코드 발송 성공 여부
   *
   */
  @SuccessResponse(200, 'SMS 전송 완료')
  @Example<ResponseHandler<SendSmsResponseDto>>({
    resultType: 'SUCCESS',
    error: null,
    success: { statusCode: 200, message: 'SMS 전송이 완료되었습니다.' }
  })

  @Response<ErrorResponse>('400', '전화번호 형식 오류')
  @Response<ErrorResponse>('429', '인증 시도 횟수 초과')
  @Response<ErrorResponse>('500', '서버 내부 오류')

  @Post('sms/send')
  public async sendSms(
    @Body() requestBody: SendSmsRequestDto): Promise<TsoaResponse<SendSmsResponseDto>> {
    await this.authService.sendSms(requestBody.phoneNumber);
    return new ResponseHandler<SendSmsResponseDto>({
      statusCode: 200,
      message: 'SMS 전송이 완료되었습니다.'
    });
  }
  /**
   * 
   * @summary 인증 코드를 검증합니다.
   * @description 입력한 휴대폰 번호와 인증 코드를 검증합니다.
   * @returns 인증 코드 검증 결과
   *
   */
  @SuccessResponse(200, '인증 코드 검증 성공')
  @Example<ResponseHandler<VerifySmsResponseDto>>({
    resultType: 'SUCCESS',
    error: null,
    success: { statusCode: 200, message: '인증이 성공적으로 완료되었습니다.' }
  })
  @Response<ErrorResponse>('429', '인증 시도 횟수 초과')
  @Response<ErrorResponse>('400', '인증 코드 불일치 및 형식 오류, 만료 또는 부재')
  @Response<ErrorResponse>('500', '서버 내부 오류')
  @Post('sms/verify')
  public async verifySms(
    @Body() requestBody: VerifySmsRequestDto): Promise<TsoaResponse<VerifySmsResponseDto>> {
    await this.authService.verifySms(requestBody.phoneNumber, requestBody.code);
    return new ResponseHandler<VerifySmsResponseDto>({
      statusCode: 200,
      message: '인증이 성공적으로 완료되었습니다.'
    });
  }

  /**
   * 
   * @summary 카카오 로그인 시작 (카카오 로그인 페이지로 리다이렉트)
   * @description 카카오 로그인 페이지로 리다이렉트, state에 mode 값을 전달하여 로그인 모드 구분
   * @param mode 로그인 모드 (user: 일반, reformer: 리폼러)
   * 
   */

  @Response<ErrorResponse>('400', '입력한 mode의 값이 유효하지 않습니다.')
  @Response<ErrorResponse>('500', '서버 내부 오류')
  @SuccessResponse(302, '카카오 로그인 페이지로 리다이렉트')
  @Get('kakao')
  public async loginWithKakao(
    @Request() request: express.Request,
    @Query() mode: Role,
    @Query() redirectUrl?: string
  ): Promise<void> {
    const res = (request as any).res as express.Response;
    const next = (request as any).next as express.NextFunction;
    const stateData = {
      mode,
      redirectUrl
    }
    const state = JSON.stringify(stateData);
    // 카카오 로그인 페이지로 리다이렉트, state에 mode 값을 전달하여 로그인 모드 구분
    passport.authenticate('kakao', { session: false, state: state })(request, res, next);
  }

  /**
   * 
   * @summary 카카오 로그인 콜백 (카카오 인증 후 회원 정보 조회)
   * @description 카카오 인증 후 회원 정보 조회 후 로그인 처리 및 회원가입 필요 시 회원가입 필요 정보 리턴
   * 
   */
  @SuccessResponse(200, '카카오 로그인 성공')
  @Response<ErrorResponse>('400', '입력한 mode의 값이 유효하지 않습니다.')
  @Response<ErrorResponse>('401', '카카오 인증에 성공했으나 유저 정보를 가져오지 못했습니다.')
  @Response<ErrorResponse>('500', '서버 내부 오류')
  @Get('kakao/callback')
  public async kakaoCallback(@Request() request: express.Request): Promise<void> {
    const res = request.res as express.Response;
    try {
      const user = await this.authenticateKakao(request, res);
      const result = await this.authService.handleKakaoLogin(user);
      if (result.status == 'login') {
        const loginUrl = `${process.env.FRONTEND_BASE_URL}/login/callback`
        const redirectWithToken = `${loginUrl}?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}&redirectUrl=${user.redirectUrl ?? ''}`;
        return res.redirect(redirectWithToken);
      }

      if (result.status == 'signup') {
        const { role, kakaoId, email, redirectUrl } = result.user;
        const signupUrl = `${process.env.FRONTEND_BASE_URL}/kakao/signup`
        const redirectWithSignupInfo = `${signupUrl}?kakaoId=${kakaoId}&email=${email}&role=${role}&redirectUrl=${redirectUrl ?? ''}`;
        return res.redirect(redirectWithSignupInfo);
      }
    } catch (error: any) {
      console.error('Kakao Login Error:', error);
      const statusCode = error.status || 500;
      const errorCode = error.code || 'UnknownError';
      const loginUrl = `${process.env.FRONTEND_BASE_URL}/login/callback`
      return res.redirect(`${loginUrl}?error=${errorCode}&status=${statusCode}`);
    }
  }

  // 카카오 인증 후 유저 정보 조회
  private async authenticateKakao(req: any, res: any): Promise<PassportUserInfo> {
    return new Promise((resolve, reject) => {
      passport.authenticate('kakao', { session: false }, (err: any, user: PassportUserInfo) => {
        if (err) return reject(err);
        if (!user) return reject(new KakaoAuthError('카카오 인증에 성공했으나 유저 정보를 가져오지 못했습니다.'));
        resolve(user);
      })(req, res);
    });
  }


  /**
   * 
   * @summary 로그아웃 처리합니다. (토큰 무효화 및 쿠키 삭제)
   * @description 로그아웃 처리 후 쿠키 삭제 프론트엔드에서 accessToken 삭제 필요
   * @returns 로그아웃 성공 여부 (refreshToken 쿠키 삭제)
   */
  @Security('jwt')
  @SuccessResponse(200, '로그아웃 성공')
  @Example<ResponseHandler<LogoutResponseDto>>({
    resultType: 'SUCCESS',
    error: null,
    success: { statusCode: 200, message: '로그아웃이 성공적으로 완료되었습니다.' }
  })
  @Response<ErrorResponse>('401', '로그인 정보를 찾을 수 없습니다.')
  @Response<ErrorResponse>('500', '서버 내부 오류')
  @Post('logout')
  async logout(
    @Request() req: ExRequest,
  ): Promise<TsoaResponse<LogoutResponseDto>> {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader && authHeader.split(' ')[1];
    if (!accessToken) {
      throw new UnauthorizedError('액세스 토큰을 찾을 수 없어 무효화할 수 없습니다.')
    }
    const payload = req.user;
    const userId = payload.id;
    await this.authService.logout(userId, accessToken);
    this.setStatus(200);
    const cookieOptions = this.getCookieOptions(0);
    this.setHeader('Set-Cookie', `refreshToken=; ${cookieOptions}`);
    return new ResponseHandler<LogoutResponseDto>({
      statusCode: 200,
      message: '로그아웃이 성공적으로 완료되었습니다.(리프레쉬 토큰 무효화) 쿠키 삭제 후 프론트엔드에서 accessToken 삭제 필요'
    });
  }

  /**
   * @summary 로컬에서 일반 회원으로 회원가입 합니다.
   * @description 일반 회원가입 요청 정보를 받아 회원가입 처리 후 access Token 발급, refresh Token 쿠키 설정
   * @returns accessToken 발급 (refreshToken 쿠키 설정)
   */
  @SuccessResponse(201, '일반 회원가입 성공')
  @Example<ResponseHandler<AuthPublicResponseDto>>({
    resultType: 'SUCCESS',
    error: null,
    success: {
      accessToken: 'accessToken'
    }
  })
  @Response<ErrorResponse>('400', '입력한 정보가 올바르지 않습니다.')
  @Response<ErrorResponse>('500', '서버 내부 오류')
  @Post('signup/user')
  public async signupUser(
    @Body() requestBody: UserSignupRequestDto
  ): Promise<TsoaResponse<AuthPublicResponseDto>> {
    const result = await this.authService.signupUser(requestBody);
    const { accessToken, refreshToken } = result;
    this.setStatus(201);
    const cookieOptions = this.getCookieOptions(1209600);
    this.setHeader('Set-Cookie', `refreshToken=${refreshToken}; ${cookieOptions}`);
    return new ResponseHandler<AuthPublicResponseDto>({
      accessToken: accessToken
    });
  }


  /**
   * @summary 로컬에서 리폼러로 회원가입 합니다.
   * @description 로컬에서 리폼러로 회원가입 요청 정보를 받아 회원가입 처리 후 access Token 발급, refresh Token 쿠키 설정
   * @returns accessToken 발급 (refreshToken 쿠키 설정)
   * @param data 리폼러 가입 정보 (JSON 문자열)
   * 
 */
  @SuccessResponse(201, '리폼러 회원가입 성공')
  @Example<ResponseHandler<AuthPublicResponseDto>>({
    resultType: 'SUCCESS',
    error: null,
    success: {
      accessToken: 'accessToken'
    }
  })
  @Response<ErrorResponse>('400', '입력한 정보가 올바르지 않습니다.')
  @Response<ErrorResponse>('500', '서버 내부 오류')
  @Post('signup/reformer')
  public async signupReformer(
    @Body() requestBody: ReformerSignupRequestDto
  ): Promise<TsoaResponse<AuthPublicResponseDto>> {
    const result = await this.authService.signupReformer(requestBody);
    const { accessToken, refreshToken } = result;
    this.setStatus(201);
    const cookieOptions = this.getCookieOptions(1209600);
    this.setHeader('Set-Cookie', `refreshToken=${refreshToken}; ${cookieOptions}`);
    return new ResponseHandler<AuthPublicResponseDto>({
      accessToken: accessToken
    });
  }

  /**
   *
   * @summary 로컬 아이디와 비밀번호로 로그인합니다.
   * @description 로그인 요청 정보를 받아 로그인 처리 후 access Token 발급, refresh Token 쿠키 설정
   * @param requestBody 로그인 요청 정보
   * @returns accessToken 발급 (refreshToken 쿠키 설정)
   */
  @SuccessResponse(200, '로컬 로그인 성공')
  @Response<ErrorResponse>('400', '입력한 정보가 올바르지 않습니다.')
  @Response<ErrorResponse>('403', '리폼러 승인 대기 중 / 반려됨', {
    resultType: "FAIL",
    error: {
      errorCode: "Auth_117",
      reason: "승인 대기 중인 계정입니다.",
      data: "승인 대기 중인 계정입니다."
    },
    success: null
  })
  @Response<ErrorResponse>('403', '리폼러 승인 대기 중 / 반려됨', {
    resultType: "FAIL",
    error: {
      errorCode: "Auth_118",
      reason: "리폼러 신청이 반려된 계정입니다.",
      data: "리폼러 신청이 반려된 계정입니다."
    },
    success: null
  })
  @Response<ErrorResponse>('500', '서버 내부 오류')
  @Example<ResponseHandler<AuthPublicResponseDto>>({
    resultType: 'SUCCESS',
    error: null,
    success: {
      accessToken: 'accessToken'
    }
  })
  @Response<ErrorResponse>('400', '입력한 정보가 올바르지 않습니다.')
  @Response<ErrorResponse>('500', '서버 내부 오류')
  @Post('login/local')
  public async localLogin(
    @Body() requestBody: LocalLoginRequestDto): Promise<TsoaResponse<AuthPublicResponseDto>> {
    const result = await this.authService.loginLocal(requestBody);
    const { accessToken, refreshToken } = result;
    this.setStatus(200);
    const cookieOptions = this.getCookieOptions(1209600);
    this.setHeader('Set-Cookie', `refreshToken=${refreshToken}; ${cookieOptions}`);
    return new ResponseHandler<AuthPublicResponseDto>({
      accessToken: accessToken
    });
  }

  /**
   *
   * @summary Access Token을 재발급 합니다. (Refresh Token도 재발급 됩니다.)
   * @description 쿠키에 담긴 Refresh Token을 검증하여 새로운 토큰 쌍을 발급
   * @returns 새로운 accessToken 발급 (refreshToken 쿠키 설정)
   */
  @Security('jwt_refresh')
  @SuccessResponse(200, 'Access Token 재발급 성공')
  @Example<ResponseHandler<AuthPublicResponseDto>>({
    resultType: 'SUCCESS',
    error: null,
    success: {
      accessToken: 'accessToken'
    }
  })
  @Response<ErrorResponse>('401', '리프레시 토큰을 찾을 수 없습니다.')
  @Response<ErrorResponse>('500', '서버 내부 오류')
  @Post('reissue/accessToken')
  public async reissueAccessToken(
    @Request() req: ExRequest)
    : Promise<TsoaResponse<AuthPublicResponseDto>> {
    const refreshTokenFromCookie = req.cookies.refreshToken;
    const result = await this.authService
      .reissueAccessToken({ refreshToken: refreshTokenFromCookie });
    const { accessToken, refreshToken } = result;
    this.setStatus(200);
    const setOptions = this.getCookieOptions(1209600);
    this.setHeader('Set-Cookie', `refreshToken=${refreshToken}; ${setOptions}`);
    return new ResponseHandler<AuthPublicResponseDto>({
      accessToken: accessToken
    });
  }

  /**
   * @summary [프론트 테스트용] 가입된 계정을 삭제합니다.
   * @description 프론트엔드에서 회원가입 편의성을 위해 만들어진 기능입니다.
   * @returns 삭제 성공여부
   */
  @SuccessResponse(200, '계정 삭제 성공')
  @Example<ResponseHandler<string>>({
    resultType: 'SUCCESS',
    error: null,
    success: "회원 탈퇴가 완료되었습니다. 다시 가입하실 수 있습니다."
  })
  @Response<ErrorResponse>(403, '마스터 리폼러 계정은 삭제할 수 없습니다.')
  @Response<ErrorResponse>(404, '삭제하려는 계정을 찾을 수 없습니다. 이미 삭제되었거나 없는 계정입니다.')
  @Security('jwt')
  @Delete('withdraw')
  public async withdraw(
    @Request() req: ExRequest,
  ): Promise<ResponseHandler<WithdrawResponseDto>> {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader && authHeader.split(' ')[1];
    if (!accessToken) {
      throw new UnauthorizedError('액세스 토큰을 찾을 수 없어 무효화할 수 없습니다.')
    }
    const payload = req.user;
    const userId = payload.id;
    const role = payload.role;
    await this.authService.withdraw(userId, role, accessToken);
    this.setStatus(200);
    const cookieOptions = this.getCookieOptions(0);
    this.setHeader('Set-Cookie', `refreshToken=; ${cookieOptions}`);
    return new ResponseHandler<WithdrawResponseDto>(
      {
        statusCode: 200,
        message: '회원 탈퇴가 완료되었습니다. 다시 가입하실 수 있습니다.'
      }
    );
  }

  private getCookieOptions(maxAge: number): string {
    const isDevelopment = process.env.COOKIE_SETUP === 'development';
    const sameSite = isDevelopment ? 'Lax' : 'None';
    const secure = isDevelopment ? '' : 'Secure;';
    return `HttpOnly; ${secure} Max-Age=${maxAge}; Path=/; SameSite=${sameSite}`;
  }
}