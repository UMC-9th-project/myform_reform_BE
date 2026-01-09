import { SmsProviderError, RedisStorageError, TooManyCodeAttemptsError } from '../../middleware/error.js';
import { SolapiMessageService} from 'solapi';
import { mockRedis } from '../../config/redis.mock.js';
import { ResponseHandler } from '../../config/tsoaResponse.js';
import dotenv from 'dotenv';
dotenv.config();

const messageService = new SolapiMessageService(
  process.env.SOLAPI_API_KEY || '',
  process.env.SOLAPI_API_SECRET || ''
);

export class AuthService {
  async sendSms(phoneNumber: string): Promise<any>{
    // 전화번호에서 숫자가 아닌 모든 문자 제거
    const cleanPhoneNumber:string = phoneNumber.replace(/[^0-9]/g, '');
    // block:${cleanPhoneNumber} 키가 존재하면 30분 간 인증 제한.
    if (await mockRedis.get(`block:${cleanPhoneNumber}`)){
      throw new TooManyCodeAttemptsError(`${cleanPhoneNumber} 번호는 인증 코드 입력 시도 횟수를 초과했습니다.`);
    }
    // 6자리 인증 코드 생성
    const authCode:string = Math.floor(100000 + Math.random() * 900000).toString();
    // 인증 코드를 포함한 문자 메시지 생성
    const textMessage = `[니폼내폼] 본인 확인 인증번호 [${authCode}]입니다.`;
    let smsResult: any;

    // Redis에 저장할 데이터 생성
    const authData:string = JSON.stringify({
      code: authCode,
      attempts: 0,
      lastAttempt: new Date().toISOString()
    });
    // Redis에 인증 코드 저장
    try {
      // 데이터는 auth:${cleanPhoneNumber} 키로 저장
      await mockRedis.set(`auth:${cleanPhoneNumber}`, authData, 'EX', 180);
      console.log(`${cleanPhoneNumber} 번호로 ${authCode} 인증 코드를 Redis에 저장했습니다.`);
    } catch (error: any){
      throw new RedisStorageError(`Redis 저장 실패 : ${error.message}`);
    }
    // SMS 전송 로직
    try {
      smsResult = await messageService.send({
        to: cleanPhoneNumber,
        from: process.env.SOLAPI_PHONE_NUMBER as string,
        text: textMessage
      });
      console.log(`${cleanPhoneNumber} 번호로 ${authCode} 인증 코드를 전송했습니다.`);
    } catch (error: any){
      //SOLAPI API 요청 실패 시 Redis에서 인증 코드 삭제
      await mockRedis.del(cleanPhoneNumber);
      console.log(`SOLAPI API 요청 실패로 ${cleanPhoneNumber} 번호로 ${authCode} 인증 코드를 Redis에서 삭제했습니다.`);
      throw new SmsProviderError(`SOLAPI API 요청 실패 : ${error.message}`);
    }  
    return smsResult;
  } 
}