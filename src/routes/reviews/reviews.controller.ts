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
  Request
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


@Route('reviews')
@Tags('Reviews')
export class ReviewsController extends Controller {
  private reviewService: ReviewsService;
  constructor() {
    super();
    this.reviewService = new ReviewsService();
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
  @Response<ErrorResponse>(500, '서버에러', commonError.serverError)
  public async getReviews(
    @Request() req: ExRequest,
    @Query() cursor?: string,
    @Query() limit: number = 20,
  ): Promise<TsoaResponse<ReviewResponseDto>> {
    const userId = req.user?.id;
    const result = await this.reviewService.getReviews(
      userId,
      limit,
      cursor
    );
    return new ResponseHandler(result);
  }
}