import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Path,
  Delete,
  Route,
  Tags,
  SuccessResponse,
  Security,
  Request,
  Example
} from 'tsoa';
import { ResponseHandler, TsoaResponse } from '../../config/tsoaResponse.js';
import { CartService } from './cart.service.js';
import { DeleteItemsDTO, AddToCartDTO } from './dto/cart.req.dto.js';
import {
  CartGroupedResDTO,
  CreateCartResDTO,
  UpdateQuantityResDTO
} from './dto/cart.res.dto.js';
import { validateOrThrow } from '../../middleware/validator.js';
import { Request as ExRequest } from 'express';

@Route('/cart')
@Tags('장바구니 기능')
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
  @Security('jwt', ['user'])
  @SuccessResponse('200', '장바구니 아이템 삭제 성공')
  public async removeItemsFromCart(
    @Body() body: DeleteItemsDTO,
    @Request() req: ExRequest
  ): Promise<TsoaResponse<string>> {
    const payload = req.user;
    const userId = payload.id;

    const validatedBody = await validateOrThrow(DeleteItemsDTO, body);

    const deletedCount = await this.cartService.removeItemsFromCart(
      validatedBody,
      userId
    );
    const message = `${deletedCount}개의 장바구니 아이템이 삭제되었습니다`;
    return new ResponseHandler<string>(message);
  }

  /**
   * @summary 장바구니에 아이템 추가
   * @param itemId 추가할 아이템 ID
   * @example itemId "c59381b0-d244-4137-9e5b-896573fccea6"
   * @param body 추가할 아이템 정보
   * @returns 추가된 장바구니 아이템 정보
   */
  @Post('/{itemId}')
  @Security('jwt', ['user'])
  @SuccessResponse('201', '장바구니 추가 성공')
  @Example<AddToCartDTO>({
    quantity: 1,
    optionItemIds: [
      '3db89e51-a693-45f4-ad63-d99a2e0d39d6',
      '03c8c54d-0b28-41a3-ad33-4b6a5f78add7'
    ]
  })
  public async addToCart(
    @Path() itemId: string,
    @Body() body: AddToCartDTO,
    @Request() req: ExRequest
  ): Promise<TsoaResponse<CreateCartResDTO>> {
    const payload = req.user;
    const userId = payload.id;

    const reqDto = await validateOrThrow(AddToCartDTO, body);
    const created = await this.cartService.addItemToCart(
      itemId,
      userId,
      reqDto
    );
    return new ResponseHandler<CreateCartResDTO>(created);
  }

  /**
   * @summary 장바구니 조회
   * @returns 판매자별로 그룹화된 장바구니 아이템 목록
   */
  @Get('')
  @Security('jwt', ['user'])
  @SuccessResponse('200', '장바구니 조회 성공')
  public async getCart(
    @Request() req: ExRequest
  ): Promise<TsoaResponse<CartGroupedResDTO>> {
    const payload = req.user;
    const userId = payload.id;

    const cart = await this.cartService.getCartByUser(userId);
    return new ResponseHandler<CartGroupedResDTO>(cart);
  }

  /**
   * @summary 장바구니 아이템 수량 증가
   * @param cartId 장바구니 아이템 ID
   * @returns 변경된 장바구니 아이템 정보
   */
  @Patch('/{cartId}/inc')
  @Security('jwt', ['user'])
  @SuccessResponse('200', '수량 증가 성공')
  public async increaseCartQuantity(
    @Path() cartId: string,
    @Request() req: ExRequest
  ): Promise<TsoaResponse<UpdateQuantityResDTO>> {
    const payload = req.user;
    const userId = payload.id;

    const result = await this.cartService.updateCartQuantity(
      cartId,
      userId,
      'inc'
    );
    return new ResponseHandler<UpdateQuantityResDTO>(result);
  }

  /**
   * @summary 장바구니 아이템 수량 감소
   * @param cartId 장바구니 아이템 ID
   * @returns 변경된 장바구니 아이템 정보 (수량이 0이면 삭제됨)
   */
  @Patch('/{cartId}/dec')
  @Security('jwt', ['user'])
  @SuccessResponse('200', '수량 감소 성공')
  public async decreaseCartQuantity(
    @Path() cartId: string,
    @Request() req: ExRequest
  ): Promise<TsoaResponse<UpdateQuantityResDTO>> {
    const payload = req.user;
    const userId = payload.id;

    const result = await this.cartService.updateCartQuantity(
      cartId,
      userId,
      'dec'
    );
    return new ResponseHandler<UpdateQuantityResDTO>(result);
  }
}
