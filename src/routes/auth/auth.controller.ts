import { Route, Controller, Post, SuccessResponse, BodyProp, Response, Example, Tags } from 'tsoa';
import { TsoaResponse, ResponseHandler, ErrorResponse } from '../../config/tsoaResponse.js';
import { AuthService } from './auth.service.js';
import { BasicError, SmsProviderError, UnknownAuthError } from '../../middleware/error.js';
import { validatePhoneNumber, validateCode } from '../../utils/validators.js';

@Route('auth')
@Tags('Auth')
export class AuthController extends Controller {
  private authService = new AuthService();
  @SuccessResponse(200, 'SMS 전송 완료')
  @Example<ResponseHandler<any>>({
    resultType: 'SUCCESS',
    error: null,
    success: {statusCode: 200, message: 'SMS 전송이 완료되었습니다.'}
  })
  @Response<ErrorResponse>('400', '입력값 유효성 검증 실패', {
    resultType: 'FAIL',
    error: {
      errorCode: 'Auth_001',
      reason: '입력 형식이 올바르지 않습니다.',
      data: '유효하지 않은 전화번호 형식입니다. 입력받은 전화번호 : 0101234'
    },
    success: null
  })
  @Response<ErrorResponse>('429', '인증 시도 횟수 초과', {
    resultType: 'FAIL',
    error: {
      errorCode: 'Auth_004',
      reason: '인증 코드 입력 시도 횟수를 초과했습니다.',
      data: 'blockedAt: 2026-01-10T16:01:30.523Z, availableAt: 2026-01-10T16:31:30.523Z'
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
    @BodyProp() phoneNumber: string): Promise<TsoaResponse<any>> {
    validatePhoneNumber(phoneNumber);
    try {
      await this.authService.sendSms(phoneNumber);
      const successResponse = {
        statusCode: 200,
        message: 'SMS 전송이 완료되었습니다.'
      };
      return new ResponseHandler<any>(successResponse);
    } catch (error: any){
      if (error instanceof BasicError) throw error;
      const msg = error?.message ?? 'SMS 전송 중 알 수 없는 오류가 발생했습니다.'
      throw new SmsProviderError(msg);
    }
  }

  @SuccessResponse(200, '인증 코드 검증 성공')
  @Example<ResponseHandler<any>>({
    resultType: 'SUCCESS',
    error: null,
    success: {statusCode: 200, message: '인증이 성공적으로 완료되었습니다.'}
  })
  @Response<ErrorResponse>('429', '인증 시도 횟수 초과', {
    resultType: 'FAIL',
    error: {
      errorCode: 'Auth_004',
      reason: '인증 코드 입력 시도 횟수를 초과했습니다.',
      data: 'blockedAt: 2026-01-10T16:01:30.523Z, availableAt: 2026-01-10T16:31:30.523Z'
    },
    success: null
  })
  @Response<ErrorResponse>('400', '인증 형식 오류 또는 만료 또는 부재 또는 일치하지 않음', {
    resultType: 'FAIL',
    error: {
      errorCode: 'Auth_005',
      reason: '인증 코드가 만료되었거나 존재하지 않습니다.',
      data: '입력하신 인증 코드가 만료되었거나 존재하지 않습니다.'
    },
    success: null
  })
  @Response<ErrorResponse>('400', '인증 형식 오류 또는 만료 또는 부재 또는 일치하지 않음', {
    resultType: 'FAIL',
    error: {
      errorCode: 'Auth_006',
      reason: '인증 코드가 일치하지 않습니다.',
      data: '인증 코드가 일치하지 않습니다.'
    },
    success: null
  })
  @Response<ErrorResponse>('400', '입력 형식 오류 또는 만료 또는 부재 또는 일치하지 않음', {
    resultType: 'FAIL',
    error: {
      errorCode: 'Auth_001',
      reason: '입력 형식이 올바르지 않습니다.',
      data: '유효하지 않은 인증 코드 형식입니다. 입력받은 인증 코드 : 1234567'
    },
    success: null
  })
  @Response<ErrorResponse>('400', '입력 형식 오류 또는 만료 또는 부재 또는 일치하지 않음', {
    resultType: 'FAIL',
    error: {
      errorCode: 'Auth_001',
      reason: '입력 형식이 올바르지 않습니다.',
      data: '유효하지 않은 전화번호 형식입니다. 입력받은 전화번호 : 0101234'
    },
    success: null
  })
  @Response<ErrorResponse>('500', '서버 내부 오류 (인증 코드 검증 실패)', {
    resultType: 'FAIL',
    error: {
      errorCode: 'Auth_999',
      reason: '인증 코드 검증 중 오류가 발생했습니다.',
      data: '인증 중 알 수 없는 오류가 발생했습니다.'
    },
    success: null
  })
  @Post('sms/verify')
  public async verifySms(
    @BodyProp() phoneNumber: string,
    @BodyProp() code: string): Promise<TsoaResponse<any>> {
    validatePhoneNumber(phoneNumber);
    validateCode(code);
    try {
      const result = await this.authService.verifySms(phoneNumber, code);
      const successResponse = {
        statusCode: 200,
        message: '인증이 성공적으로 완료되었습니다.'
      };
      return new ResponseHandler<any>(successResponse);
    } 
      catch (error: any){
      if (error instanceof BasicError) throw error;
      const msg = error?.message ?? '인증 중 알 수 없는 오류가 발생했습니다.'
      throw new UnknownAuthError(msg);
    }
  }
}