import {
  Controller,
  Post,
  Route,
  SuccessResponse,
  Response,
  Tags,
  Get,
  Path,
  Body,
  Query,
  Security,
  Request,
  Delete
} from 'tsoa';
import type { Request as ExRequest } from 'express';
import { ReviewsService } from './reviews.service.js';
import { ReviewResponseDto } from './reviews.model.js';
import {
  ErrorResponse,
  ResponseHandler,
  TsoaResponse,
  commonError
} from '../../config/tsoaResponse.js';
import { UnauthorizedError } from '../auth/auth.error.js';


@Route('reviews')
@Tags('Reviews')
export class ReviewsController extends Controller {
  private reviewService: ReviewsService;
  constructor() {
    super();
    this.reviewService = new ReviewsService();
  }
  private requireUserId(userId?: string): string {
    if (!userId) {
      throw new UnauthorizedError('토큰에 userId가 존재하지 않거나 유효하지 않은 Access Token입니다.');
    }
    return userId;
  }

  /**
   * @ summary 작성한 리뷰를 조회합니다 (로그인 후 자신의 리뷰만 조회 가능)
   * @ returns 작성한 리뷰 목록
   * @ param cursor 페이지네이션 커서 (선택)
   * @ param limit 한 번에 조회할 개수
   * @ returns 작성한 리뷰 목록
   */
  @Get('/me')
  @Security('jwt', ['user'])
  @SuccessResponse(200, '리뷰 조회 성공')
  @Response<ErrorResponse>(401, '토큰에 userId가 존재하지 않거나 유효하지 않은 Access Token입니다.')
  @Response<ErrorResponse>(500, '서버에러', commonError.serverError)
  public async getReviews(
    @Request() req: ExRequest,
    @Query() cursor?: string,
    @Query() limit: number = 20,
  ): Promise<TsoaResponse<ReviewResponseDto>> {
    const userId = this.requireUserId(req.user?.id);
    const result = await this.reviewService.getReviews(
      userId,
      limit,
      cursor
    );
    return new ResponseHandler(result);
  }

  /**
   * @summary 리뷰를 삭제합니다.
   * @returns 리뷰 삭제 성공 여부
   * @param reviewId 삭제할 리뷰 ID
   */
  @Delete('/{reviewId}')
  @Security('jwt', ['user'])
  @SuccessResponse(200, '리뷰 삭제가 완료되었습니다.')
  @Response<ErrorResponse>(403, '권한이 없어 리뷰를 삭제할 수 없습니다. 리뷰 작성자가 아닙니다.')
  @Response<ErrorResponse>(404, '리뷰를 찾을 수 없습니다.')
  @Response<ErrorResponse>(500, '서버에러', commonError.serverError)
  public async deleteReview(
    @Request() req: ExRequest,
    @Path() reviewId: string): Promise<TsoaResponse<string>> {
    const userId = this.requireUserId(req.user?.id);
    const result = await this.reviewService.deleteReview(userId, reviewId);
    return new ResponseHandler(result);
  }
}