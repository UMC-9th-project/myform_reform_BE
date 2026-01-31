import {
  Body,
  Controller,
  Get,
  Post,
  Path,
  Delete,
  Route,
  Tags,
  SuccessResponse
} from 'tsoa';
import { ResponseHandler, TsoaResponse } from '../../config/tsoaResponse.js';
import { CartService } from './cart.service.js';
import { DeleteItemsDTO, AddToCartDTO } from './dto/cart.req.dto.js';
import { CartGroupedResDTO, CreateCartResDTO } from './dto/cart.res.dto.js';
import { validateOrThrow } from '../../middleware/validator.js';

@Route('/cart')
@Tags('Cart')
export class CartController extends Controller {
  private cartService: CartService;

  constructor() {
    super();
    this.cartService = new CartService();
  }

  /**
   * @summary 장바구니 아이템 삭제
   * @param body 삭제할 장바구니 아이템 ID 목록
   * @returns 삭제된 아이템 수 메시지
   */
  @Delete('/items')
  @SuccessResponse('200', '장바구니 아이템 삭제 성공')
  public async removeItemsFromCart(
    @Body() body: DeleteItemsDTO
  ): Promise<TsoaResponse<string>> {
    const req = await validateOrThrow(DeleteItemsDTO, body);

    const deletedCount = await this.cartService.removeItemsFromCart(req);
    const message = `${deletedCount}개의 장바구니 아이템이 삭제되었습니다`;
    return new ResponseHandler<string>(message);
  }

  /**
   * @summary 장바구니에 아이템 추가
   * @param itemId 추가할 아이템 ID
   * @param body 추가할 아이템 정보
   * @returns 추가된 장바구니 아이템 정보
   */
  @Post('/{itemId}')
  @SuccessResponse('201', '장바구니 추가 성공')
  public async addToCart(
    @Path() itemId: string,
    @Body() body: AddToCartDTO
  ): Promise<TsoaResponse<CreateCartResDTO>> {
    const req = await validateOrThrow(AddToCartDTO, body);
    const created = await this.cartService.addItemToCart(
      itemId,
      '0f41af82-2259-4d42-8f1a-ca8771c8d473',
      req
    );
    return new ResponseHandler<CreateCartResDTO>(created);
  }

  /**
   * @summary 장바구니 조회
   * @returns 판매자별로 그룹화된 장바구니 아이템 목록
   */
  @Get('')
  @SuccessResponse('200', '장바구니 조회 성공')
  public async getCart(): Promise<TsoaResponse<CartGroupedResDTO>> {
    const userId = '0f41af82-2259-4d42-8f1a-ca8771c8d473';
    const cart = await this.cartService.getCartByUser(userId);
    return new ResponseHandler<CartGroupedResDTO>(cart);
  }
}
