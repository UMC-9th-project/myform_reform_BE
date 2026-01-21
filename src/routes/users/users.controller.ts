import { Body, Path, Post, Patch, Controller, Route, Tags, Query, SuccessResponse, Example, Response } from 'tsoa';
import { ErrorResponse, ResponseHandler, TsoaResponse } from '../../config/tsoaResponse.js';
import { CheckNicknameResponse, UpdateReformerStatusRequest, UsersInfoResponse } from './users.dto.js';
import { UsersService } from './users.service.js';


@Route('users')
@Tags('Users')
export class UsersController extends Controller {
  private usersService = new UsersService();

  /**
   * 
   * @summary 닉네임 중복 검사
   * @param nickname 검사할 닉네임
   * @returns 닉네임 중복 검사 결과
   */
  @SuccessResponse(200, '닉네임 중복 검사 성공')
  @Example<ResponseHandler<CheckNicknameResponse>>({
    resultType: 'SUCCESS',
    error: null,
    success: {
      isAvailable: true,
      nickname: 'userNickname',
      message: '사용 가능한 닉네임입니다.'
    }
  })
  @Response<ErrorResponse>('400', '닉네임 형식 오류')
  @Response<ErrorResponse>('500', '서버 내부 오류')
  @Post('nickname-check')
  public async checkNickname(
    @Query() nickname: string
  ): Promise<TsoaResponse<CheckNicknameResponse>> {
    const result = await this.usersService.checkNickname(nickname);
    return new ResponseHandler<CheckNicknameResponse>(result);
  }

  /**
   * @summary 리폼러 상태 업데이트
   * @param reformerId 리폼러 ID
   * @param requestBody 목표 상태 (PENDING, APPROVED, REJECTED)
   * @returns 리폼러 상태 업데이트 결과
   */
  @SuccessResponse(200, '리폼러 상태 업데이트 성공')
  @Example<ResponseHandler<UsersInfoResponse>>({
    resultType: 'SUCCESS',
    error: null,
    success: {
      id: 'reformerId',
      email: 'reformerEmail',
      nickname: 'reformerNickname',
      role: 'reformer',
      auth_status: 'PENDING'
    }
  })
  @Response<ErrorResponse>('400', '목표 상태 형식 오류')
  @Response<ErrorResponse>('500', '서버 내부 오류')
  @Patch('reformer/{reformerId}/status')
  public async updateReformerStatus(
    @Path() reformerId: string,
    @Body() requestBody: UpdateReformerStatusRequest
  ): Promise<TsoaResponse<UsersInfoResponse>> {
    const result = await this.usersService.updateReformerStatus(reformerId, requestBody);
    return new ResponseHandler<UsersInfoResponse>(result);
  }
}