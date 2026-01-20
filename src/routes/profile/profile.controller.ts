import {
  Controller,
  Post,
  Route,
  Request,
  SuccessResponse,
  Response,
  Tags,
  Get,
  Path,
  UploadedFiles,
  Body,
  FormField,
  Example,
  Query
} from 'tsoa';
import { ProfileService } from './profile.service.js';
// import { Request as ExRequest } from 'express';
import {
  ErrorResponse,
  ResponseHandler,
  TsoaResponse,
  commonError
} from '../../config/tsoaResponse.js';
import {
  ItemDto,
  ItemRequest,
  ReformDto,
  ReformRequest
} from './profile.dto.js';
import { Request as ExRequest } from 'express';

@Route('profile')
@Tags('Profile Router')
export class ProfileController extends Controller {
  private profileService: ProfileService;
  constructor() {
    super();
    this.profileService = new ProfileService();
  }

  /**
   * 판매 상품 등록, body는 json stringfy후 제공되어야합니다.
   *
   * {\"title\":\"제목\",\"content\":\"설명\",\"price\":1000,\"delivery\":100,\"option\":[{\"title\":\"사이즈\",\"content\":[{\"comment\":\"S\",\"price\":0,\"quantity\":10},{\"comment\":\"M\",\"price\":0,\"quantity\":10}]}],\"category\":{\"major\":\"의류\",\"sub\":\"상의\"}}
   *
   * @summary 새로운 판매 상품을 등록합니다
   * @returns 판매글 등록 결과
   * @param body JSON 문자열 형태의 상품 정보
   *
   */
  @Post('add/item')
  @SuccessResponse(200, '판매글 등록 성공')
  @Response<ErrorResponse>(500, '서버에러', commonError.serverError)
  public async addItem(
    @FormField() body: string,
    @UploadedFiles('images') images: Express.Multer.File[]
  ): Promise<TsoaResponse<string>> {
    //TODO: JWT 로직 추가 이후 ownerID 목업 삭제
    const ownerId = '7786f300-6e37-41b3-8bfb-2bca27846785';
    const dto = JSON.parse(body) as ItemRequest;
    const itemDto = new ItemDto(dto, ownerId);
    await this.profileService.addProduct('ITEM', itemDto, images);

    return new ResponseHandler('판매글 등록 성공');
  }

  /**
   * 주문제작 상품 등록
   *
   * {"title":"제목","content":"설명","price":1000,"delivery":100,"option":[{"title":"사이즈","sortOrder":1,"content":[{"comment":"S","price":0,"quantity":10,"sortOrder":1},{"comment":"M","price":0,"quantity":10,"sortOrder":2},{"comment":"L","price":500,"quantity":5,"sortOrder":3}]},{"title":"색상","sortOrder":2,"content":[{"comment":"블랙","price":0,"quantity":20,"sortOrder":1},{"comment":"화이트","price":0,"quantity":15,"sortOrder":2}]}],"category":{"major":"의류","sub":"상의"}}
   *
   * @summary 새로운 주문제작 상품을 등록합니다
   * @param body JSON 문자열 형태의 상품 정보
   * @returns 주문제작 등록 결과
   */
  @Post('add/reform')
  @SuccessResponse(200, '주문제작 등록 성공')
  @Response<ErrorResponse>(500, '서버에러', commonError.serverError)
  public async addReform(
    @FormField() body: string,
    @UploadedFiles() images: Express.Multer.File[]
  ): Promise<TsoaResponse<string>> {
    const ownerId = '7786f300-6e37-41b3-8bfb-2bca27846785';
    const dto = JSON.parse(body) as ReformRequest;
    const reformDto = new ReformDto(dto, ownerId);
    await this.profileService.addProduct('REFORM', reformDto, images);

    return new ResponseHandler('테스트');
  }

  /**
   * 판매관리 목록 조회
   * @summary 사용자의 전체 판매 상품 목록을 조회합니다
   * @returns 판매관리 목록
   */
  @Get('sales')
  @SuccessResponse(200, '판매관리 조회 성공')
  @Response<ErrorResponse>(500, '서버에러', commonError.serverError)
  public async getSales(
    @Query('type') type: 'ITME' | 'REFORM'
  ): Promise<TsoaResponse<string>> {
    return new ResponseHandler('테스트');
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
  ): Promise<TsoaResponse<string>> {
    console.log(id);
    return new ResponseHandler('테스트');
  }
}
