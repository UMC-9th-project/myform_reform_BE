import { 
  Route, 
  Controller, 
  Post, 
  SuccessResponse, 
  Body, 
  Response, 
  Example, 
  Tags,
} from 'tsoa';
import { TsoaResponse, ResponseHandler, ErrorResponse } from '../../config/tsoaResponse.js';
import { AuthService } from './auth.service.js';
import { BasicError } from '../../middleware/error.js';
import { SmsProviderError, UnknownAuthError } from './auth.error.js';
import { validatePhoneNumber, validateCode } from '../../utils/validators.js';
import { SendSmsRequest, VerifySmsRequest, SendSmsResponse, VerifySmsResponse } from './auth.dto.js';

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
    validatePhoneNumber(requestBody.phoneNumber);
    try {
      await this.authService.sendSms(requestBody.phoneNumber);
      return new ResponseHandler<SendSmsResponse>({
        statusCode: 200,
        message: 'SMS 전송이 완료되었습니다.'
      });
    } catch (error: any){
      if (error instanceof BasicError) throw error;
      const msg = error?.message ?? 'SMS 전송 중 알 수 없는 오류가 발생했습니다.';
      throw new SmsProviderError(msg);
    }
  }
  /**
   * 입력한 휴대폰 번호와 인증 코드를 검증합니다.
   *
   * @summary 인증 코드를 검증합니다.
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
    validatePhoneNumber(requestBody.phoneNumber);
    validateCode(requestBody.code);
    try {
      await this.authService.verifySms(requestBody.phoneNumber, requestBody.code);
      return new ResponseHandler<VerifySmsResponse>({
        statusCode: 200,
        message: '인증이 성공적으로 완료되었습니다.'
      });
    } catch (error: any){
      if (error instanceof BasicError) throw error;
      const msg = error?.message ?? '인증 중 알 수 없는 오류가 발생했습니다.';
      throw new UnknownAuthError(msg);
    }
  }
}