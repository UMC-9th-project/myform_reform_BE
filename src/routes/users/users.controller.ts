import { Body, Path, Post, Patch, Controller, Route, Tags, Query, SuccessResponse, Example, Response, Request, Security, Get } from 'tsoa';
import { ErrorResponse, ResponseHandler, TsoaResponse } from '../../config/tsoaResponse.js';
import { CheckNicknameResponse, ReformerDetailInfoResponse, UpdateReformerProfileResult, UserDetailInfoResponse, UsersInfoResponse } from './dto/users.res.dto.js';
import { UpdateReformerStatusRequest, UpdateUserProfileRequest, UpdateReformerProfileRequest, UpdateUserImageRequest } from './dto/users.req.dto.js';
import { UpdateUserImageResult, UpdateUserProfileResult } from './dto/users.res.dto.js';
import { UsersService } from './users.service.js';
import { UnauthorizedError } from '../auth/auth.error.js';


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
   * @param requestBody 업데이트할 유저 프로필 사진 URL
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
      profileImageUrl: 'https://myform-reform.s3.ap-northeast-2.amazonaws.com/profileImages/1234567890.jpg'
    }
  })
  @Response<ErrorResponse>('400', '유저 프로필 사진 업데이트 실패 (형식 오류)')
  @Response<ErrorResponse>('500', '유저 프로필 사진 업데이트 실패 (DB 오류)')
  @Patch('user/me/profile/image')
  public async updateUserImage(
    @Body() requestBody: UpdateUserImageRequest, @Request() req: Request
  ): Promise<TsoaResponse<UpdateUserImageResult>> {
    const { profileImageUrl } = requestBody;
    const userId = (req as any).user.id;
    const result = await this.usersService.updateUserImage(userId, profileImageUrl as string);
    return new ResponseHandler<UpdateUserImageResult>(result);
  }


  /**
   * @summary 리폼러 프로필을 업데이트합니다. (프로필 사진 제외)
   * @param requestBody 업데이트할 정보
   * @returns 리폼러 프로필 업데이트 결과
   */
  @Security('jwt', ['reformer', 'reformer:approved'])
  @SuccessResponse(200, '리폼러 프로필 업데이트 성공')
  @Example<ResponseHandler<UpdateReformerProfileResult>>({
    resultType: 'SUCCESS',
    error: null,
    success: {
      reformerId: 'reformerId',
      nickname: 'nickname',
      bio: 'bio',
      keywords: ['keyword1', 'keyword2']
    }
  })
  @Response<ErrorResponse>('400', '리폼러 프로필 업데이트 실패 (형식 오류)')
  @Response<ErrorResponse>('500', '리폼러 프로필 업데이트 실패 (DB 오류)')
  @Response<ErrorResponse>('500', '리폼러 프로필 업데이트 실패 (알 수 없는 오류)')
  @Patch('reformer/me/profile')
  public async updateReformerProfile(
    @Body() requestBody: UpdateReformerProfileRequest, @Request() req: Request
  ): Promise<TsoaResponse<UpdateReformerProfileResult>> {
    const reformerId = (req as any).user.id;
    const result = await this.usersService.updateReformerProfile(reformerId, requestBody);
    return new ResponseHandler<UpdateReformerProfileResult>(result);
  }

  /**
   * @summary 사용자 정보를 불러옵니다.
   */
  @Security('jwt')
  @SuccessResponse(200, '사용자 정보 조회 성공')
  @Example<ResponseHandler<UserDetailInfoResponse | ReformerDetailInfoResponse>>({
    resultType: 'SUCCESS',
    error: null,
    success: {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      role: 'user',
      email: 'user@example.com',
      name: 'name',
      nickname: 'nickname',
      phone: '01012345678',
      profileImageUrl: 'https://myform-reform.s3.ap-northeast-2.amazonaws.com/profileImages/1234567890.jpg',
    }
  })
  @Response<ErrorResponse>('400', '사용자 정보 조회 실패 (형식 오류)')
  @Response<ErrorResponse>('500', '사용자 정보 조회 실패 (DB 오류)')
  @Response<ErrorResponse>('500', '사용자 정보 조회 실패 (알 수 없는 오류)')
  @Get('me')
  public async getUserDetailInfo(
    @Request() req: Request
  ): Promise<TsoaResponse<UserDetailInfoResponse | ReformerDetailInfoResponse>> {
    const user = (req as any).user;
    if (!user) {
      throw new UnauthorizedError('로그인 상태가 아닙니다. jwt 토큰이 없습니다.');
    }
    const userId = user.id;
    const role = user.role;
    let result: UserDetailInfoResponse | ReformerDetailInfoResponse | null;
    if (role === 'user') {
      result = await this.usersService.getUserDetailInfo(userId);
    } else {
      result = await this.usersService.getReformerDetailInfo(userId);
    }
    return new ResponseHandler<UserDetailInfoResponse | ReformerDetailInfoResponse>(result);
  }
}