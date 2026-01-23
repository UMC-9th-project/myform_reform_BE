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
  FormField,
  UploadedFiles,
  Security
} from 'tsoa';
import { TsoaResponse, ResponseHandler, ErrorResponse } from '../../config/tsoaResponse.js';
import { AuthService } from './auth.service.js';
import { SendSmsRequest, VerifySmsRequest, SendSmsResponse, VerifySmsResponse, LogoutResponse, PassportUserInfo, UserSignupRequest, ReformerSignupRequest, LocalLoginRequest, AuthPublicResponse, RefreshTokenPublicResponse, Role } from './auth.dto.js';
import express from 'express';
import passport from './passport.js';
import { KakaoAuthError } from './auth.error.js';
@Route('auth')
@Tags('Auth')
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
  @Example<ResponseHandler<SendSmsResponse>>({
    resultType: 'SUCCESS',
    error: null,
    success: {statusCode: 200, message: 'SMS 전송이 완료되었습니다.'}
  })

  @Response<ErrorResponse>('400', '전화번호 형식 오류')
  @Response<ErrorResponse>('429', '인증 시도 횟수 초과')
  @Response<ErrorResponse>('500', '서버 내부 오류')
  
  @Post('sms/send') 
  public async sendSms(
    @Body() requestBody: SendSmsRequest): Promise<TsoaResponse<SendSmsResponse>> {
    await this.authService.sendSms(requestBody.phoneNumber);
    return new ResponseHandler<SendSmsResponse>({
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
  @Example<ResponseHandler<VerifySmsResponse>>({
    resultType: 'SUCCESS',
    error: null,
    success: {statusCode: 200, message: '인증이 성공적으로 완료되었습니다.'}
  })
  @Response<ErrorResponse>('429', '인증 시도 횟수 초과')
  @Response<ErrorResponse>('400', '인증 코드 불일치 및 형식 오류, 만료 또는 부재')
  @Response<ErrorResponse>('500', '서버 내부 오류')
  @Post('sms/verify')
  public async verifySms(
    @Body() requestBody: VerifySmsRequest): Promise<TsoaResponse<VerifySmsResponse>> {
    await this.authService.verifySms(requestBody.phoneNumber, requestBody.code);
    return new ResponseHandler<VerifySmsResponse>({
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
  public async loginWithKakao(@Request() request: express.Request, @Query() mode: Role): Promise<any> {
    const res = (request as any).res as express.Response;
    const next = (request as any).next as express.NextFunction;
    // 카카오 로그인 페이지로 리다이렉트, state에 mode 값을 전달하여 로그인 모드 구분
    passport.authenticate('kakao', { session: false, state: mode })(request, res, next);
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
    console.log(`kakaoId: ${request.user}`);
    try {
      const user = await this.authenticateKakao(request, res);
      const result = await this.authService.handleKakaoLogin(user);

      if (result.status == 'login'){
        res.cookie('refreshToken', result.refreshToken, {
          httpOnly: true, 
          secure: true, 
          maxAge: 1209600000, 
          path: '/', 
          sameSite: 'lax' as const
        });
        // 로그인 페이지로 리다이렉트, accessToken 정보를 전달 
        const loginUrl = `${process.env.FRONTEND_URL}/login?accessToken=${result.accessToken}`;
        return res.redirect(loginUrl);
      }

      if (result.status == 'signup'){
        const { role, kakaoId, email } = result.user;
        // 회원가입 페이지로 리다이렉트, role, kakaoId, email 정보를 전달
        const signupUrl = `${process.env.FRONTEND_URL}/signup?role=${role}&kakaoId=${kakaoId}&email=${email}`;
        return res.redirect(signupUrl);
      }
    } catch (error) {
      throw new KakaoAuthError('카카오 로그인 처리 중 오류가 발생했습니다.');
    }
  }

  // 카카오 인증 후 유저 정보 조회
  private async authenticateKakao(req: any, res: any): Promise<PassportUserInfo>{
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
  @Example<ResponseHandler<LogoutResponse>>({
    resultType: 'SUCCESS',
    error: null,
    success: {statusCode: 200, message: '로그아웃이 성공적으로 완료되었습니다.'}
  })
  @Response<ErrorResponse>('401', '로그인 정보를 찾을 수 없습니다.')
  @Response<ErrorResponse>('500', '서버 내부 오류')
  @Post('logout')
  async logout(@Request() req: express.Request): Promise<TsoaResponse<LogoutResponse>> {
    const userId = (req.user as any).id;
    await this.authService.logout(userId);

    this.setStatus(200);
    this.setHeader('Set-Cookie', 'refreshToken=; HttpOnly; Secure; Max-Age=0; Path=/; SameSite=Lax');
    return new ResponseHandler<LogoutResponse>({
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
  @Example<ResponseHandler<AuthPublicResponse>>({
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
    @Body() requestBody: UserSignupRequest
  ): Promise<TsoaResponse<AuthPublicResponse>> {
    const result = await this.authService.signupUser(requestBody);
    const { accessToken, refreshToken } = result;
    this.setStatus(201);
    this.setHeader('Set-Cookie', `refreshToken=${refreshToken}; HttpOnly; Secure; Max-Age=1209600; Path=/; SameSite=Lax`);
    return new ResponseHandler<AuthPublicResponse>({
      accessToken: accessToken
    });
  }


  /**
   * @summary 로컬에서 리폼러로 회원가입 합니다.
   * @description 로컬에서 리폼러로 회원가입 요청 정보를 받아 회원가입 처리 후 access Token 발급, refresh Token 쿠키 설정
   * @returns accessToken 발급 (refreshToken 쿠키 설정)
   */
  @SuccessResponse(201, '리폼러 회원가입 성공')
  @Example<ResponseHandler<AuthPublicResponse>>({
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
  @FormField() data: string,
  @UploadedFiles('portfolios') portfolioPhotos: Express.Multer.File[]
  ): Promise<TsoaResponse<AuthPublicResponse>> {
    const requestBody: ReformerSignupRequest = JSON.parse(data);
    const result = await this.authService.signupReformer(requestBody, portfolioPhotos);
    const { accessToken, refreshToken } = result;
    this.setStatus(201);
    this.setHeader('Set-Cookie', `refreshToken=${refreshToken}; HttpOnly; Secure; Max-Age=1209600; Path=/; SameSite=Lax`);
    return new ResponseHandler<AuthPublicResponse>({
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
  @Response<ErrorResponse>('500', '서버 내부 오류')
  @Example<ResponseHandler<AuthPublicResponse>>({
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
    @Body() requestBody: LocalLoginRequest): Promise<TsoaResponse<AuthPublicResponse>> {
    const result = await this.authService.loginLocal(requestBody);
    const { accessToken, refreshToken } = result;
    this.setStatus(200);
    this.setHeader('Set-Cookie', `refreshToken=${refreshToken}; HttpOnly; Secure; Max-Age=1209600; Path=/; SameSite=Lax`);
    return new ResponseHandler<AuthPublicResponse>({
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
  @Example<ResponseHandler<RefreshTokenPublicResponse>>({
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
    @Request() req: express.Request): Promise<TsoaResponse<RefreshTokenPublicResponse>> {
    const refreshTokenFromCookie = req.cookies.refreshToken;
    const result = await this.authService.reissueAccessToken(refreshTokenFromCookie);
    const { accessToken, refreshToken } = result; 
    
    this.setStatus(200);
    this.setHeader('Set-Cookie', `refreshToken=${refreshToken}; HttpOnly; Secure; Max-Age=1209600; Path=/; SameSite=Lax`);
    
    return new ResponseHandler<RefreshTokenPublicResponse>({
      accessToken: accessToken
    });
  }
}