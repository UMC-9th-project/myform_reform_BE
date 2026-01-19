import {
  Controller,
  Example,
  Get,
  Header,
  Path,
  Query,
  Response,
  Route,
  SuccessResponse,
  Tags
} from 'tsoa';
import { TsoaResponse, ErrorResponse, commonError } from '../../config/tsoaResponse.js';
import { MarketService } from './market.service.js';
import {
  GetItemListRequestDto,
  GetItemReviewsRequestDto,
  GetItemReviewPhotosRequestDto,
  GetReviewDetailRequestDto,
  type GetItemListResponseDto,
  type GetItemDetailResponseDto,
  type GetItemReviewsResponseDto,
  type GetItemReviewPhotosResponseDto,
  type GetReviewDetailResponseDto
} from './market.dto.js';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ValidateError } from 'tsoa';

@Route('market')
@Tags('Market')
export class MarketController extends Controller {
  private marketService: MarketService;

  constructor() {
    super();
    this.marketService = new MarketService();
  }

  /**
   * 상품 목록 조회
   * @summary 마켓 상품 목록을 조회합니다
   * @param categoryId 카테고리 ID (선택)
   * @param sort 정렬 기준 (popular/latest, 기본: popular)
   * @param page 페이지 번호 (기본: 1)
   * @param limit 페이지당 개수 (기본: 15)
   * @param userId 사용자 ID (임시, 헤더에서 추출) - TODO: JWT 구현 후 변경
   * @returns 상품 목록 조회 결과
   */
  @Get('/')
  @SuccessResponse(200, '상품 목록 조회 성공')
  @Response<ErrorResponse>(
    400,
    '입력값 검증 실패',
    {
      resultType: 'FAIL',
      error: {
        errorCode: '400',
        reason: '입력값 검증 실패',
        data: {
          categoryId: ['categoryId는 UUID 형식이어야 합니다'],
          sort: ['sort는 popular 또는 latest여야 합니다'],
          page: ['page는 1 이상의 정수여야 합니다'],
          limit: ['limit는 1 이상 100 이하의 정수여야 합니다']
        }
      },
      success: null
    }
  )
  @Response<ErrorResponse>(
    500,
    '상품 목록 조회 실패',
    {
      resultType: 'FAIL',
      error: {
        errorCode: 'MARKET-ERROR',
        reason: '상품 목록 조회 실패',
        data: '상품 목록 조회 중 오류가 발생했습니다.'
      },
      success: null
    }
  )
  @Response<ErrorResponse>(500, '서버 에러', commonError.serverError)
  @Example<TsoaResponse<GetItemListResponseDto>>({
    resultType: 'SUCCESS',
    error: null,
    success: {
      items: [
        {
          item_id: '550e8400-e29b-41d4-a716-446655440000',
          thumbnail: 'https://example.com/thumbnail.jpg',
          title: '상품명',
          price: 50000,
          star: 4.5,
          review_count: 123,
          owner_nickname: '리포머닉네임',
          is_wished: false
        }
      ],
      total_count: 100,
      page: 1,
      limit: 15
    }
  })
  public async getItemList(
    @Query() categoryId?: string,
    @Query() sort: 'popular' | 'latest' = 'popular',
    @Query() page: number = 1,
    @Query() limit: number = 15,
    @Header('x-user-id') userId?: string
  ): Promise<TsoaResponse<GetItemListResponseDto>> {
    const dto = plainToInstance(GetItemListRequestDto, {
      category_id: categoryId,
      sort,
      page,
      limit
    });
    const errors = await validate(dto);
    if (errors.length > 0) {
      const formattedErrors: Record<string, { message: string; value?: any }> = {};
      errors.forEach((error) => {
        if (error.constraints) {
          const constraintMessages = Object.values(error.constraints);
          formattedErrors[error.property] = {
            message: constraintMessages[0] || '입력값 검증 실패',
            value: error.value
          };
        }
      });
      throw new ValidateError(formattedErrors, '입력값 검증 실패');
    }

    const result = await this.marketService.getItemList(
      categoryId,
      sort,
      page,
      limit,
      userId
    );

    return {
      resultType: 'SUCCESS',
      error: null,
      success: result
    };
  }

  /**
   * 상품 상세 조회
   * @summary 상품 상세 정보를 조회합니다
   * @param itemId 상품 ID
   * @param userId 사용자 ID (임시, 헤더에서 추출) - TODO: JWT 구현 후 변경
   * @returns 상품 상세 조회 결과
   */
  @Get('/{itemId}')
  @SuccessResponse(200, '상품 상세 조회 성공')
  @Response<ErrorResponse>(
    404,
    '상품을 찾을 수 없습니다.',
    {
      resultType: 'FAIL',
      error: {
        errorCode: 'ITEM-NOT-FOUND',
        reason: '상품을 찾을 수 없습니다.',
        data: 'Item ID: {itemId}'
      },
      success: null
    }
  )
  @Response<ErrorResponse>(
    500,
    '상품 상세 조회 실패',
    {
      resultType: 'FAIL',
      error: {
        errorCode: 'MARKET-ERROR',
        reason: '상품 상세 조회 실패',
        data: '상품 상세 조회 중 오류가 발생했습니다.'
      },
      success: null
    }
  )
  @Response<ErrorResponse>(500, '서버 에러', commonError.serverError)
  @Example<TsoaResponse<GetItemDetailResponseDto>>({
    resultType: 'SUCCESS',
    error: null,
    success: {
      item_id: '550e8400-e29b-41d4-a716-446655440000',
      title: '상품명',
      images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
      price: 50000,
      delivery: 3000,
      delivery_info: '배송 정보',
      option_groups: [
        {
          option_group_id: '660e8400-e29b-41d4-a716-446655440001',
          name: '옵션그룹1',
          option_items: [
            {
              option_item_id: '770e8400-e29b-41d4-a716-446655440002',
              name: '옵션1',
              extra_price: 5000,
              quantity: 10
            }
          ]
        }
      ],
      reformer: {
        owner_id: '880e8400-e29b-41d4-a716-446655440003',
        profile_image: 'https://example.com/profile.jpg',
        nickname: '리포머닉네임',
        star: 4.8,
        order_count: 500
      },
      is_wished: false,
      review_summary: {
        total_review_count: 123,
        photo_review_count: 45,
        avg_star: 4.5,
        preview_photos: [
          {
            photo_index: 0,
            review_id: '990e8400-e29b-41d4-a716-446655440004',
            photo_url: 'https://example.com/review1.jpg'
          }
        ],
        remaining_photo_count: 44
      },
      reviews: [
        {
          review_id: '990e8400-e29b-41d4-a716-446655440004',
          user_profile_image: 'https://example.com/user.jpg',
          user_nickname: '사용자닉네임',
          star: 5,
          created_at: new Date('2024-12-01T10:30:00Z'),
          content: '리뷰 내용',
          product_thumbnail: 'https://example.com/product.jpg',
          photos: ['https://example.com/review1.jpg']
        }
      ]
    }
  })
  public async getItemDetail(
    @Path() itemId: string,
    @Header('x-user-id') userId?: string
  ): Promise<TsoaResponse<GetItemDetailResponseDto>> {
    const result = await this.marketService.getItemDetail(itemId, userId);

    return {
      resultType: 'SUCCESS',
      error: null,
      success: result
    };
  }

  /**
   * 상품 리뷰 목록 조회
   * @summary 상품의 리뷰 목록을 조회합니다
   * @param itemId 상품 ID
   * @param page 페이지 번호 (기본: 1)
   * @param limit 페이지당 개수 (기본: 4)
   * @param sort 정렬 기준 (latest: 최신순, star_high: 평점높은순, star_low: 평점낮은순, 기본: latest)
   * @returns 리뷰 목록 조회 결과
   */
  @Get('/{itemId}/reviews')
  @SuccessResponse(200, '리뷰 목록 조회 성공')
  @Response<ErrorResponse>(
    400,
    '입력값 검증 실패',
    {
      resultType: 'FAIL',
      error: {
        errorCode: '400',
        reason: '입력값 검증 실패',
        data: {
          page: ['page는 1 이상의 정수여야 합니다'],
          limit: ['limit는 1 이상 100 이하의 정수여야 합니다'],
          sort: ['sort는 latest, star_high, star_low 중 하나여야 합니다']
        }
      },
      success: null
    }
  )
  @Response<ErrorResponse>(
    404,
    '상품을 찾을 수 없습니다.',
    {
      resultType: 'FAIL',
      error: {
        errorCode: 'ITEM-NOT-FOUND',
        reason: '상품을 찾을 수 없습니다.',
        data: 'Item ID: {itemId}'
      },
      success: null
    }
  )
  @Response<ErrorResponse>(
    500,
    '리뷰 목록 조회 실패',
    {
      resultType: 'FAIL',
      error: {
        errorCode: 'MARKET-ERROR',
        reason: '리뷰 목록 조회 실패',
        data: '리뷰 목록 조회 중 오류가 발생했습니다.'
      },
      success: null
    }
  )
  @Response<ErrorResponse>(500, '서버 에러', commonError.serverError)
  @Example<TsoaResponse<GetItemReviewsResponseDto>>({
    resultType: 'SUCCESS',
    error: null,
    success: {
      reviews: [
        {
          review_id: '990e8400-e29b-41d4-a716-446655440004',
          user_profile_image: 'https://example.com/user.jpg',
          user_nickname: '사용자닉네임',
          star: 5,
          created_at: new Date('2024-12-01T10:30:00Z'),
          content: '리뷰 내용',
          product_thumbnail: 'https://example.com/product.jpg',
          photos: ['https://example.com/review1.jpg']
        }
      ],
      total_count: 123,
      avg_star: 4.5,
      page: 1,
      limit: 4,
      total_pages: 31,
      has_next_page: true,
      has_prev_page: false
    }
  })
  public async getItemReviews(
    @Path() itemId: string,
    @Query() page: number = 1,
    @Query() limit: number = 4,
    @Query() sort: 'latest' | 'star_high' | 'star_low' = 'latest'
  ): Promise<TsoaResponse<GetItemReviewsResponseDto>> {
    const dto = plainToInstance(GetItemReviewsRequestDto, { page, limit, sort });
    const errors = await validate(dto);
    if (errors.length > 0) {
      const formattedErrors: Record<string, { message: string; value?: any }> = {};
      errors.forEach((error) => {
        if (error.constraints) {
          const constraintMessages = Object.values(error.constraints);
          formattedErrors[error.property] = {
            message: constraintMessages[0] || '입력값 검증 실패',
            value: error.value
          };
        }
      });
      throw new ValidateError(formattedErrors, '입력값 검증 실패');
    }

    const result = await this.marketService.getItemReviews(itemId, page, limit, sort);

    return {
      resultType: 'SUCCESS',
      error: null,
      success: result
    };
  }

  /**
   * 사진 후기 조회 (무한 스크롤)
   * @summary 상품의 사진 후기를 조회합니다 (더보기 페이지에서 사용, 최신순 정렬)
   * @param itemId 상품 ID
   * @param offset 시작 위치 (기본: 0, 스크롤 시 증가)
   * @param limit 페이지당 개수 (기본: 15, 초기 로드 시 사용. 이후 스크롤 시 30개 권장)
   * @returns 사진 후기 조회 결과 (has_more로 다음 데이터 존재 여부 확인, 최신순 정렬)
   */
  @Get('/{itemId}/reviews/photos')
  @SuccessResponse(200, '사진 후기 조회 성공')
  @Response<ErrorResponse>(
    400,
    '입력값 검증 실패',
    {
      resultType: 'FAIL',
      error: {
        errorCode: '400',
        reason: '입력값 검증 실패',
        data: {
          offset: ['offset는 0 이상의 정수여야 합니다'],
          limit: ['limit는 1 이상 100 이하의 정수여야 합니다']
        }
      },
      success: null
    }
  )
  @Response<ErrorResponse>(
    404,
    '상품을 찾을 수 없습니다.',
    {
      resultType: 'FAIL',
      error: {
        errorCode: 'ITEM-NOT-FOUND',
        reason: '상품을 찾을 수 없습니다.',
        data: 'Item ID: {itemId}'
      },
      success: null
    }
  )
  @Response<ErrorResponse>(
    500,
    '사진 후기 조회 실패',
    {
      resultType: 'FAIL',
      error: {
        errorCode: 'MARKET-ERROR',
        reason: '사진 후기 조회 실패',
        data: '사진 후기 조회 중 오류가 발생했습니다.'
      },
      success: null
    }
  )
  @Response<ErrorResponse>(500, '서버 에러', commonError.serverError)
  @Example<TsoaResponse<GetItemReviewPhotosResponseDto>>({
    resultType: 'SUCCESS',
    error: null,
    success: {
      photos: [
        {
          photo_index: 0,
          review_id: '990e8400-e29b-41d4-a716-446655440004',
          photo_url: 'https://example.com/review1.jpg',
          photo_order: 1
        }
      ],
      has_more: true,
      offset: 0,
      limit: 15,
      total_count: 45
    }
  })
  public async getItemReviewPhotos(
    @Path() itemId: string,
    @Query() offset: number = 0,
    @Query() limit: number = 15
  ): Promise<TsoaResponse<GetItemReviewPhotosResponseDto>> {
    const dto = plainToInstance(GetItemReviewPhotosRequestDto, { offset, limit });
    const errors = await validate(dto);
    if (errors.length > 0) {
      const formattedErrors: Record<string, { message: string; value?: any }> = {};
      errors.forEach((error) => {
        if (error.constraints) {
          const constraintMessages = Object.values(error.constraints);
          formattedErrors[error.property] = {
            message: constraintMessages[0] || '입력값 검증 실패',
            value: error.value
          };
        }
      });
      throw new ValidateError(formattedErrors, '입력값 검증 실패');
    }

    const actualLimit = offset === 0 ? (limit ?? 15) : (limit ?? 30);
    const result = await this.marketService.getItemReviewPhotos(
      itemId,
      offset,
      actualLimit
    );

    return {
      resultType: 'SUCCESS',
      error: null,
      success: result
    };
  }

  /**
   * 리뷰 상세 조회
   * @summary 특정 리뷰의 상세 정보를 조회합니다
   * @param itemId 상품 ID
   * @param reviewId 리뷰 ID
   * @param photoIndex 전체 사진 리스트에서의 인덱스 (선택사항)
   *   - 사진 후기 더보기에서 클릭한 경우: 전체 사진 리스트 기준 네비게이션 정보 제공
   *   - 전체 리뷰에서 사진 클릭한 경우: 해당 리뷰의 사진만 표시 (photo_urls 배열 사용)
   * @returns 리뷰 상세 정보
   */
  @Get('/{itemId}/reviews/{reviewId}')
  @SuccessResponse(200, '리뷰 상세 조회 성공')
  @Response<ErrorResponse>(
    400,
    '입력값 검증 실패',
    {
      resultType: 'FAIL',
      error: {
        errorCode: '400',
        reason: '입력값 검증 실패',
        data: {
          photoIndex: ['photoIndex는 0 이상의 정수여야 합니다']
        }
      },
      success: null
    }
  )
  @Response<ErrorResponse>(
    404,
    '상품을 찾을 수 없습니다.',
    {
      resultType: 'FAIL',
      error: {
        errorCode: 'ITEM-NOT-FOUND',
        reason: '상품을 찾을 수 없습니다.',
        data: 'Item ID: {itemId}'
      },
      success: null
    }
  )
  @Response<ErrorResponse>(
    404,
    '리뷰를 찾을 수 없습니다.',
    {
      resultType: 'FAIL',
      error: {
        errorCode: 'REVIEW-NOT-FOUND',
        reason: '리뷰를 찾을 수 없습니다.',
        data: 'Review ID: {reviewId}'
      },
      success: null
    }
  )
  @Response<ErrorResponse>(
    500,
    '리뷰 상세 조회 실패',
    {
      resultType: 'FAIL',
      error: {
        errorCode: 'MARKET-ERROR',
        reason: '리뷰 상세 조회 실패',
        data: '리뷰 상세 조회 중 오류가 발생했습니다.'
      },
      success: null
    }
  )
  @Response<ErrorResponse>(500, '서버 에러', commonError.serverError)
  @Example<TsoaResponse<GetReviewDetailResponseDto>>({
    resultType: 'SUCCESS',
    error: null,
    success: {
      review_id: '990e8400-e29b-41d4-a716-446655440004',
      user_profile_image: 'https://example.com/user.jpg',
      user_nickname: '사용자닉네임',
      star: 5,
      created_at: new Date('2024-12-01T10:30:00Z'),
      content: '리뷰 내용',
      photo_urls: ['https://example.com/review1.jpg', 'https://example.com/review2.jpg'],
      product_thumbnail: 'https://example.com/product.jpg',
      current_photo_index: 0,
      total_photo_count: 2,
      has_prev: false,
      has_next: true,
      prev_photo_index: undefined,
      next_photo_index: 1
    }
  })
  public async getReviewDetail(
    @Path() itemId: string,
    @Path() reviewId: string,
    @Query() photoIndex?: number
  ): Promise<TsoaResponse<GetReviewDetailResponseDto>> {
    if (photoIndex !== undefined) {
      const dto = plainToInstance(GetReviewDetailRequestDto, { photoIndex });
      const errors = await validate(dto);
      if (errors.length > 0) {
        const formattedErrors: Record<string, { message: string; value?: any }> = {};
        errors.forEach((error) => {
          if (error.constraints) {
            const constraintMessages = Object.values(error.constraints);
            formattedErrors[error.property] = {
              message: constraintMessages[0] || '입력값 검증 실패',
              value: error.value
            };
          }
        });
        throw new ValidateError(formattedErrors, '입력값 검증 실패');
      }
    }

    const result = await this.marketService.getReviewDetail(
      itemId,
      reviewId,
      photoIndex
    );

    return {
      resultType: 'SUCCESS',
      error: null,
      success: result
    };
  }
}
