import {
  Controller,
  Get,
  Query,
  Header,
  Route,
  Tags,
  SuccessResponse,
  Response
} from 'tsoa';
import { TsoaResponse, ErrorResponse, commonError } from '../../config/tsoaResponse.js';
import { HomeService } from './home.service.js';
import { GetHomeResponseDto, AuthUser, HomeDataResponseDto } from './home.dto.js';

@Route('home')
@Tags('Main Page')
export class HomeController extends Controller {
  private homeService: HomeService;

  constructor() {
    super();
    this.homeService = new HomeService();
  }

  /**
   * 인증 정보 추출 (임시)
   * TODO: JWT 미들웨어 구현 후 이 부분을 JWT 토큰에서 추출하도록 변경
   * @param userId - 헤더 또는 쿼리의 사용자 ID (임시)
   * @param role - 헤더 또는 쿼리의 사용자 역할 (임시)
   * @returns 인증된 사용자 정보 또는 undefined
   */
  private extractAuthUser(
    userId?: string,
    role?: 'USER' | 'OWNER'
  ): AuthUser | undefined {
    if (!userId || !role) {
      return undefined;
    }

    return {
      userId,
      role
    };
  }

  /**
   * 메인 페이지 데이터 조회
   * @summary 메인 페이지 진입 시 로그인/비로그인 여부를 확인하고 그에 맞는 데이터를 반환합니다.
   * @description 
   * - 로그인한 사용자의 경우: 사용자 세션 정보, 찜 목록 기반 인기 상품, 개인화된 커스텀 오더를 제공합니다.
   * - 비로그인 사용자의 경우: 기본 세션 정보와 공개 데이터만 제공합니다.
   * - 배너, 인기 상품, 커스텀 오더, 베스트 리폼러 정보를 포함합니다.
   * @param userId 사용자 ID (헤더, 임시 - JWT 구현 시 제거)
   * @param role 사용자 역할 ('USER' 또는 'OWNER', 헤더, 임시 - JWT 구현 시 제거)
   * @param queryUserId 사용자 ID (쿼리 파라미터, 임시 - JWT 구현 시 제거)
   * @param queryRole 사용자 역할 ('USER' 또는 'OWNER', 쿼리 파라미터, 임시 - JWT 구현 시 제거)
   * @returns 홈 데이터 응답 (배너, 인기 상품, 커스텀 오더, 베스트 리폼러, 사용자 세션 정보 포함)
   */
  @Get('/')
  @SuccessResponse(200, '메인 페이지 데이터 조회 성공')
  @Response<TsoaResponse<HomeDataResponseDto>>(
    200,
    '메인 페이지 데이터 조회 성공',
    {
      resultType: 'SUCCESS',
      error: null,
      success: {
        result: true,
        user_session: {
          is_logged_in: true,
          user_id: '550e8400-e29b-41d4-a716-446655440000',
          role: 'USER',
          nickname: '사용자닉네임',
          profile_image: 'https://example.com/profile.jpg',
          cart_count: 3
        },
        home_data: {
          banners: [
            {
              id: '660e8400-e29b-41d4-a716-446655440001',
              image_url: 'https://example.com/banner1.jpg'
            }
          ],
          trending_items: [
            {
              item_id: '770e8400-e29b-41d4-a716-446655440002',
              thumbnail: 'https://example.com/item1.jpg',
              title: '인기 상품',
              price: 50000,
              star: 4.5,
              review_count: 123,
              owner_id: '880e8400-e29b-41d4-a716-446655440003',
              owner_nickname: '리포머닉네임',
              is_wished: false
            }
          ],
          custom_orders: [
            {
              proposal_id: '880e8400-e29b-41d4-a716-446655440003',
              thumbnail: 'https://example.com/proposal1.jpg',
              title: '커스텀 오더',
              min_price: 100000,
              owner_id: '990e8400-e29b-41d4-a716-446655440004',
              owner_nickname: '리포머닉네임'
            }
          ],
          best_reformers: [
            {
              owner_id: '990e8400-e29b-41d4-a716-446655440004',
              nickname: '베스트 리폼러',
              profile_image: 'https://example.com/reformer.jpg',
              bio: '최고의 리폼 전문가'
            }
          ]
        }
      }
    }
  )
  @Response<ErrorResponse>(
    404,
    '배너 조회 실패',
    {
      resultType: 'FAIL',
      error: {
        errorCode: 'HOME-ERR-002',
        reason: '배너를 찾을 수 없습니다.',
        data: '배너 데이터 조회에 실패했습니다.'
      },
      success: null
    }
  )
  @Response<ErrorResponse>(
    500,
    '사용자 세션 조회 실패',
    {
      resultType: 'FAIL',
      error: {
        errorCode: 'HOME-ERR-003',
        reason: '사용자 세션 조회에 실패했습니다.',
        data: '사용자 또는 오너 정보 조회 중 오류가 발생했습니다.'
      },
      success: null
    }
  )
  @Response<ErrorResponse>(
    500,
    '인기 상품 조회 실패',
    {
      resultType: 'FAIL',
      error: {
        errorCode: 'HOME-ERR-004',
        reason: '인기 상품 조회에 실패했습니다.',
        data: '인기 상품 데이터 조회 중 오류가 발생했습니다.'
      },
      success: null
    }
  )
  @Response<ErrorResponse>(
    500,
    '커스텀 오더 조회 실패',
    {
      resultType: 'FAIL',
      error: {
        errorCode: 'HOME-ERR-005',
        reason: '커스텀 오더 조회에 실패했습니다.',
        data: '커스텀 오더 데이터 조회 중 오류가 발생했습니다.'
      },
      success: null
    }
  )
  @Response<ErrorResponse>(
    500,
    '베스트 리폼러 조회 실패',
    {
      resultType: 'FAIL',
      error: {
        errorCode: 'HOME-ERR-006',
        reason: '베스트 리폼러 조회에 실패했습니다.',
        data: '베스트 리폼러 데이터 조회 중 오류가 발생했습니다.'
      },
      success: null
    }
  )
  @Response<ErrorResponse>(
    500,
    '메인 페이지 조회 실패',
    {
      resultType: 'FAIL',
      error: {
        errorCode: 'HOME-ERR-001',
        reason: '메인 페이지 조회 중 오류가 발생했습니다.',
        data: null
      },
      success: null
    }
  )
  @Response<ErrorResponse>(500, '서버 오류', commonError.serverError)
  public async getHome(
    @Header('x-user-id') userId?: string,
    @Header('x-user-role') role?: 'USER' | 'OWNER',
    @Query('user_id') queryUserId?: string,
    @Query('role') queryRole?: 'USER' | 'OWNER'
  ): Promise<TsoaResponse<HomeDataResponseDto>> {
    // 임시: 헤더 우선, 없으면 쿼리 파라미터 사용
    // TODO: JWT 미들웨어 구현 후 이 부분 제거
    const effectiveUserId = userId || queryUserId;
    const effectiveRole = role || queryRole;
    const authUser = this.extractAuthUser(effectiveUserId, effectiveRole);

    const homeData: HomeDataResponseDto = await this.homeService.getHomeData(authUser);

    return {
      resultType: 'SUCCESS',
      error: null,
      success: homeData
    };
  }
}
