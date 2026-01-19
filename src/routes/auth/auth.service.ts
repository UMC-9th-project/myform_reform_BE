import { SmsProviderError, RedisStorageError, TooManyCodeAttemptsError, InvalidCodeError, CodeMismatchError, MissingAuthInfoError, VerificationRequiredError, EmailDuplicateError } from './auth.error.js';
import { SolapiMessageService} from 'solapi';
import { redisClient } from '../../config/redis.js';
import { validatePhoneNumber, validateCode, validateEmail, validateNickname, validateTermsAgreement, validateRegistrationType, validatePassword, validateBusinessNumber, validateDescription, validatePortfolioPhotos} from '../../utils/validators.js';
import pkg from 'jsonwebtoken';
const { sign } = pkg;
import { KakaoSignupResponse, KakaoLoginResponse, KakaoAuthResponse, JwtPayload, LoginResponse, UserSignupResponse, UserSignupRequest, UserCreateDto, ReformerSignupRequest, ReformerSignupResponse, OwnerCreateDto } from './auth.dto.js';
import dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import prisma from '../../config/prisma.config.js';
import { runInTransaction } from '../../config/prisma.config.js';
import { AuthModel } from './auth.model.js';
import { S3 } from '../../config/s3.js';
import { UsersService } from '../users/users.service.js';

dotenv.config();

const messageService = new SolapiMessageService(
  process.env.SOLAPI_API_KEY || '',
  process.env.SOLAPI_API_SECRET || ''
);

export class AuthService {
  // 솔트 라운드 10으로 고정
  private readonly SALT_ROUNDS = 10;
  private authModel: AuthModel;
  private usersService: UsersService;
  
  constructor() {
    this.authModel = new AuthModel();
    // UsersService 인스턴스 생성 (checkNicknameDuplicate 사용 목적)
    this.usersService = new UsersService();
  }

  async sendSms(phoneNumber: string): Promise<void>{
    // 전화번호에서 숫자가 아닌 모든 문자 제거
    validatePhoneNumber(phoneNumber);
    const cleanPhoneNumber = phoneNumber.replace(/[^0-9]/g, '');
    // block:${cleanPhoneNumber} 키가 존재하면 30분 간 인증 제한.
    await this.checkBlockStatus(cleanPhoneNumber);
    
    // 6자리 인증 코드 생성
    const authCode = Math.floor(100000 + Math.random() * 900000).toString();
    // 인증 코드를 포함한 문자 메시지 생성
    // Redis에 저장할 데이터 생성
    const authKey = `auth:${cleanPhoneNumber}`;
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
      // 과금 방지를 위해 주석 처리
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
    const cleanPhoneNumber:string = phoneNumber.replace(/[^0-9]/g, '');
    const authKey = `auth:${cleanPhoneNumber}`;
    const blockKey = `block:${cleanPhoneNumber}`;
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
    await redisClient.set(`verified:${cleanPhoneNumber}`, 'true', { EX: 1200 });
    await redisClient.del(authKey);
    return true;
  }

  async handleKakaoLogin(user: any): Promise<KakaoAuthResponse> {
    // 신규 유저 - 회원가입 정보 반환
    if (user.status === 'signup') {
      return {
        status: 'signup',
        user: {
          kakaoId: user.kakaoId,
          email: user.email,
          role: user.role        
        }
      } as KakaoSignupResponse;
    }

    if (!user.id || !user.email || !user.role) {
      throw new MissingAuthInfoError('JWT 토큰 생성에 필요한 유저 정보가 DB에서 누락되었습니다.');
    }
    // 기존 유저 - 로그인 토큰 
    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role as 'user' | 'reformer',
      auth_status: user.auth_status
    };
    const { accessToken, refreshToken } = await this.generateAndSaveTokens(payload);

    return {
      status: 'login',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role as 'user' | 'reformer',
        auth_status: user.auth_status as 'PENDING' | 'APPROVED' | 'REJECTED'
      }
    } as KakaoLoginResponse;
  }

  // 로그아웃 처리 : Redis에서 Refresh Token 삭제
  async logout(userId: string): Promise<void> {
    try {
      await redisClient.del(`refreshToken:${userId}`);      
    } catch (error) {
      // refreshToken 삭제 실패 시 에러 로깅만 하고 계속 진행
      console.error(`[Logout] Redis refreshToken 삭제 실패 - userId: ${userId}`, error);
    }
  };

  // 회원가입 처리 : 회원가입 정보 검증 후 DB에 저장 및 JWT 토큰 생성 후 반환
  async signupUser(requestBody: UserSignupRequest): Promise<UserSignupResponse> {
    const { password, registration_type, phoneNumber, ...rest } = requestBody;
    // 회원 가입에 필요한 정보 검증 (입력값 유효성, 비즈니스 정책, 가입 유형에 따른 논리 검증, SMS 인증 확인 등)
    await this.validateSignupRequest(requestBody);
    const cleanPhoneNumber = phoneNumber.replace(/[^0-9]/g, '');
    const hashedPassword = password && registration_type === 'LOCAL' 
      ? await bcrypt.hash(password, this.SALT_ROUNDS) 
      : undefined;
    const requestDto: UserCreateDto = { 
      ...rest,
      phoneNumber: cleanPhoneNumber,
      hashedPassword: hashedPassword,
      registration_type: registration_type
    };

    // DB에 회원 정보 저장 및 JWT 토큰 생성 후 반환
    return await runInTransaction(async () => {
      // DB에 회원 정보 저장 (생성)
      const newUser = await this.authModel.createUser(requestDto);      
      // JWT 토큰 생성 및 Redis에 저장
      const { accessToken, refreshToken } = await this.generateAndSaveTokens(newUser);
      // SMS 인증 확인 상태 Redis에서 삭제
      await redisClient.del(`verified:${phoneNumber}`);
      
      // 회원가입 성공 시 값 반환
      return {
        user: newUser,
        accessToken,
        refreshToken
      } as UserSignupResponse;
    });
  }

  async signupReformer(requestBody: ReformerSignupRequest, portfolioPhotos: Express.Multer.File[]): Promise<ReformerSignupResponse> {
    const { password, registration_type, phoneNumber, businessNumber, description, ...rest } = requestBody;
    const s3 = new S3();
    await this.validateReformerSignupRequest(requestBody, portfolioPhotos);
    const cleanPhoneNumber = phoneNumber.replace(/[^0-9]/g, '');
    const cleanBusinessNumber = businessNumber.replace(/[^0-9]/g, '');
    const hashedPassword = password && registration_type === 'LOCAL' 
      ? await bcrypt.hash(password, this.SALT_ROUNDS) 
      : undefined;
    const portfolioUrls = await s3.uploadManyToS3(portfolioPhotos);

    // portfolioPhotos를 문자열 배열로 변환
    const requestDto: OwnerCreateDto = {
      ...rest,
      businessNumber: cleanBusinessNumber,
      description: description,
      hashedPassword: hashedPassword,
      phoneNumber: cleanPhoneNumber,
      registration_type: registration_type,
      portfolioPhotos: portfolioUrls
    };

    return await runInTransaction(async () => {
      // DB에 회원 정보 저장 (생성)
      const newOwner = await this.authModel.createOwner(requestDto);
      // JWT 토큰 생성 및 Redis에 저장
      const { accessToken, refreshToken } = await this.generateAndSaveTokens(newOwner);
      // SMS 인증 확인 상태 Redis에서 삭제
      await redisClient.del(`verified:${phoneNumber}`);
      
      return {
        user: newOwner,
        accessToken,
        refreshToken
      } as ReformerSignupResponse;
    });
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
    // JWT 토큰 생성
    const accessToken = sign(payload, process.env.JWT_SECRET!, { expiresIn: '1h' });
    // Refresh Token 생성
    const refreshToken = sign({ id: payload.id }, process.env.JWT_SECRET!, { expiresIn: '14d' });
    // Refresh Token Redis에 저장
    try {
      await redisClient.set(`refreshToken:${payload.id}`, refreshToken, { EX: 60 * 60 * 24 * 14 });
    } catch (error) {
      console.error(`[Refresh Token Storage] Redis 저장 실패 - userId: ${payload.id}`, error);
      throw new RedisStorageError(`Redis refreshToken 저장 실패 - userId: ${payload.id}의 리프레시 토큰을 저장하지 못했습니다.`);
    }
    // JWT 토큰 반환
    return { accessToken, refreshToken } as LoginResponse;
  }

  // 회원가입 정보 검증
  private async validateSignupRequest(requestBody: UserSignupRequest | ReformerSignupRequest): Promise<void> {
    const { email, nickname, phoneNumber, role, registration_type, oauthId, password, over14YearsOld, termsOfService, privacyPolicy } = requestBody;
    // 단순 형식 검증 (이메일, 닉네임, 전화번호, 비밀번호)
    validateEmail(email);
    validateNickname(nickname);
    validatePhoneNumber(phoneNumber);
    if (password){
      validatePassword(password);
    }

    // 비즈니스 정책 검증 (14세 이상, 약관 동의)
    validateTermsAgreement(over14YearsOld, termsOfService);
    
    // 가입 유형에 따른 논리 검증 (OAuth이면 password 필요없음, 로컬이면 password 필요, OAuth이면 oauthId 필요)
    validateRegistrationType(registration_type, oauthId, password);

    // SMS 인증 성공 시 Redis에 저장된 인증 코드 확인
    await this.ensurePhoneVerified(phoneNumber);

    // 닉네임 중복 검증
    await this.usersService.checkNicknameDuplicate(nickname);

    // 이메일 중복 검증
    await this.checkEmailDuplicate(email, role);
  }

  private async validateReformerSignupRequest(requestBody: ReformerSignupRequest, portfolioPhotos: Express.Multer.File[]): Promise<void> {
    await this.validateSignupRequest(requestBody);
    validateBusinessNumber(requestBody.businessNumber);
    validateDescription(requestBody.description);
    validatePortfolioPhotos(portfolioPhotos);
  }

  // 휴대폰 인증 확인
  private async ensurePhoneVerified(phoneNumber: string): Promise<void> {
    const verified = await redisClient.get(`verified:${phoneNumber}`);
    if (!verified){
      throw new VerificationRequiredError('휴대폰 인증이 완료되지 않았거나 만료되었습니다.');
    }
  }

  // 이메일 중복 검증
  private async checkEmailDuplicate(email: string, role: 'user' | 'reformer'): Promise<void> {
    if (role === 'user'){
      const account = await prisma.user.findFirst({
        where: {
          email: email
        }
      });
      if (account){
        throw new EmailDuplicateError('이미 존재하는 이메일입니다.');
      }
    }
    
    if (role === 'reformer'){
      const account = await prisma.owner.findFirst({
        where: {
          email: email
        }
      });
      if (account){
        throw new EmailDuplicateError('이미 존재하는 이메일입니다.');
      }
    }
  }
}
