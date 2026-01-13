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
import { DeleteItemsDTO } from './dto/cart.req.dto.js';
import { AddToCartDTO } from './dto/cart.req.dto.js';
import { validateOrThrow } from '../../middleware/validator.js';

@Route('/cart')
@Tags('Cart Controller')
export class CartController extends Controller {
  private cartService: CartService;

  constructor() {
    super();
    this.cartService = new CartService();
  }

  @Delete('/items')
  @SuccessResponse('200', '장바구니 아이템 삭제 성공')
  public async removeItemsFromCart(
    @Body() payload: DeleteItemsDTO
  ): Promise<TsoaResponse<string>> {
    const dto = await validateOrThrow(DeleteItemsDTO, payload);

    const deletedCount = await this.cartService.removeItemsFromCart(
      dto.cartIds
    );
    const message = `${deletedCount}개의 장바구니 아이템이 삭제되었습니다`;
    return new ResponseHandler<string>(message);
  }

  @Post('/{itemId}')
  @SuccessResponse('201', '장바구니 추가 성공')
  public async addToCart(
    @Path() itemId: string,
    @Body() payload: AddToCartDTO
  ): Promise<TsoaResponse<object>> {
    const dto = await validateOrThrow(AddToCartDTO, payload);

    const created = await this.cartService.addItemToCart(
      itemId,
      '0f41af82-2259-4d42-8f1a-ca8771c8d473',
      dto.quantity,
      dto.optionItemIds || []
    );

    return new ResponseHandler(created);
  }

  @Get('')
  @SuccessResponse('200', '장바구니 조회 성공')
  public async getCart(): Promise<TsoaResponse<object>> {
    const userId = '0f41af82-2259-4d42-8f1a-ca8771c8d473';
    const cart = await this.cartService.getCartByUser(userId);
    return new ResponseHandler(cart);
  }
}
