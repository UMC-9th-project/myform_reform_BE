import { SmsProviderError, RedisStorageError, TooManyCodeAttemptsError, InvalidCodeError, CodeMismatchError } from './auth.error.js';
import { SolapiMessageService} from 'solapi';
import { redisClient } from '../../config/redis.js';
import { validatePhoneNumber, validateCode } from '../../utils/validators.js';
import dotenv from 'dotenv';
dotenv.config();

const messageService = new SolapiMessageService(
  process.env.SOLAPI_API_KEY || '',
  process.env.SOLAPI_API_SECRET || ''
);

export class AuthService {
  private async checkBlockStatus(phoneNumber: string): Promise<void>{
    const blockData = await redisClient.get(`block:${phoneNumber}`);
    if (blockData){
      const parsed = JSON.parse(blockData);
      const now = Date.now();
      const availableAt = parsed.generatedAt + 1800000;
      const leftTime = Math.ceil((availableAt - now) / 60000);
      throw new TooManyCodeAttemptsError(
        {
          blockedAt: new Date(parsed.generatedAt).toISOString(),
          availableAt: new Date(availableAt).toISOString(),
          leftTime: leftTime
        }
      );
    }
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
      throw new RedisStorageError(`Redis 저장 실패 : ${error.message}`);
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
}