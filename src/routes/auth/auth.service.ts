import { SmsProviderError, RedisStorageError, TooManyCodeAttemptsError, InvalidCodeError, CodeMismatchError, MissingAuthInfoError, VerificationRequiredError, AccountNotFoundError, passwordInvalidError, RefreshTokenError, EmailDuplicateError, InputValidationError, SocialAccountDuplicateError } from './auth.error.js';
import { SolapiMessageService} from 'solapi';
import { redisClient } from '../../config/redis.js';
import { validatePhoneNumber, validateCode, validateEmail, validateNickname, validateTermsAgreement, validateRegistrationType, validatePassword, validateBusinessNumber, validateDescription, validatePortfolioPhotos, validateName} from '../../utils/validators.js';
import jwt from 'jsonwebtoken';
import { KakaoSignupResponse, KakaoLoginResponse, KakaoAuthResponse, JwtPayload, LoginResponse, UserSignupRequest, UserCreateDto, ReformerSignupRequest, OwnerCreateDto, AuthLoginResponse, LocalLoginRequest, AuthStatus, RefreshTokenRequest, RefreshTokenResponse, UserCreateResponseDto, OwnerCreateResponseDto, Role } from './auth.dto.js';
import dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import { runInTransaction } from '../../config/prisma.config.js';
import { AuthModel } from './auth.model.js';
import { S3 } from '../../config/s3.js';
import { UsersModel } from '../users/users.model.js';
import { UsersInfoResponse } from '../users/dto/users.res.dto.js';
import { REDIS_KEYS } from '../../config/redis.js';
import { NicknameDuplicateError, PhoneNumberDuplicateError } from '../users/users.error.js';
import { provider_type } from '@prisma/client';

dotenv.config();

const messageService = new SolapiMessageService(
  process.env.SOLAPI_API_KEY || '',
  process.env.SOLAPI_API_SECRET || ''
);

export class AuthService {
  // 솔트 라운드 10으로 고정
  private readonly SALT_ROUNDS = 10;
  private authModel: AuthModel;
  private usersModel: UsersModel;

  constructor() {
    this.authModel = new AuthModel();
    // UsersService 인스턴스 생성 (checkNicknameDuplicate 사용 목적)
    this.usersModel = new UsersModel();
  }

  async sendSms(phoneNumber: string): Promise<void>{
    validatePhoneNumber(phoneNumber);
    const cleanPhoneNumber = this.getCleanPhoneNumber(phoneNumber);
    await this.checkBlockStatus(cleanPhoneNumber);
    
    // 6자리 인증 코드 생성
    const authCode = Math.floor(100000 + Math.random() * 900000).toString();
    // 인증 코드를 포함한 문자 메시지 생성
    // Redis에 저장할 데이터 생성
    const authKey = REDIS_KEYS.AUTH_CODE(cleanPhoneNumber);
    const authData = JSON.stringify({
      code: authCode,
      attempts: 0,
      generatedAt: Date.now()
    });
    const textMessage = `[니폼내폼] 본인 확인 인증번호 [${authCode}]입니다.`;
    
    // Redis에 인증 코드 저장
    try {
      await redisClient.set(authKey, authData, { EX: 180 });
      console.log(`${cleanPhoneNumber} 번호로 ${authCode} 인증 코드를 Redis에 저장했습니다.`);
    } catch (error: any){
      throw new RedisStorageError(`Redis 인증 코드 저장 실패 - ${cleanPhoneNumber} 번호로 인증 코드를 저장하지 못했습니다.`);
    }
    
    // SMS 전송 로직
    try {
      // await messageService.send({
      //   to: cleanPhoneNumber,
      //   from: process.env.SOLAPI_PHONE_NUMBER as string,
      //   text: textMessage
      // });
      console.log(`${cleanPhoneNumber} 번호로 ${authCode} 인증 코드를 전송했습니다.`);
    } catch (error: any){
      //SMS 전송 실패 시 Redis에서 인증 코드 삭제
      await redisClient.del(authKey);
      console.log(`SMS 전송 실패로 ${cleanPhoneNumber} 번호로 ${authCode} 인증 코드를 Redis에서 삭제했습니다.`);
      throw new SmsProviderError(`SOLAPI API 요청 실패 : ${error.message}`);
    }  
  }

  async verifySms(phoneNumber: string, code: string): Promise<boolean>{
    validatePhoneNumber(phoneNumber);
    validateCode(code);
    const cleanPhoneNumber:string = this.getCleanPhoneNumber(phoneNumber);
    const authKey = REDIS_KEYS.AUTH_CODE(cleanPhoneNumber);
    const blockKey = REDIS_KEYS.BLOCK(cleanPhoneNumber);
    await this.checkBlockStatus(cleanPhoneNumber);

    
    // auth:${cleanPhoneNumber} 키가 존재하면 인증 코드 검증.
    const authData = await redisClient.get(authKey);
    if (!authData){
      throw new InvalidCodeError('인증 코드가 만료되었거나 존재하지 않습니다.');
    }
    const parsedAuthData = JSON.parse(authData);
    // 인증 코드 일치 여부 검증.
    if (parsedAuthData.code !== code){
      parsedAuthData.attempts++;
      // 인증 코드 입력 시도 횟수가 5회 이상이면 30분 간 인증 시도 제한.
      if (parsedAuthData.attempts >= 5){
        const now = Date.now();
        await redisClient.set(blockKey, JSON.stringify({ generatedAt: now }), { EX: 1800 });
        await redisClient.del(authKey);
        throw new TooManyCodeAttemptsError({
          blockedAt: new Date(now).toISOString(),
          availableAt: new Date(now + 1800000).toISOString(),
          leftTime: 30
        });
      }
      await redisClient.set(authKey, JSON.stringify(parsedAuthData), { KEEPTTL: true });
      throw new CodeMismatchError('인증 코드가 일치하지 않습니다.');
    }
    // 인증 코드 일치 시 Redis에서 인증 코드 삭제 후 20분 간 인증 상태 유지하고 true로 redis에 저장.
    await redisClient.set(REDIS_KEYS.VERIFIED(cleanPhoneNumber), 'true', { EX: 1200 });
    await redisClient.del(authKey);
    return true;
  }

  async handleKakaoLogin(user: any): Promise<KakaoAuthResponse> {
    // 신규 유저 - 회원가입 정보 반환
    if (user.status === 'signup') {
      if (!user.kakaoId || !user.email || !user.role) {
        throw new MissingAuthInfoError('카카오 로그인 회원가입에 필요한 정보가 일부 누락되었습니다.');
      }
      return {
        status: 'signup',
        user: {
          kakaoId: user.kakaoId,
          email: user.email,
          role: user.role        
        }
      } as KakaoSignupResponse;
    }

    if (!user.id || !user.role) {
      throw new MissingAuthInfoError('JWT 토큰 생성에 필요한 유저 정보가 DB에서 누락되었습니다.');
    }
    
    const payload: JwtPayload = {
      id: user.id,
      role: user.role,
      auth_status: user.auth_status
    };
    const { accessToken, refreshToken } = await this.generateAndSaveTokens(payload);

    return {
      status: 'login',
      accessToken: accessToken,
      refreshToken: refreshToken
    } as KakaoLoginResponse;
  }

  // 로그아웃 처리 : Redis에서 Refresh Token 삭제
  async logout(userId: string): Promise<void> {
    try {
      await redisClient.del(REDIS_KEYS.REFRESH_TOKEN(userId));      
    } catch (error) {
      console.error(`[Logout] Redis refreshToken 삭제 실패 - userId: ${userId}`, error);
    }
  };

  // 일반 회원가입 처리
  async signupUser(requestBody: UserSignupRequest): Promise<AuthLoginResponse> {
    await this.validateSignupRequest(requestBody, 'user');
    return await this.processSignup(requestBody, async (hashedPassword, cleanPhoneNumber) => {
      const { password, phoneNumber, ...rest } = requestBody;
      const userDto: UserCreateDto = {
        ...rest,
        hashedPassword: hashedPassword,
        phoneNumber: cleanPhoneNumber,
        role: 'user' as Role
      };
      return await this.authModel.createUser(userDto as UserCreateDto);
    });
  }

  // 리폼러 회원가입 처리
  async signupReformer(requestBody: ReformerSignupRequest, portfolioPhotos: Express.Multer.File[])
  : Promise<AuthLoginResponse> {
    await this.validateReformerSignupRequest(requestBody, portfolioPhotos);
    const s3 = new S3();
    const portfolioUrls = await s3.uploadManyToS3(portfolioPhotos);
    return await this.processSignup(requestBody,  async (hashedPassword, cleanPhoneNumber) => {
      const { password, phoneNumber, oauthId, ...rest } = requestBody;
      const ownerDto: OwnerCreateDto = {
        ...rest,
        oauthId: oauthId,
        hashedPassword: hashedPassword,
        phoneNumber: cleanPhoneNumber,
        role: 'reformer' as Role,
        businessNumber: this.getCleanBusinessNumber(rest.businessNumber),
        description: requestBody.description,
        portfolioPhotos: portfolioUrls
      };
      return await this.authModel.createOwner(ownerDto);
    });
  }

  // 회원가입 공통 로직 : 회원가입 정보 검증 후 DB에 저장 및 JWT 토큰 생성 후 반환
  private async processSignup( requestBody: UserSignupRequest | ReformerSignupRequest, createAccountFn: (hashedPassword: string | undefined, phoneNumber: string ) => Promise<UserCreateResponseDto | OwnerCreateResponseDto>
  ): Promise<AuthLoginResponse> {
    const { password, registration_type, phoneNumber } = requestBody;
    const cleanPhoneNumber = this.getCleanPhoneNumber(phoneNumber);
    const hashedPassword = password && registration_type === 'LOCAL' 
      ? await bcrypt.hash(password, this.SALT_ROUNDS) 
      : undefined;

    return await runInTransaction(async () => {
      const newAccount = await createAccountFn(hashedPassword, cleanPhoneNumber);
      const payload: JwtPayload = {
        id: newAccount.id,
        role: newAccount.role as 'user' | 'reformer',
        ...(newAccount.role === 'reformer' && { auth_status: (newAccount as OwnerCreateResponseDto).auth_status as AuthStatus })
      } as JwtPayload;
      const { accessToken, refreshToken } = await this.generateAndSaveTokens(payload);
      return {
        accessToken,
        refreshToken
      } as AuthLoginResponse;
    });
  }

  // 로컬 로그인 처리 : 이메일과 비밀번호 검증 후 JWT 토큰 생성 후 반환
  async loginLocal(requestBody: LocalLoginRequest): Promise<AuthLoginResponse> {
    const { email, password, role } = requestBody;
    validateEmail(email);
    validatePassword(password);
    //DB에서 유저 정보 조회
    const socialAccount = await this.usersModel.findSocialAccountByEmailAndRole(email, role === 'user' ? 'USER' : 'OWNER');
    if (socialAccount){
      const provider = socialAccount.provider as provider_type;
      throw new InputValidationError(`${provider}의 소셜 로그인으로 가입된 이메일입니다. 소셜 로그인으로 로그인해주세요.`);
    }

    const account = (role === 'user'
      ? await this.usersModel.findUserByEmail(email)
      : await this.usersModel.findReformerByEmail(email)) as UsersInfoResponse;
    if (!account){
      throw new AccountNotFoundError('존재하지 않는 유저입니다.');
    }

    const isPasswordValid = await bcrypt.compare(password, account.hashed as string);
    if (!isPasswordValid) {
      throw new passwordInvalidError('비밀번호가 일치하지 않습니다.');
    }
    // payload에 담길 정보는 id, role, auth_status(리폼러 한정)
    const payload: JwtPayload = {
      id: account.id,
      role: account.role as 'user' | 'reformer',
      ...(role === 'reformer' && { auth_status: account.auth_status as AuthStatus })
    } as JwtPayload;

    const { accessToken, refreshToken } = await this.generateAndSaveTokens(payload);

    return {
      accessToken,
      refreshToken
    } as AuthLoginResponse;
  }

  // 리프레시 토큰을 입력받아 엑세스 토큰과 리프레시 토큰을 재발급
  async reissueAccessToken(requestBody: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    const { refreshToken } = requestBody;
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!);
      const userId = (decoded as JwtPayload).id;
      const role = (decoded as JwtPayload).role;
      const savedRefreshToken = await redisClient.get(REDIS_KEYS.REFRESH_TOKEN(userId));
      
      if (!savedRefreshToken || savedRefreshToken !== refreshToken){
        await redisClient.del(REDIS_KEYS.REFRESH_TOKEN(userId));
        throw new InvalidCodeError('리프레시 토큰이 만료되었거나 일치하지 않습니다.');
      }
      
      const account = (role === 'user'
        ? await this.usersModel.findUserById(userId)
        : await this.usersModel.findReformerById(userId)) as UsersInfoResponse;
      
      if (!account){
        throw new AccountNotFoundError('존재하지 않는 유저입니다.');
      }

      const payload: JwtPayload = {
        id: account.id,
        role: account.role as 'user' | 'reformer',
        ...(role === 'reformer' && { auth_status: account.auth_status as AuthStatus })
      } as JwtPayload;

      const { accessToken, refreshToken: newRefreshToken } = await this.generateAndSaveTokens(payload);
      return { accessToken, refreshToken: newRefreshToken } as RefreshTokenResponse;
    } catch (error) {
      throw new RefreshTokenError('액세스 토큰 및 리프레시 토큰 재발급에 실패하였습니다.');
    }
  }

  // 인증 코드 제한 처리 : Redis에서 인증 코드 제한 처리
  private async checkBlockStatus(phoneNumber: string): Promise<void>{
    // Redis에 block:${phoneNumber} 키가 존재하면 인증 코드 제한 처리
    const blockData = await redisClient.get(`block:${phoneNumber}`);
    if (blockData){
      const parsed = JSON.parse(blockData);
      const now = Date.now();
      const availableAt = parsed.generatedAt + 1800000;
      const leftTime = Math.ceil((availableAt - now) / 60000);
      // 인증 코드 제한 시 에러 반환
      throw new TooManyCodeAttemptsError(
        {
          blockedAt: new Date(parsed.generatedAt).toISOString(),
          availableAt: new Date(availableAt).toISOString(),
          leftTime: leftTime
        }
      );
    }
  }  

  // JWT 토큰 생성 및 Redis에 저장
  private async generateAndSaveTokens(payload: JwtPayload): Promise<LoginResponse> {
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '1h' });
    const refreshToken = jwt.sign({id: payload.id, role: payload.role}, process.env.JWT_SECRET!, { expiresIn: '14d' });
    // Refresh Token Redis에 저장
    try {
      await redisClient.set(REDIS_KEYS.REFRESH_TOKEN(payload.id), refreshToken, { EX: 60 * 60 * 24 * 14 });
    } catch (error) {
      console.error(`[Refresh Token Storage] Redis 저장 실패 - userId: ${payload.id}`, error);
      throw new RedisStorageError(`Redis refreshToken 저장 실패 - userId: ${payload.id}의 리프레시 토큰을 저장하지 못했습니다.`);
    }
    // JWT 토큰 반환
    return { accessToken, refreshToken } as LoginResponse;
  }

  // 회원가입시 입력한 정보 유효성 검증
  private async validateSignupRequest(requestBody: UserSignupRequest | ReformerSignupRequest, role: 'user' | 'reformer'): Promise<void> {
    const { email, nickname, phoneNumber, registration_type, oauthId, password, over14YearsOld, termsOfService, name } = requestBody;
    // 단순 형식 검증 (이메일, 닉네임, 전화번호, 비밀번호)
    validateEmail(email);
    validateNickname(nickname);
    validatePhoneNumber(phoneNumber);
    validateName(name);
    if (registration_type === 'LOCAL' && oauthId) {
      throw new InputValidationError('로컬 로그인에 OAuth 아이디를 입력할 수 없습니다.');
    }
    if (registration_type !== 'LOCAL' && password) {
      throw new InputValidationError('OAuth 로그인에 비밀번호를 입력할 수 없습니다.');
    }
    if (registration_type === 'LOCAL' && !password) {
      throw new InputValidationError('로컬 로그인에 비밀번호를 입력하지 않았습니다.');
    }
    if (registration_type !== 'LOCAL' && !oauthId) {
      throw new InputValidationError('OAuth 로그인에 OAuth 아이디를 입력하지 않았습니다.');
    }

    if (password){
      validatePassword(password);
    }

    validateTermsAgreement(over14YearsOld, termsOfService);
    validateRegistrationType(registration_type, oauthId, password);
    await this.ensurePhoneVerified(phoneNumber);
    if (await this.usersModel.isNicknameDuplicate(nickname)){
      throw new NicknameDuplicateError('이미 존재하는 사용자 닉네임입니다.');
    }
    
    const emailExists = role === 'user'
      ? await this.usersModel.findUserByEmail(email)
      : await this.usersModel.findReformerByEmail(email);
    if (emailExists){
      throw new EmailDuplicateError('이미 존재하는 사용자 이메일입니다.');
    }

    const phoneNumberExists = role === 'user'
      ? await this.usersModel.findUserByPhoneNumber(phoneNumber)
      : await this.usersModel.findReformerByPhoneNumber(phoneNumber);
    if (phoneNumberExists){
      throw new PhoneNumberDuplicateError('이미 존재하는 사용자 전화번호입니다.');
    }

    if (registration_type !== 'LOCAL' && oauthId) {
      const dbRole = role === 'user' ? 'USER' : 'OWNER';
      const socialAccount = await this.usersModel.findSocialAccountByProviderIdAndProviderTypeAndRole(oauthId, registration_type, dbRole);
      if (socialAccount){
        throw new SocialAccountDuplicateError('이미 존재하는 소셜 계정입니다.');
      }
    }
  }

  // 리폼러 회원가입시 입력한 정보 유효성 검증
  private async validateReformerSignupRequest(requestBody: ReformerSignupRequest, portfolioPhotos: Express.Multer.File[]): Promise<void> {
    await this.validateSignupRequest(requestBody, 'reformer');
    validateBusinessNumber(requestBody.businessNumber);
    validateDescription(requestBody.description);
    validatePortfolioPhotos(portfolioPhotos);
  }

  // 전화번호 숫자만 추출
  private getCleanPhoneNumber(phoneNumber: string): string {
    return phoneNumber.replace(/[^0-9]/g, '');
  }

  // 사업자번호 숫자만 추출
  private getCleanBusinessNumber(businessNumber: string): string {
    return businessNumber.replace(/[^0-9]/g, '');
  }

  // 휴대폰 인증 확인
  private async ensurePhoneVerified(phoneNumber: string): Promise<void> {
    const verified = await redisClient.get(`verified:${phoneNumber}`);
    if (!verified){
      throw new VerificationRequiredError('휴대폰 인증이 완료되지 않았거나 만료되었습니다.');
    }
  }
}
