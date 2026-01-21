import { SmsProviderError, RedisStorageError, TooManyCodeAttemptsError, InvalidCodeError, CodeMismatchError, MissingAuthInfoError, VerificationRequiredError, AccountNotFoundError, passwordInvalidError, RefreshTokenError } from './auth.error.js';
import { SolapiMessageService} from 'solapi';
import { redisClient } from '../../config/redis.js';
import { validatePhoneNumber, validateCode, validateEmail, validateNickname, validateTermsAgreement, validateRegistrationType, validatePassword, validateBusinessNumber, validateDescription, validatePortfolioPhotos} from '../../utils/validators.js';
import pkg from 'jsonwebtoken';
const { verify, sign } = pkg;
import { KakaoSignupResponse, KakaoLoginResponse, KakaoAuthResponse, JwtPayload, LoginResponse, UserSignupRequest, UserCreateDto, ReformerSignupRequest, OwnerCreateDto, AuthLoginResponse, LocalLoginRequest, AuthStatus, RefreshTokenRequest, RefreshTokenResponse, AuthDto, UserCreateResponseDto, OwnerCreateResponseDto, Role, RegistrationType } from './auth.dto.js';
import dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import { runInTransaction } from '../../config/prisma.config.js';
import { AuthModel } from './auth.model.js';
import { S3 } from '../../config/s3.js';
import { UsersService } from '../users/users.service.js';
import { UsersModel } from '../users/users.model.js';
import { UsersInfoResponse } from '../users/users.dto.js';
import { REDIS_KEYS } from '../../config/redis.js';

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
  private usersModel: UsersModel;

  constructor() {
    this.authModel = new AuthModel();
    // UsersService 인스턴스 생성 (checkNicknameDuplicate 사용 목적)
    this.usersService = new UsersService();
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
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname as string,
        role: user.role as Role,
        auth_status: user.auth_status as AuthStatus
      } as AuthDto,
      accessToken,
      refreshToken,
    } as KakaoLoginResponse;
  }

  // 로그아웃 처리 : Redis에서 Refresh Token 삭제
  async logout(userId: string): Promise<void> {
    try {
      await redisClient.del(REDIS_KEYS.REFRESH_TOKEN(userId));      
    } catch (error) {
      // refreshToken 삭제 실패 시 에러 로깅만 하고 계속 진행
      console.error(`[Logout] Redis refreshToken 삭제 실패 - userId: ${userId}`, error);
    }
  };

  // // 회원가입 처리 : 회원가입 정보 검증 후 DB에 저장 및 JWT 토큰 생성 후 반환
  // async signupUser(requestBody: UserSignupRequest): Promise<AuthLoginResponse> {
  //   const { password, registration_type, phoneNumber, ...rest } = requestBody;
  //   // 회원 가입에 필요한 정보 검증 (입력값 유효성, 비즈니스 정책, 가입 유형에 따른 논리 검증, SMS 인증 확인 등)
  //   await this.validateSignupRequest(requestBody);

  //   const cleanPhoneNumber = this.getCleanPhoneNumber(phoneNumber);
  //   const hashedPassword = password && registration_type === 'LOCAL' 
  //     ? await bcrypt.hash(password, this.SALT_ROUNDS) 
  //     : undefined;
  //   const requestDto: UserCreateDto = { 
  //     ...rest,
  //     phoneNumber: cleanPhoneNumber,
  //     hashedPassword: hashedPassword,
  //     registration_type: registration_type
  //   };

  //   // DB에 회원 정보 저장 및 JWT 토큰 생성 후 반환
  //   return await runInTransaction(async () => {
  //     // DB에 회원 정보 저장 (생성)
  //     const newUser = await this.authModel.createUser(requestDto);      
  //     // JWT 토큰 생성 및 Redis에 저장
  //     const { accessToken, refreshToken } = await this.generateAndSaveTokens(newUser);
  //     // SMS 인증 확인 상태 Redis에서 삭제
  //     await redisClient.del(REDIS_KEYS.VERIFIED(phoneNumber));
      
  //     // 회원가입 성공 시 값 반환
  //     return {
  //       user: newUser,
  //       accessToken,
  //       refreshToken
  //     } as AuthLoginResponse;
  //   });
  // }

  // async signupReformer(requestBody: ReformerSignupRequest, portfolioPhotos: Express.Multer.File[]): Promise<AuthLoginResponse> {
  //   const { password, registration_type, phoneNumber, businessNumber, description, ...rest } = requestBody;
  //   const s3 = new S3();
  //   await this.validateReformerSignupRequest(requestBody, portfolioPhotos);
  //   const cleanPhoneNumber = this.getCleanPhoneNumber(phoneNumber);
  //   const cleanBusinessNumber = this.getCleanBusinessNumber(businessNumber);
  //   const hashedPassword = password && registration_type === 'LOCAL' 
  //     ? await bcrypt.hash(password, this.SALT_ROUNDS) 
  //     : undefined;
  //   const portfolioUrls = await s3.uploadManyToS3(portfolioPhotos);

  //   // portfolioPhotos를 문자열 배열로 변환
  //   const requestDto: OwnerCreateDto = {
  //     ...rest,
  //     businessNumber: cleanBusinessNumber,
  //     description: description,
  //     hashedPassword: hashedPassword,
  //     phoneNumber: cleanPhoneNumber,
  //     registration_type: registration_type,
  //     portfolioPhotos: portfolioUrls
  //   };

  //   return await runInTransaction(async () => {
  //     // DB에 회원 정보 저장 (생성)
  //     const newOwner = await this.authModel.createOwner(requestDto);
  //     // JWT 토큰 생성 및 Redis에 저장
  //     const { accessToken, refreshToken } = await this.generateAndSaveTokens(newOwner);
  //     // SMS 인증 확인 상태 Redis에서 삭제
  //     await redisClient.del(REDIS_KEYS.VERIFIED(phoneNumber));
      
  //     return {
  //       user: newOwner,
  //       accessToken,
  //       refreshToken
  //     } as AuthLoginResponse;
  //   });
  // }

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
      }
      return await this.authModel.createUser(userDto as UserCreateDto);
    })
  }

  // 리폼러 회원가입 처리
  async signupReformer(requestBody: ReformerSignupRequest, portfolioPhotos: Express.Multer.File[])
  : Promise<AuthLoginResponse> {
    await this.validateReformerSignupRequest(requestBody, portfolioPhotos);
    const s3 = new S3();
    const portfolioUrls = await s3.uploadManyToS3(portfolioPhotos);
    return await this.processSignup(requestBody,  async (hashedPassword, cleanPhoneNumber) => {
      const { password, phoneNumber, ...rest } = requestBody;
      const ownerDto: OwnerCreateDto = {
        ...rest,
        hashedPassword: hashedPassword,
        phoneNumber: cleanPhoneNumber,
        role: 'reformer' as Role,
        businessNumber: this.getCleanBusinessNumber(rest.businessNumber),
        description: requestBody.description,
        portfolioPhotos: portfolioUrls
      }
      return await this.authModel.createOwner(ownerDto);
    })
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
      const { accessToken, refreshToken } = await this.generateAndSaveTokens(newAccount);
      const authInfo = {
        id: newAccount.id,
        email: newAccount.email as string,
        nickname: newAccount.nickname as string,
        role: newAccount.role as Role,
        auth_status: (newAccount as OwnerCreateResponseDto).auth_status as AuthStatus,
      } as AuthDto;
      return {
        user: authInfo,
        accessToken,
        refreshToken
      } as AuthLoginResponse;
    });
}

  async loginLocal(requestBody: LocalLoginRequest): Promise<AuthLoginResponse> {
    // 로컬 로그인 처리 : 이메일과 비밀번호 검증 후 JWT 토큰 생성 후 반환
    const { email, password, role } = requestBody;
    //이메일 검증
    validateEmail(email);
    //비밀번호 검증
    validatePassword(password);
    //DB에서 유저 정보 조회

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
    // payload에 담길 정보는 id, email, role, auth_status(리폼러 한정)
    const payload: JwtPayload = {
      id: account.id,
      email: account.email as string,
      role: account.role as 'user' | 'reformer',
      ...(role === 'reformer' && { auth_status: account.auth_status as AuthStatus }),
    } as JwtPayload;

    const { accessToken, refreshToken } = await this.generateAndSaveTokens(payload);

    const authInfo: AuthDto = {
      id: account.id,
      email: account.email as string,
      nickname: account.nickname as string,
      role: account.role as 'user' | 'reformer',
      ...(account.role === 'reformer' && { auth_status: account.auth_status as AuthStatus }),
    }
    return {
      user: authInfo,
      accessToken,
      refreshToken
    } as AuthLoginResponse;
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

  // 리프레시 토큰을 입력받아 엑세스 토큰과 리프레시 토큰을 재발급
  async reissueAccessToken(requestBody: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    const { refreshToken } = requestBody;
    try {
      // refreshToken 검증
      const decoded = verify(refreshToken, process.env.JWT_SECRET!);
      // refreshToken 검증 성공 시 userId 추출
      const userId = (decoded as JwtPayload).id;
      const role = (decoded as JwtPayload).role;
      // userId로 리프레시 토큰 조회
      const savedRefreshToken = await redisClient.get(`refreshToken:${userId}`);
      if (!savedRefreshToken || savedRefreshToken !== refreshToken){
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
        email: account.email as string,
        role: account.role as 'user' | 'reformer',
        ...(role === 'reformer' && { auth_status: account.auth_status as AuthStatus }),
      } as JwtPayload;
      const { accessToken, refreshToken: newRefreshToken } = await this.generateAndSaveTokens(payload);
      return { accessToken, refreshToken: newRefreshToken } as RefreshTokenResponse;
    } catch (error) {
      throw new RefreshTokenError('리프레시 토큰 재발급에 실패하였습니다.');
    }
  }

  // JWT 토큰 생성 및 Redis에 저장
  private async generateAndSaveTokens(payload: JwtPayload): Promise<LoginResponse> {
    const accessToken = sign(payload, process.env.JWT_SECRET!, { expiresIn: '1h' });
    const refreshToken = sign({ id: payload.id, role : payload.role as 'user' | 'reformer' }, process.env.JWT_SECRET!, { expiresIn: '14d' });
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
  private async validateSignupRequest(requestBody: UserSignupRequest | ReformerSignupRequest, role: 'user' | 'reformer'): Promise<void> {
    const { email, nickname, phoneNumber, registration_type, oauthId, password, over14YearsOld, termsOfService, privacyPolicy } = requestBody;
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
    await this.usersService.checkEmailDuplicate(email, role);
    // 전화번호 중복 검증
    await this.usersService.checkPhoneNumberDuplicate(phoneNumber, role);
  }

  private async validateReformerSignupRequest(requestBody: ReformerSignupRequest, portfolioPhotos: Express.Multer.File[]): Promise<void> {
    await this.validateSignupRequest(requestBody, 'reformer');
    validateBusinessNumber(requestBody.businessNumber);
    validateDescription(requestBody.description);
    validatePortfolioPhotos(portfolioPhotos);
  }

  private getCleanPhoneNumber(phoneNumber: string): string {
    return phoneNumber.replace(/[^0-9]/g, '');
  }

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
