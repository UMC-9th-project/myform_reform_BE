import {
  Route,
  Controller,
  Post,
  Query,
  Path,
  SuccessResponse,
  Body,
  Response,
  Example,
  Tags
} from 'tsoa';
import {
  TsoaResponse,
  ResponseHandler,
  ErrorResponse
} from '../../config/tsoaResponse.js';
import { WishService } from './wish.service.js';
import { CreateWishResDTO, CreateWishReqDTO } from './wish.dto.js';

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
    @Body() body: CreateWishReqDTO
  ): Promise<TsoaResponse<CreateWishResDTO>> {
    const result = await this.wishService.createWish(body);
    return new ResponseHandler<CreateWishResDTO>(result);
  }
}
