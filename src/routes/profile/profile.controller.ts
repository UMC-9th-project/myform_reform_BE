import {
  Controller,
  Post,
  Route,
  SuccessResponse,
  Response,
  Tags,
  Get,
  Path
} from 'tsoa';
import { ProfileService } from './profile.service.js';
import {
  ErrorResponse,
  ResponseHandler,
  TsoaResponse,
  commonError
} from '../../config/tsoaResponse.js';

@Route('/api/v1/profile')
@Tags('Profile Router')
export class ProfileController extends Controller {
  private profileService: ProfileService;
  constructor() {
    super();
    this.profileService = new ProfileService();
  }

  /**
   * 판매 상품 등록
   * @summary 새로운 판매 상품을 등록합니다
   * @returns 판매글 등록 결과
   */
  @Post('add/item')
  @SuccessResponse(200, '판매글 등록 성공')
  @Response<ErrorResponse>(500, '서버에러', commonError.serverError)
  public async addItem(): Promise<TsoaResponse<string>> {
    return new ResponseHandler('테스트');
  }

  /**
   * 주문제작 상품 등록
   * @summary 새로운 주문제작 상품을 등록합니다
   * @returns 주문제작 등록 결과
   */
  @Post('add/reform')
  @SuccessResponse(200, '주문제작 등록 성공')
  @Response<ErrorResponse>(500, '서버에러', commonError.serverError)
  public async addReform(): Promise<TsoaResponse<string>> {
    return new ResponseHandler('테스트');
  }

  /**
   * 판매관리 목록 조회
   * @summary 사용자의 전체 판매 상품 목록을 조회합니다
   * @returns 판매관리 목록
   */
  @Get('order')
  @SuccessResponse(200, '판매관리 조회 성공')
  @Response<ErrorResponse>(500, '서버에러', commonError.serverError)
  public async getOrder(): Promise<TsoaResponse<string>> {
    return new ResponseHandler('테스트');
  }

  /**
   * 특정 판매목록 상세 조회
   * @summary 판매상품 ID로 해당 상품의 상세 정보를 조회합니다
   * @param id 판매상품 ID
   * @returns 판매상품 상세 정보
   */
  @Get('order/:id')
  @SuccessResponse(200, '특정 판매상품 조회 성공')
  @Response<ErrorResponse>(500, '서버에러', commonError.serverError)
  public async getDetailOrder(
    @Path() id: string
  ): Promise<TsoaResponse<string>> {
    console.log(id);
    return new ResponseHandler('테스트');
  }
}
