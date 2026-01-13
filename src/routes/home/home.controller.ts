import { Controller, Get, Query, Header, Route, Tags } from 'tsoa';
import { TsoaResponse } from '../../config/tsoaResponse.js';
import { HomeService } from './home.service.js';
import { GetHomeResponseDto, AuthUser } from './home.dto.js';

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
   * @param req - Express Request 객체
   * @param userId - 헤더 또는 쿼리의 사용자 ID (임시)
   * @param role - 헤더 또는 쿼리의 사용자 역할 (임시)
   */
  private extractAuthUser(
    userId?: string,
    role?: 'USER' | 'OWNER'
  ): AuthUser | undefined {
    // TODO: JWT 구현 후
    // const token = req.headers.authorization?.replace('Bearer ', '');
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // return { userId: decoded.userId, role: decoded.role };

    // 임시: 헤더/쿼리 파라미터에서 추출
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
   * @param userId - 사용자 ID (헤더 또는 쿼리 파라미터, 임시 - JWT 구현 시 제거)
   * @param role - 사용자 역할 ('USER' 또는 'OWNER', 임시 - JWT 구현 시 제거)
   */
  @Get('/')
  public async getHome(
    @Header('x-user-id') userId?: string,
    @Header('x-user-role') role?: 'USER' | 'OWNER',
    @Query('user_id') queryUserId?: string,
    @Query('role') queryRole?: 'USER' | 'OWNER'
  ): Promise<TsoaResponse<GetHomeResponseDto>> {
    // 임시: 헤더 우선, 없으면 쿼리 파라미터 사용
    // TODO: JWT 미들웨어 구현 후 이 부분 제거
    const effectiveUserId = userId || queryUserId;
    const effectiveRole = role || queryRole;
    const authUser = this.extractAuthUser(effectiveUserId, effectiveRole);

    const homeData = await this.homeService.getHomeData(authUser);

    return {
      resultType: 'SUCCESS',
      error: null,
      success: homeData
    };
  }
}
