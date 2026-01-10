import {
  Body,
  Controller,
  Get,
  Post,
  Delete,
  Route,
  Tags,
  SuccessResponse
} from 'tsoa';
import { ResponseHandler, TsoaResponse } from '../../config/tsoaResponse.js';
import { CartService } from './cart.service.js';
import { DeleteItemsDTO } from '../../middleware/cart/cart.dto.js';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ValidationError } from '../../middleware/error.js';

@Route('api/v1/cart')
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
    const dto = plainToInstance(DeleteItemsDTO, payload);
    const errors = await validate(dto);
    if (errors.length > 0) {
      const e = errors[0];
      const messages = e.constraints ? Object.values(e.constraints) : [];
      const firstMessage =
        messages.length > 0 ? String(messages[0]) : 'Invalid request.';
      throw new ValidationError({
        field: e.property,
        value: e.value,
        messages: firstMessage
      });
    }

    const deletedCount = await this.cartService.removeItemsFromCart(
      dto.cartIds
    );
    const message = `${deletedCount}개의 장바구니 아이템이 삭제되었습니다`;
    return new ResponseHandler<string>(message);
  }
}
