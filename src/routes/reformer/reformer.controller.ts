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
import {
  ReformerSearchResDTO,
  ReformerHomeResDTO,
  ReformerListResDTO,
  ReformerFeedResDTO,
  FeedPhotosResDTO
} from './dto/reformer.res.dto.js';
import { ReformerSortOption } from './dto/reformer.req.dto.js';

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

  /**
   * @summary 전체 리폼러 탐색
   * @param cursor 다음 페이지를 위한 커서 (옵션)
   * @param sort 정렬 기준: 'name'|'rating'|'trades'
   */
  @Get('/list')
  @SuccessResponse(200, '리폼러 목록 조회 성공')
  public async listReformers(
    @Query() sort: ReformerSortOption = 'name',
    @Query() cursor?: string
  ): Promise<ReformerListResDTO> {
    return await this.reformerService.searchAllReformers({ sort, cursor });
  }

  /**
   * @summary 전체 피드 탐색 (썸네일만)
   * @param cursor 다음 페이지를 위한 커서
   * @returns 피드 목록 및 다음 페이지 커서(if exists)
   */
  @Get('/feed')
  @SuccessResponse(200, '전체 피드 탐색 성공')
  public async getReformerFeed(
    @Query() cursor?: string
  ): Promise<ReformerFeedResDTO> {
    return await this.reformerService.getReformerFeed(cursor);
  }

  /**
   * @summary 피드 내 전체 사진 조회
   * @param feed_id 피드 아이디
   * @returns 피드의 모든 사진
   */
  @Get('/feed/photos')
  @SuccessResponse(200, '피드 내 사진 조회 성공')
  public async getFeedPhotos(
    @Query() feed_id: string
  ): Promise<FeedPhotosResDTO> {
    return await this.reformerService.getFeedPhotos(feed_id);
  }
}
