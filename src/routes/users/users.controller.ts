import { Body, Path, Post, Patch, Controller, Route, Tags, Query, SuccessResponse, Example, Response, Request, UploadedFile, Security } from 'tsoa';
import { ErrorResponse, ResponseHandler, TsoaResponse } from '../../config/tsoaResponse.js';
import { CheckNicknameResponse, UsersInfoResponse } from './users.res.dto.js';
import { UpdateReformerStatusRequest, UpdateUserProfileRequest } from './users.req.dto.js';
import { UpdateUserImageResult, UpdateUserProfileResult } from './users.res.dto.js';
import { UsersService } from './users.service.js';


@Route('users')
@Tags('Users')
export class UsersController extends Controller {
  private usersService = new UsersService();

  /**
   * 
   * @summary 닉네임 중복 여부를 검사합니다.
   * @description 입력한 닉네임이 중복되는지 검사하여 사용 가능 여부, 닉네임, 메시지를 반환
   * @param nickname 검사할 닉네임
   * @returns 닉네임 중복 검사 결과 (사용 가능 여부, 닉네임, 메시지)
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
   * @summary 리폼러 인증 상태를 업데이트합니다.
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

  /**
   * @summary 일반 유저 자신의 프로필을 업데이트합니다. (프로필 사진 제외)
   * @param requestBody 업데이트할 정보
   * @returns 유저 프로필 업데이트 결과
   */
  @Security('jwt', ['user'])
  @SuccessResponse(200, '유저 프로필 업데이트 성공')
  @Example<ResponseHandler<UpdateUserProfileResult>>({
    resultType: 'SUCCESS',
    error: null,
    success: {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      nickname: 'nickname',
      phone: '01012345678',
      email: 'user@example.com'
    }
  })

  @Response<ErrorResponse>('400', '유저 프로필 업데이트 실패 (형식 오류)')
  @Response<ErrorResponse>('500', '유저 프로필 업데이트 실패 (DB 오류)')
  @Response<ErrorResponse>('500', '유저 프로필 업데이트 실패 (알 수 없는 오류)')
  @Patch('user/me/profile')
  public async updateUserProfile(
    @Body() requestBody: UpdateUserProfileRequest, @Request() req: Request
  ): Promise<TsoaResponse<UpdateUserProfileResult>> {
    const userId = (req as any).user.id;
    const result = await this.usersService.updateUserProfile(userId, requestBody);
    return new ResponseHandler<UpdateUserProfileResult>(result);
  }

  /**
   * @summary 유저 프로필 사진을 업데이트합니다.
   * @description 유저 프로필 사진을 업데이트하여 반환
   * @returns 유저 프로필 사진 업데이트 결과
  */
  @Security('jwt', ['user'])
  @SuccessResponse(200, '유저 프로필 사진 업데이트 성공')
  @Example<ResponseHandler<UpdateUserImageResult>>({
    resultType: 'SUCCESS',
    error: null,
    success: {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      profileUrl: 'https://myform-reform.s3.ap-northeast-2.amazonaws.com/profileImages/1234567890.jpg'
    }
  })
  @Response<ErrorResponse>('400', '유저 프로필 사진 업데이트 실패 (형식 오류)')
  @Response<ErrorResponse>('500', '유저 프로필 사진 업데이트 실패 (DB 오류)')
  @Patch('user/me/profile/image')
  public async updateUserImage(
    @UploadedFile('profileImage') profileImage: Express.Multer.File, @Request() req: Request
  ): Promise<TsoaResponse<UpdateUserImageResult>> {
    const userId = (req as any).user.id;
    const result = await this.usersService.updateUserImage(userId, profileImage);
    return new ResponseHandler<UpdateUserImageResult>(result);
  }
}