import {
  Route,
  Controller,
  Post,
  Delete,
  SuccessResponse,
  Body,
  Response,
  Example,
  Get,
  Query,
  Tags
} from 'tsoa';
import {
  TsoaResponse,
  ResponseHandler,
  ErrorResponse
} from '../../config/tsoaResponse.js';
import { WishService } from './wish.service.js';
import { WishReqDTO, WishType } from './dto/wish.req.dto.js';
import {
  WishResDTO,
  WishListResDTO,
  DeleteWishResDTO
} from './dto/wish.res.dto.js';
@Route('/wish')
@Tags('Wish')
export class WishController extends Controller {
  private wishService = new WishService();

  constructor() {
    super();
    this.wishService = new WishService();
  }

  /**
   * @summary 새로운 위시 아이템 생성
   * @param body 생성할 위시 정보
   * @returns 생성된 위시 아이템 정보
   */
  @SuccessResponse(201, '위시 아이템 생성 완료')
  @Post('/')
  public async createWish(
    @Body() body: WishReqDTO
  ): Promise<TsoaResponse<WishResDTO>> {
    const result = await this.wishService.createWish(body);
    return new ResponseHandler<WishResDTO>(result);
  }

  /**
   * @summary 위시 아이템 삭제
   * @param body 삭제할 위시 정보
   * @returns 삭제된 위시 아이템 정보
   */
  @SuccessResponse(200, '위시 아이템 삭제 완료')
  @Delete('/')
  public async deleteWish(
    @Body() body: WishReqDTO
  ): Promise<TsoaResponse<DeleteWishResDTO>> {
    const result = await this.wishService.deleteWish(body);
    return new ResponseHandler<DeleteWishResDTO>(result);
  }

  /**
   * @summary 위시 내역 조회
   * @param type 위시 타입
   * REQUEST: 요청글
   * PROPOSAL: 제안글
   * ITEM: 마켓글
   * @returns 위시 아이템 리스트
   */
  @SuccessResponse(200, '위시 내역 조회 완료')
  @Get('/')
  public async getWishList(
    @Query() type: WishType
  ): Promise<TsoaResponse<WishListResDTO>> {
    const result = await this.wishService.getWishList(type);
    return new ResponseHandler<WishListResDTO>(result);
  }
}
