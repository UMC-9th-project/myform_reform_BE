import {
  Route,
  Controller,
  Post,
  Delete,
  SuccessResponse,
  Body,
  Security,
  Get,
  Query,
  Tags,
  Request,
  Example
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
import { Request as ExRequest } from 'express';

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
  @Security('jwt', ['user', 'reformer'])
  @Example<WishReqDTO>({
    type: 'ITEM',
    itemId: '3df18a91-ef85-4dab-b984-2534bbc4ebe1'
  })
  public async createWish(
    @Body() body: WishReqDTO,
    @Request() req: ExRequest
  ): Promise<TsoaResponse<WishResDTO>> {
    const payload = req.user;
    const userId = payload.id;
    const role = payload.role;

    const result = await this.wishService.createWish(body, userId, role);
    return new ResponseHandler<WishResDTO>(result);
  }

  /**
   * @summary 위시 아이템 삭제
   * @param body 삭제할 위시 정보
   * @returns 삭제된 위시 아이템 정보
   */
  @SuccessResponse(200, '위시 아이템 삭제 완료')
  @Delete('/')
  @Security('jwt', ['user', 'reformer'])
  @Example<WishReqDTO>({
    type: 'ITEM',
    itemId: '3df18a91-ef85-4dab-b984-2534bbc4ebe1'
  })
  public async deleteWish(
    @Body() body: WishReqDTO,
    @Request() req: ExRequest
  ): Promise<TsoaResponse<DeleteWishResDTO>> {
    const payload = req.user;
    const userId = payload.id;
    const role = payload.role;

    const result = await this.wishService.deleteWish(body, userId, role);
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
  @Security('jwt', ['user', 'reformer'])
  public async getWishList(
    @Query() type: WishType,
    @Request() req: ExRequest
  ): Promise<TsoaResponse<WishListResDTO>> {
    const payload = req.user;
    const userId = payload.id;
    const role = payload.role;

    const result = await this.wishService.getWishList(type, userId, role);
    return new ResponseHandler<WishListResDTO>(result);
  }
}
