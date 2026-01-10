import { SmsProviderError, RedisStorageError, TooManyCodeAttemptsError, InvalidCodeError, CodeMismatchError } from '../../middleware/error.js';
import { SolapiMessageService} from 'solapi';
import { mockRedis } from '../../config/redis.mock.js';
import dotenv from 'dotenv';
dotenv.config();

const messageService = new SolapiMessageService(
  process.env.SOLAPI_API_KEY || '',
  process.env.SOLAPI_API_SECRET || ''
);

export class AuthService {
  async sendSms(phoneNumber: string): Promise<void>{
    // 전화번호에서 숫자가 아닌 모든 문자 제거
    const cleanPhoneNumber = phoneNumber.replace(/[^0-9]/g, '');
    // block:${cleanPhoneNumber} 키가 존재하면 30분 간 인증 제한.
    const blockData = await mockRedis.get(`block:${cleanPhoneNumber}`);
    if (blockData){
      const parsedBlockData = JSON.parse(blockData);
      throw new TooManyCodeAttemptsError(`blockedAt: ${new Date(parsedBlockData.generatedAt).toISOString()}, availableAt: ${new Date(parsedBlockData.generatedAt + 1800000).toISOString()}`);
    }
    // 6자리 인증 코드 생성
    const authCode = Math.floor(100000 + Math.random() * 900000).toString();
    // 인증 코드를 포함한 문자 메시지 생성
    const textMessage = `[니폼내폼] 본인 확인 인증번호 [${authCode}]입니다.`;
    let smsResult: any;

    // Redis에 저장할 데이터 생성
    const authData = JSON.stringify({
      code: authCode,
      attempts: 0,
      generatedAt: new Date().getTime()
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
      // smsResult = await messageService.send({
      //   to: cleanPhoneNumber,
      //   from: process.env.SOLAPI_PHONE_NUMBER as string,
      //   text: textMessage
      // });
      console.log(`${cleanPhoneNumber} 번호로 ${authCode} 인증 코드를 전송했습니다.`);
    } catch (error: any){
      //SMS 전송 실패 시 Redis에서 인증 코드 삭제
      await mockRedis.del(`auth:${cleanPhoneNumber}`);
      console.log(`SMS 전송 실패로 ${cleanPhoneNumber} 번호로 ${authCode} 인증 코드를 Redis에서 삭제했습니다.`);
      throw new SmsProviderError(`SOLAPI API 요청 실패 : ${error.message}`);
    }  
  }

  async verifySms(phoneNumber: string, code: string): Promise<boolean>{
    const cleanPhoneNumber:string = phoneNumber.replace(/[^0-9]/g, '');
    // block:${cleanPhoneNumber} 키가 존재하면 인증 시도 제한 및 남은 시간 계산해서 리턴.
    const blockData = await mockRedis.get(`block:${cleanPhoneNumber}`);
    if (blockData){
      const parsedBlockData = JSON.parse(blockData);
      const remainingBlockTimeSeconds = Math.ceil((parsedBlockData.generatedAt + 1800000 - new Date().getTime()) / 1000);
      throw new TooManyCodeAttemptsError(`blockedAt: ${new Date(parsedBlockData.generatedAt).toISOString()},availableAt: ${new Date(parsedBlockData.generatedAt + 1800000).toISOString()}
      `);
    }
    // auth:${cleanPhoneNumber} 키가 존재하면 인증 코드 검증.
    const authData = await mockRedis.get(`auth:${cleanPhoneNumber}`);
    if (!authData){
      throw new InvalidCodeError('인증 코드가 만료되었거나 존재하지 않습니다.');
    }
    const parsedAuthData = JSON.parse(authData);
    // 인증 코드 일치 여부 검증.
    if (parsedAuthData.code !== code){
      parsedAuthData.attempts++;
      // 인증 코드 입력 시도 횟수가 5회 이상이면 30분 간 인증 시도 제한.
      if (parsedAuthData.attempts >= 5){
        const blockData = JSON.stringify({
          generatedAt: new Date().getTime()
        });
        await mockRedis.set(`block:${cleanPhoneNumber}`, blockData, 'EX', 1800);
        await mockRedis.del(`auth:${cleanPhoneNumber}`);
        const parsedBlockData = JSON.parse(blockData);
        throw new TooManyCodeAttemptsError(`인증 번호가 틀렸습니다. 인증 시도 횟수를 초과했습니다. 30분 후 다시 시도해주세요. blockedAt: ${new Date(parsedBlockData.generatedAt).toISOString()}, availableAt: ${new Date(parsedBlockData.generatedAt + 1800000).toISOString()}`);
      }
      const remainingAuthTimeSeconds = Math.ceil((parsedAuthData.generatedAt + 1800000 - new Date().getTime()) / 1000);
      await mockRedis.set(`auth:${cleanPhoneNumber}`, JSON.stringify(parsedAuthData), 'EX', remainingAuthTimeSeconds);
      throw new CodeMismatchError(`인증 코드가 일치하지 않습니다.`);
    }
    // 인증 코드 일치 시 Redis에서 인증 코드 삭제 후 true 리턴.
    await mockRedis.del(`auth:${cleanPhoneNumber}`);
    return true;
  } 
}