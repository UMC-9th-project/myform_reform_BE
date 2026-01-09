import { Route, Controller, Post, SuccessResponse, BodyProp, Response, Example, Tags } from 'tsoa';
import { TsoaResponse, ResponseHandler, ErrorResponse } from '../../config/tsoaResponse.js';
import { AuthService } from './auth.service.js';
import { SmsProviderError } from '../../middleware/error.js';
import { validatePhoneNumber } from '../../utils/validators.js';

@Route('auth')
@Tags('Auth')
export class AuthController extends Controller {
  private authService = new AuthService();
  @SuccessResponse(201, 'SMS 전송 완료')
  @Example<ResponseHandler<any>>({
    resultType: 'SUCCESS',
    error: null,
    success: {groupInfo: {response: {statusCode: 201, message: 'SMS 전송이 완료되었습니다.'}}}
  })
  @Response<ErrorResponse>('400', '입력값 유효성 검증 실패', {
    resultType: 'FAIL',
    error: {
      errorCode: 'Auth_001',
      reason: '입력 형식이 올바르지 않습니다.',
      data: '유효하지 않은 전화번호 형식입니다. (01x 시작, 숫자 10-11자리)'
    },
    success: null
  })
  @Response<ErrorResponse>('429', '인증 시도 횟수 초과', {
    resultType: 'FAIL',
    error: {
      errorCode: 'Auth_004',
      reason: '인증 코드 입력 시도 횟수를 초과했습니다.',
      data: '입력하신 번호는 인증 코드 입력 시도 횟수를 초과했습니다.'
    },
    success: null
  })
  @Response<ErrorResponse>('500', '서버 내부 오류 (SMS 발송 또는 Redis 저장 실패)', {
    resultType: 'FAIL',
    error: {
      errorCode: 'Auth_002',
      reason: 'SMS 전송 중 오류가 발생했습니다.',
      data: 'SOLAPI API 요청 실패 : ${error.message}'
    },
    success: null
  })
  @Response<ErrorResponse>('500', '서버 내부 오류 (SMS 발송 또는 Redis 저장 실패)', {
    resultType: 'FAIL',
    error: {
      errorCode: 'Auth_003',
      reason: 'Redis에 인증 정보 저장 중 오류가 발생했습니다.',
      data: 'Redis 저장 실패 : ${error.message}'
    },
    success: null
  })
  @Post('sms/send')
  public async sendSms(
    @BodyProp() phoneNumber: string): Promise<TsoaResponse<string>> {
    validatePhoneNumber(phoneNumber);
    try {
      await this.authService.sendSms(phoneNumber);
      const successResponse = {
        statusCode: 201,
        message: 'SMS 전송이 완료되었습니다.'
      };
      return new ResponseHandler<any>(successResponse);
    } catch (error: any){
      if (error.status) throw error;
      throw new SmsProviderError(error.message);
    }
  }
}