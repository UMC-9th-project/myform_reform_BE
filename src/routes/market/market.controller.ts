import {
  Controller,
  Example,
  Get,
  Header,
  Path,
  Query,
  Response,
  Route,
  Security,
  SuccessResponse,
  Tags,
  Request
} from 'tsoa';
import {
  TsoaResponse,
  ErrorResponse,
  commonError
} from '../../config/tsoaResponse.js';
import { MarketService } from './market.service.js';
import { GetItemListRequestDto } from './dto/market.req.dto.js';
import type { Request as ExpressRequest } from 'express';
import type {
  GetCategoriesResponseDto,
  GetItemListResponseDto,
  GetItemDetailResponseDto
} from './dto/market.res.dto.js';
import { validateDto } from '../../middleware/validator.js';

@Route('market')
@Tags('Market')
export class MarketController extends Controller {
  private marketService: MarketService;

  constructor() {
    super();
    this.marketService = new MarketService();
  }

  /**
   * 카테고리 목록 조회
   * @summary 마켓 필터용 카테고리 목록을 조회합니다
   * @returns 카테고리 목록 (categoryId, name, parentId, depth, sortOrder)
   */
  @Get('categories')
  @SuccessResponse(200, '카테고리 목록 조회 성공')
  @Response<ErrorResponse>(500, '서버 에러', commonError.serverError)
  public async getCategories(): Promise<
    TsoaResponse<GetCategoriesResponseDto>
  > {
    const result = await this.marketService.getCategories();
    return {
      resultType: 'SUCCESS',
      error: null,
      success: result
    };
  }

  /**
   * 상품 목록 조회
   * @summary 마켓 상품 목록을 조회합니다
   * @param categoryId 카테고리 ID (선택)
   * @param sort 정렬 기준 (popular/latest/rating, 기본: popular)
   * @param page 페이지 번호 (기본: 1)
   * @param limit 페이지당 개수 (기본: 15)
   * @returns 상품 목록 조회 결과
   */
  @Get('/')
  @SuccessResponse(200, '상품 목록 조회 성공')
  @Response<ErrorResponse>(400, '입력값 검증 실패', {
    resultType: 'FAIL',
    error: {
      errorCode: 'ERR-VALIDATION',
      reason: '입력값 검증 실패',
      data: [
        {
          field: 'categoryId',
          value: 'invalid',
          messages: 'categoryId는 UUID 형식이어야 합니다'
        },
        {
          field: 'sort',
          value: 'invalid',
          messages: 'sort는 popular, latest, rating 중 하나여야 합니다'
        },
        {
          field: 'page',
          value: 0,
          messages: 'page는 1 이상의 정수여야 합니다'
        },
        {
          field: 'limit',
          value: 101,
          messages: 'limit는 1 이상 100 이하의 정수여야 합니다'
        }
      ]
    },
    success: null
  })
  @Response<ErrorResponse>(500, '상품 목록 조회 실패', {
    resultType: 'FAIL',
    error: {
      errorCode: 'MARKET-ERROR',
      reason: '상품 목록 조회 실패',
      data: '상품 목록 조회 중 오류가 발생했습니다.'
    },
    success: null
  })
  @Response<ErrorResponse>(500, '서버 에러', commonError.serverError)
  @Security('jwt_optional')
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
    @Request() req: ExpressRequest,
    @Query() categoryId?: string,
    @Query() sort: 'popular' | 'latest' | 'rating' = 'popular',
    @Query() page: number = 1,
    @Query() limit: number = 15
  ): Promise<TsoaResponse<GetItemListResponseDto>> {
    const dto = await validateDto(GetItemListRequestDto, {
      category_id: categoryId,
      sort,
      page,
      limit
    });

    const userId = req.user?.id;
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
   * @returns 상품 상세 조회 결과
   */
  @Get('/{itemId}')
  @SuccessResponse(200, '상품 상세 조회 성공')
  @Response<ErrorResponse>(404, '상품을 찾을 수 없습니다.', {
    resultType: 'FAIL',
    error: {
      errorCode: 'ITEM-NOT-FOUND',
      reason: '상품을 찾을 수 없습니다.',
      data: 'Item ID: {itemId}'
    },
    success: null
  })
  @Response<ErrorResponse>(500, '상품 상세 조회 실패', {
    resultType: 'FAIL',
    error: {
      errorCode: 'MARKET-ERROR',
      reason: '상품 상세 조회 실패',
      data: '상품 상세 조회 중 오류가 발생했습니다.'
    },
    success: null
  })
  @Response<ErrorResponse>(500, '서버 에러', commonError.serverError)
  @Security('jwt_optional')
  @Example<TsoaResponse<GetItemDetailResponseDto>>({
    resultType: 'SUCCESS',
    error: null,
    success: {
      item_id: '550e8400-e29b-41d4-a716-446655440000',
      title: '상품명',
      category: {
        major: '의류',
        sub: '상의'
      },

      images: [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg'
      ],
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
              quantity: 10,
              is_sold_out: false
            }
          ]
        }
      ],
      reformer: {
        owner_id: '880e8400-e29b-41d4-a716-446655440003',
        profile_image: 'https://example.com/profile.jpg',
        nickname: '리포머닉네임',
        star: 4.8,
        star_recent_3m: 4.5,
        order_count: 500,
        review_count: 120,
        bio: '리폼 전문가입니다.'
      },
      content: '상품 설명 내용',
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
    @Request() req: ExpressRequest,
    @Path() itemId: string
  ): Promise<TsoaResponse<GetItemDetailResponseDto>> {
    const userId = req.user?.id;
    const result = await this.marketService.getItemDetail(itemId, userId);

    return {
      resultType: 'SUCCESS',
      error: null,
      success: result
    };
  }
}
