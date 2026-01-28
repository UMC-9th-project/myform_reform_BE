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
  Query
} from 'tsoa';
import { ProfileService } from './profile.service.js';
import {
  ErrorResponse,
  ResponseHandler,
  TsoaResponse,
  commonError
} from '../../config/tsoaResponse.js';
import {
  AddItemRequestDto,
  AddReformRequestDto,
  SaleRequestDto
} from './dto/profile.req.dto.js';
import {
  SaleDetailResponseDto,
  SaleResponseDto
} from './dto/profile.res.dto.js';
import { Item, Reform } from './profile.model.js';

@Route('profile')
@Tags('Profile Router')
export class ProfileController extends Controller {
  private profileService: ProfileService;
  constructor() {
    super();
    this.profileService = new ProfileService();
  }

  /**
   * 판매 상품 등록
   *
   * @summary 새로운 판매 상품을 등록합니다
   * @param body 판매 상품 정보
   * @returns 판매글 등록 결과
   */
  @Post('add/item')
  @SuccessResponse(200, '판매글 등록 성공')
  @Response<ErrorResponse>(500, '서버에러', commonError.serverError)
  public async addItem(
    @Body() body: AddItemRequestDto
  ): Promise<TsoaResponse<string>> {
    //TODO: JWT 로직 추가 이후 ownerID 목업 삭제
    const ownerId = '7786f300-6e37-41b3-8bfb-2bca27846785';
    const dto = Item.create(body, ownerId);
    await this.profileService.addProduct('ITEM', dto);

    return new ResponseHandler('판매글 등록 성공');
  }

  /**
   * 주문제작 상품 등록
   *
   * @summary 새로운 주문제작 상품을 등록합니다
   * @param body 주문제작 상품 정보
   * @returns 주문제작 등록 결과
   */
  @Post('add/reform')
  @SuccessResponse(200, '주문제작 등록 성공')
  @Response<ErrorResponse>(500, '서버에러', commonError.serverError)
  public async addReform(
    @Body() body: AddReformRequestDto
  ): Promise<TsoaResponse<string>> {
    const ownerId = '7786f300-6e37-41b3-8bfb-2bca27846785';
    const dto = Reform.create(body, ownerId);
    await this.profileService.addProduct('REFORM', dto);

    return new ResponseHandler('주문제작 등록 성공');
  }

  /**
   * 판매관리 목록 조회
   * @summary 사용자의 전체 판매 상품 목록을 조회합니다
   * @returns 판매관리 목록
   * @param type 주문제작 or 판매상품 선택
   * @param page 현재 페이지
   * @param limit 한 페이지 보여줄 목록 수
   */
  @Get('sales')
  @SuccessResponse(200, '판매관리 조회 성공')
  @Response<ErrorResponse>(500, '서버에러', commonError.serverError)
  public async getSales(
    @Query() type: 'ITEM' | 'REFORM',
    @Query() page: number = 1,
    @Query() limit: number = 15
  ): Promise<TsoaResponse<SaleResponseDto[]>> {
    const ownerId = 'cf8b817a-4a6e-43db-bfc0-dc38a67001b5';
    const dto = new SaleRequestDto(type, page, limit, ownerId);
    const data = await this.profileService.getSales(dto);

    const res = data.map((sale) => {
      return sale.toResponse();
    });

    return new ResponseHandler(res);
  }

  /**
   * 특정 판매목록 상세 조회
   * @summary 판매상품 ID로 해당 상품의 상세 정보를 조회합니다
   * @param id 판매상품 ID
   * @returns 판매상품 상세 정보
   */
  @Get('sales/:id')
  @SuccessResponse(200, '특정 판매상품 조회 성공')
  @Response<ErrorResponse>(500, '서버에러', commonError.serverError)
  public async getDetailSales(
    @Path() id: string
  ): Promise<TsoaResponse<SaleDetailResponseDto>> {
    const ownerId = 'cf8b817a-4a6e-43db-bfc0-dc38a67001b5';

    const data = await this.profileService.getSaleDetail(ownerId, id);

    return new ResponseHandler(data.toResponse());
  }
}
