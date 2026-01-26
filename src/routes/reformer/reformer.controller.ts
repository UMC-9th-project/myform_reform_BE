import {
  Route,
  Controller,
  Get,
  SuccessResponse,
  Body,
  Response,
  Example,
  Query,
  Tags
} from 'tsoa';
import { ReformerService } from './reformer.service.js';
import { ReformerSearchResDTO, ReformerHomeResDTO } from './reformer.dto.js';

@Route('/reformer')
@Tags('Reformer')
export class ReformerController extends Controller {
  private reformerService = new ReformerService();

  constructor() {
    super();
    this.reformerService = new ReformerService();
  }

  /**
   * @summary 리폼러 키워드 검색
   * @param keyword 검색어 (필수)
   * @param cursor 다음 페이지를 위한 커서 (옵션)
   * @returns 리폼러 검색 결과 및 다음 페이지 커서(if exists)
   */
  @Get('/search')
  @SuccessResponse(200, '리폼러 검색 성공')
  public async searchReformers(
    @Query() keyword: string,
    @Query() cursor?: string
  ): Promise<ReformerSearchResDTO> {
    return await this.reformerService.searchReformers({
      keyword,
      cursor
    });
  }

  /**
   * @summary 리폼러 찾기 메인
   * @returns 리폼러 홈 데이터 ( 상위 리폼러 및 최근 피드 )
   */
  @Get('/home')
  @SuccessResponse(200, '리폼러 홈 데이터 조회 성공')
  public async getHome(): Promise<ReformerHomeResDTO> {
    return await this.reformerService.getHome();
  }
}
