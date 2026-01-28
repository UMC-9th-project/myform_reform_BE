import {
  Route,
  Controller,
  SuccessResponse,
  Get,
  Query,
  Tags,
  Example
} from 'tsoa';
import { TsoaResponse, ResponseHandler } from '../../config/tsoaResponse.js';
import { SearchService } from './search.service.js';
import { SearchListResDTO } from './search.dto.js';

@Route('/search')
@Tags('Search')
export class SearchController extends Controller {
  private searchService = new SearchService();

  constructor() {
    super();
    this.searchService = new SearchService();
  }

  /**
   * @summary 상품 및 주문제작 검색
   * @param type 검색 타입 ( ITEM | REQUEST | PROPOSAL )
   * @param query 검색어
   * @param cursor 페이지네이션 커서
   * @returns 검색 결과
   */
  @Get('/')
  @SuccessResponse(200, '검색 완료')
  @Example({
    type: 'REQUEST',
    query: '유니폼'
  })
  public async search(
    @Query() type: 'ITEM' | 'REQUEST' | 'PROPOSAL',
    @Query() query: string,
    @Query() cursor?: string
  ): Promise<TsoaResponse<SearchListResDTO>> {
    const userId = '0f41af82-2259-4d42-8f1a-ca8771c8d473'; // HACK
    const result = await this.searchService.search(type, query, userId, cursor);
    return new ResponseHandler<SearchListResDTO>(result);
  }
}
