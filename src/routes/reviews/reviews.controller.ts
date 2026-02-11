import {
  Controller,
  Route,
  SuccessResponse,
  Response,
  Tags,
  Get,
  Path,
  Query,
  Security,
  Request,
  Delete
} from 'tsoa';
import type { Request as ExRequest } from 'express';
import { ReviewsService } from './reviews.service.js';
import {
  ReviewResponseDto,
  ProposalReviewListResponseDto,
  ProposalReviewSortBy,
  GetItemReviewsResponseDto,
  GetItemReviewPhotosResponseDto,
  GetReviewDetailResponseDto
} from './reviews.model.js';
import {
  GetItemReviewsRequestDto,
  GetItemReviewPhotosRequestDto,
  GetReviewDetailRequestDto
} from './dto/reviews.req.dto.js';
import {
  ErrorResponse,
  ResponseHandler,
  TsoaResponse,
  commonError
} from '../../config/tsoaResponse.js';
import { UnauthorizedError } from '../auth/auth.error.js';
import { validateDto } from '../../middleware/validator.js';


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
   * @summary 작성한 리뷰를 조회합니다 (로그인 후 자신의 리뷰만 조회 가능)
   * @param req 요청 객체
   * @param cursor 페이지네이션 커서 (선택)
   * @param limit 한 번에 조회할 개수
   * @param order 정렬 순서 (asc: 오름차순, desc: 내림차순)
   * @returns 작성한 리뷰 목록
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
    @Query() order: 'asc' | 'desc' = 'desc'
  ): Promise<TsoaResponse<ReviewResponseDto>> {
    const userId = this.requireUserId(req.user?.id);
    const result = await this.reviewService.getReviews(
      userId,
      limit,
      cursor,
      order
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
    @Path() reviewId: string
  ): Promise<TsoaResponse<string>> {
    const userId = this.requireUserId(req.user?.id);
    const result = await this.reviewService.deleteReview(userId, reviewId);
    return new ResponseHandler(result);
  }

  /**
   * @summary 리폼러의 전체 리뷰 목록을 조회합니다.
   * @param reformerId 리폼러 ID (owner_id)
   * @param cursor 페이지네이션 커서 (선택)
   * @param limit 한 번에 조회할 개수
   * @param sortBy 정렬 방식 (recent: 최신순, high_rating: 평점 높은 순, low_rating: 평점 낮은 순)
   * @returns 리폼러 리뷰 목록 (총 리뷰 수, 평균 별점, 사진 후기 수, 리뷰 목록)
   */
  @Get('/reformer/{reformerId}')
  @SuccessResponse(200, '리폼러 리뷰 조회 성공')
  @Response<ErrorResponse>(500, '서버에러', commonError.serverError)
  public async getReformerReviews(
    @Path() reformerId: string,
    @Query() cursor?: string,
    @Query() limit: number = 10,
    @Query() sortBy: ProposalReviewSortBy = 'recent'
  ): Promise<TsoaResponse<ProposalReviewListResponseDto>> {
    const result = await this.reviewService.getReviewsByReformerId(
      reformerId,
      limit,
      cursor,
      sortBy
    );
    return new ResponseHandler(result);
  }

  /**
   * @summary 리뷰 목록 조회. targetType: ITEM|PROPOSAL|FEED|REQUEST, targetId: 해당 타입의 PK
   */
  @Get('/target/{targetType}/{targetId}/reviews')
  @SuccessResponse(200, '리뷰 목록 조회 성공')
  @Response<ErrorResponse>(400, '입력값 검증 실패')
  @Response<ErrorResponse>(500, '리뷰 목록 조회 실패', commonError.serverError)
  public async getTargetReviews(
    @Path() targetType: 'ITEM' | 'PROPOSAL' | 'FEED' | 'REQUEST',
    @Path() targetId: string,
    @Query() page: number = 1,
    @Query() limit: number = 4,
    @Query() sort: 'latest' | 'star_high' | 'star_low' = 'latest'
  ): Promise<TsoaResponse<GetItemReviewsResponseDto>> {
    const dto = await validateDto(GetItemReviewsRequestDto, {
      page,
      limit,
      sort
    });
    const result = await this.reviewService.getTargetReviews(
      targetType,
      targetId,
      dto.page ?? 1,
      dto.limit ?? 4,
      dto.sort ?? 'latest'
    );
    return new ResponseHandler(result);
  }

  /**
   * @summary 사진 후기 조회
   */
  @Get('/target/{targetType}/{targetId}/reviews/photos')
  @SuccessResponse(200, '사진 후기 조회 성공')
  @Response<ErrorResponse>(400, '입력값 검증 실패')
  @Response<ErrorResponse>(500, '사진 후기 조회 실패', commonError.serverError)
  public async getTargetReviewPhotos(
    @Path() targetType: 'ITEM' | 'PROPOSAL' | 'FEED' | 'REQUEST',
    @Path() targetId: string,
    @Query() offset: number = 0,
    @Query() limit: number = 15
  ): Promise<TsoaResponse<GetItemReviewPhotosResponseDto>> {
    const dto = await validateDto(GetItemReviewPhotosRequestDto, {
      offset,
      limit
    });
    const result = await this.reviewService.getTargetReviewPhotos(
      targetType,
      targetId,
      dto.offset ?? 0,
      dto.limit ?? 15
    );
    return new ResponseHandler(result);
  }

  /**
   * @summary 리뷰 상세 조회
   */
  @Get('/target/{targetType}/{targetId}/reviews/{reviewId}')
  @SuccessResponse(200, '리뷰 상세 조회 성공')
  @Response<ErrorResponse>(404, '리뷰를 찾을 수 없습니다.')
  @Response<ErrorResponse>(500, '리뷰 상세 조회 실패', commonError.serverError)
  public async getTargetReviewDetail(
    @Path() targetType: 'ITEM' | 'PROPOSAL' | 'FEED' | 'REQUEST',
    @Path() targetId: string,
    @Path() reviewId: string,
    @Query() photoIndex?: number
  ): Promise<TsoaResponse<GetReviewDetailResponseDto>> {
    if (photoIndex !== undefined) {
      await validateDto(GetReviewDetailRequestDto, { photoIndex });
    }
    const result = await this.reviewService.getTargetReviewDetail(
      targetType,
      targetId,
      reviewId,
      photoIndex
    );
    return new ResponseHandler(result);
  }
}