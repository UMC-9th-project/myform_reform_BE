import {
  Body,
  Controller,
  Example,
  Get,
  Header,
  Path,
  Post,
  Response,
  Route,
  SuccessResponse,
  Tags
} from 'tsoa';
import { TsoaResponse, ErrorResponse, commonError } from '../../config/tsoaResponse.js';
import { BasicError } from '../../middleware/error.js';
import { OrdersService } from './orders.service.js';
import {
  GetOrderSheetRequestDto,
  GetOrderSheetResponseDto,
  CreateOrderRequestDto,
  CreateOrderResponseDto,
  GetOrderResponseDto
} from './orders.dto.js';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ValidateError } from 'tsoa';

@Route('orders')
@Tags('Orders')
export class OrdersController extends Controller {
  private ordersService: OrdersService;

  constructor() {
    super();
    this.ordersService = new OrdersService();
  }

  /**
   * 주문서 정보 조회
   * @summary 주문서 정보를 조회하고 주문 번호(order_number)를 미리 생성하여 반환합니다
   * @param requestBody 주문서 정보 조회 요청
   * @param userId 사용자 ID (임시, 헤더에서 추출) - TODO: JWT 구현 후 변경
   * @returns 주문서 정보 조회 결과 (order_number 포함)
   * @description 반환된 order_number는 프론트엔드에서 포트원 결제 시 merchant_uid로 사용해야 합니다.
   *              결제 완료 후 POST /orders/ API 호출 시에도 같은 order_number를 merchant_uid로 전달해야 합니다.
   * @example requestBody {
   *   "item_id": "550e8400-e29b-41d4-a716-446655440000",
   *   "option_item_ids": ["660e8400-e29b-41d4-a716-446655440001"],
   *   "quantity": 1
   * }
   * @example requestBody {
   *   "item_id": "550e8400-e29b-41d4-a716-446655440000",
   *   "option_item_ids": ["660e8400-e29b-41d4-a716-446655440001"],
   *   "quantity": 1,
   *   "new_address": {
   *     "postal_code": "12345",
   *     "address": "서울시 강남구 테헤란로",
   *     "address_detail": "123번지"
   *   }
   * }
   */
  @Post('/sheet')
  @SuccessResponse(200, '주문서 정보 조회 성공')
  @Response<TsoaResponse<GetOrderSheetResponseDto>>(
    200,
    '주문서 정보 조회 성공',
    {
      resultType: 'SUCCESS',
      error: null,
      success: {
        order_number: '20241201-00001',
        order_item: {
          reformer_nickname: '리포머닉네임',
          thumbnail: 'https://example.com/thumbnail.jpg',
          title: '상품명',
          selected_options: ['옵션그룹1 옵션1'],
          quantity: 1,
          price: 50000
        },
        delivery_address: {
          delivery_address_id: '0dcb2293-5c2a-43f6-b128-6e274bac7871',
          postal_code: '12345',
          address: '서울시 강남구 테헤란로',
          address_detail: '123번지'
        },
        payment: {
          product_amount: 50000,
          delivery_fee: 3000,
          total_amount: 53000
        }
      }
    }
  )
  @Response<ErrorResponse>(401, '로그인이 필요합니다.', commonError.unauthorized)
  @Response<ErrorResponse>(
    400,
    '입력값 검증 실패',
    {
      resultType: 'FAIL',
      error: {
        errorCode: '400',
        reason: '입력값 검증 실패',
        data: {
          item_id: ['item_id는 UUID 형식이어야 합니다'],
          option_item_ids: ['option_item_ids의 각 값은 UUID 형식이어야 합니다'],
          quantity: ['quantity는 정수여야 합니다', 'quantity는 1 이상이어야 합니다']
        }
      },
      success: null
    }
  )
  @Response<ErrorResponse>(
    404,
    '상품을 찾을 수 없습니다.',
    {
      resultType: 'FAIL',
      error: {
        errorCode: 'ITEM-NOT-FOUND',
        reason: '상품을 찾을 수 없습니다.',
        data: 'Item ID: {itemId}'
      },
      success: null
    }
  )
  @Response<ErrorResponse>(
    400,
    '재고가 부족합니다.',
    {
      resultType: 'FAIL',
      error: {
        errorCode: 'INSUFFICIENT-STOCK',
        reason: '재고가 부족합니다.',
        data: 'Item: {itemName}'
      },
      success: null
    }
  )
  @Response<ErrorResponse>(
    500,
    '주문서 조회 실패',
    {
      resultType: 'FAIL',
      error: {
        errorCode: 'ORDER-ERROR',
        reason: '주문서 조회 실패',
        data: '주문서 조회 중 오류가 발생했습니다.'
      },
      success: null
    }
  )
  @Response<ErrorResponse>(500, '서버 에러', commonError.serverError)
  public async getOrderSheet(
    @Body() requestBody: GetOrderSheetRequestDto,
    @Header('x-user-id') userId?: string
  ): Promise<TsoaResponse<GetOrderSheetResponseDto>> {
    if (!userId) {
      throw new BasicError(401, 'UNAUTHORIZED', '로그인이 필요합니다.', '');
    }

    let dto: GetOrderSheetRequestDto;
    try {
      dto = plainToInstance(GetOrderSheetRequestDto, requestBody);
      const errors = await validate(dto);
      if (errors.length > 0) {
        const formattedErrors: Record<string, { message: string; value?: any }> = {};
        errors.forEach((error) => {
          if (error.constraints) {
            const constraintMessages = Object.values(error.constraints);
            formattedErrors[error.property] = {
              message: constraintMessages[0] || '입력값 검증 실패',
              value: error.value
            };
          }
        });
        throw new ValidateError(formattedErrors, '입력값 검증 실패');
      }
    } catch (error) {
      if (error instanceof ValidateError) {
        throw error;
      }
      throw new ValidateError(
        { requestBody: { message: '잘못된 요청 본문 형식입니다' } },
        '입력값 검증 실패'
      );
    }

    const result = await this.ordersService.getOrderSheet(
      dto.item_id,
      dto.option_item_ids,
      dto.quantity,
      userId,
      dto.delivery_address_id,
      dto.new_address
    );

    return {
      resultType: 'SUCCESS',
      error: null,
      success: result
    };
  }

  /**
   * 주문 생성
   * @summary 결제 완료 후 새로운 주문을 생성합니다
   * @param requestBody 주문 생성 요청 (imp_uid, merchant_uid 필수)
   * @param userId 사용자 ID (임시, 헤더에서 추출) - TODO: JWT 구현 후 변경
   * @returns 주문 생성 결과 (결제 상태는 항상 'paid')
   * @description merchant_uid는 주문 시트 조회 API(POST /orders/sheet)에서 받은 order_number와 동일한 값이어야 합니다.
   *              프론트엔드에서 주문 시트 조회 시 받은 order_number를 merchant_uid로 사용하여 포트원 결제를 진행하고,
   *              결제 완료 후 같은 order_number를 merchant_uid로 전달해야 합니다.
   * @example requestBody {
   *   "item_id": "1f41caf0-dda0-4f9e-8085-35d1e79a2dfe",
   *   "option_item_ids": ["5cb0251c-cbfe-44b9-9f0f-8a1884989cf3"],
   *   "quantity": 1,
   *   "delivery_address_id": "0dcb2293-5c2a-43f6-b128-6e274bac7871",
   *   "merchant_uid": "20241201-00001",
   *   "imp_uid": "imp_test_1234567890"
   * }
   * @example requestBody {
   *   "item_id": "1f41caf0-dda0-4f9e-8085-35d1e79a2dfe",
   *   "option_item_ids": ["5cb0251c-cbfe-44b9-9f0f-8a1884989cf3"],
   *   "quantity": 2,
   *   "new_address": {
   *     "postal_code": "54321",
   *     "address": "서울시 서초구 서초대로",
   *     "address_detail": "456번지"
   *   },
   *   "merchant_uid": "20241201-00002",
   *   "imp_uid": "imp_test_9876543210"
   * }
   */
  @Post('/')
  @SuccessResponse(200, '주문 생성 성공')
  @Response<TsoaResponse<CreateOrderResponseDto>>(
    200,
    '주문 생성 성공',
    {
      resultType: 'SUCCESS',
      error: null,
      success: {
        order_id: '1f41caf0-dda0-4f9e-8085-35d1e79a2dfe',
        payment_status: 'paid',
        payment_method: 'card',
        payment_gateway: 'portone'
      }
    }
  )
  @Response<ErrorResponse>(401, '로그인이 필요합니다.', commonError.unauthorized)
  @Response<ErrorResponse>(
    400,
    '입력값 검증 실패',
    {
      resultType: 'FAIL',
      error: {
        errorCode: '400',
        reason: '입력값 검증 실패',
        data: {
          item_id: ['item_id는 UUID 형식이어야 합니다'],
          option_item_ids: ['option_item_ids의 각 값은 UUID 형식이어야 합니다'],
          quantity: ['quantity는 정수여야 합니다', 'quantity는 1 이상이어야 합니다'],
          imp_uid: ['imp_uid는 필수입니다'],
          merchant_uid: ['merchant_uid는 필수입니다']
        }
      },
      success: null
    }
  )
  @Response<ErrorResponse>(
    404,
    '상품을 찾을 수 없습니다.',
    {
      resultType: 'FAIL',
      error: {
        errorCode: 'ITEM-NOT-FOUND',
        reason: '상품을 찾을 수 없습니다.',
        data: 'Item ID: {itemId}'
      },
      success: null
    }
  )
  @Response<ErrorResponse>(
    400,
    '재고가 부족합니다.',
    {
      resultType: 'FAIL',
      error: {
        errorCode: 'INSUFFICIENT-STOCK',
        reason: '재고가 부족합니다.',
        data: 'Item: {itemName}'
      },
      success: null
    }
  )
  @Response<ErrorResponse>(
    400,
    '결제 검증 실패',
    {
      resultType: 'FAIL',
      error: {
        errorCode: 'PAYMENT-VERIFICATION-ERROR',
        reason: '결제 검증 실패',
        data: '결제 정보 검증 중 오류가 발생했습니다.'
      },
      success: null
    }
  )
  @Response<ErrorResponse>(
    400,
    '결제 금액 불일치',
    {
      resultType: 'FAIL',
      error: {
        errorCode: 'PAYMENT-AMOUNT-MISMATCH',
        reason: '결제 금액이 일치하지 않습니다.',
        data: '예상 금액: {expected}, 실제 금액: {actual}'
      },
      success: null
    }
  )
  @Response<ErrorResponse>(
    500,
    '주문 생성 실패',
    {
      resultType: 'FAIL',
      error: {
        errorCode: 'ORDER-ERROR',
        reason: '주문 생성 실패',
        data: '주문 생성 중 오류가 발생했습니다.'
      },
      success: null
    }
  )
  @Response<ErrorResponse>(500, '서버 에러', commonError.serverError)
  public async createOrder(
    @Body() requestBody: CreateOrderRequestDto,
    @Header('x-user-id') userId?: string
  ): Promise<TsoaResponse<CreateOrderResponseDto>> {
    if (!userId) {
      throw new BasicError(401, 'UNAUTHORIZED', '로그인이 필요합니다.', '');
    }

    let dto: CreateOrderRequestDto;
    try {
      dto = plainToInstance(CreateOrderRequestDto, requestBody);
      const errors = await validate(dto);
      if (errors.length > 0) {
        const formattedErrors: Record<string, { message: string; value?: any }> = {};
        errors.forEach((error) => {
          if (error.constraints) {
            const constraintMessages = Object.values(error.constraints);
            formattedErrors[error.property] = {
              message: constraintMessages[0] || '입력값 검증 실패',
              value: error.value
            };
          }
        });
        throw new ValidateError(formattedErrors, '입력값 검증 실패');
      }
    } catch (error) {
      if (error instanceof ValidateError) {
        throw error;
      }
      throw new ValidateError(
        { requestBody: { message: '잘못된 요청 본문 형식입니다' } },
        '입력값 검증 실패'
      );
    }

    const result = await this.ordersService.createOrder(
      dto.item_id,
      dto.option_item_ids,
      dto.quantity,
      userId,
      dto.delivery_address_id,
      dto.new_address,
      dto.merchant_uid,
      dto.imp_uid
    );

    const receipt = await this.ordersService.getReceiptByOrderId(result.order_id);

    return {
      resultType: 'SUCCESS',
      error: null,
      success: {
        order_id: result.order_id,
        payment_status: receipt?.payment_status || 'paid',
        payment_method: receipt?.payment_method || null,
        payment_gateway: receipt?.payment_gateway || null
      }
    };
  }

  /**
   * 주문 조회 (결제 완료 정보)
   * @summary 주문 정보를 조회합니다
   * @param orderId 주문 ID
   * @param userId 사용자 ID (임시, 헤더에서 추출) - TODO: JWT 구현 후 변경
   * @returns 주문 조회 결과
   */
  @Get('/{orderId}')
  @SuccessResponse(200, '주문 조회 성공')
  @Response<TsoaResponse<GetOrderResponseDto>>(
    200,
    '주문 조회 성공',
    {
      resultType: 'SUCCESS',
      error: null,
      success: {
        order_id: '1f41caf0-dda0-4f9e-8085-35d1e79a2dfe',
        order_number: '20241201-00001',
        status: 'PAID',
        delivery_address: {
          postal_code: '12345',
          address: '서울시 강남구 테헤란로',
          address_detail: '123번지'
        },
        first_item: {
          thumbnail: 'https://example.com/thumbnail.jpg',
          title: '상품명',
          selected_options: ['옵션그룹1 옵션1'],
          reformer_nickname: '리포머닉네임'
        },
        remaining_items_count: 1,
        order_items: [
          {
            thumbnail: 'https://example.com/thumbnail.jpg',
            title: '상품명',
            selected_options: ['옵션그룹1 옵션1'],
            reformer_nickname: '리포머닉네임'
          },
          {
            thumbnail: 'https://example.com/thumbnail2.jpg',
            title: '상품명2',
            selected_options: ['옵션그룹2 옵션2'],
            reformer_nickname: '리포머닉네임'
          }
        ],
        payment: {
          amount: 53000,
          payment_method: 'card',
          card_name: '신한카드',
          masked_card_number: '1234-****-****-3456',
          card_info: '신한카드 1234-5678-9012-3456',
          approved_at: new Date('2024-12-01T10:30:00Z')
        },
        total_amount: 53000,
        delivery_fee: 3000
      }
    }
  )
  @Response<ErrorResponse>(401, '로그인이 필요합니다.', commonError.unauthorized)
  @Response<ErrorResponse>(
    404,
    '주문을 찾을 수 없습니다.',
    {
      resultType: 'FAIL',
      error: {
        errorCode: 'ORDER-NOT-FOUND',
        reason: '주문을 찾을 수 없습니다.',
        data: 'Order ID: {orderId}'
      },
      success: null
    }
  )
  @Response<ErrorResponse>(
    500,
    '주문 조회 실패',
    {
      resultType: 'FAIL',
      error: {
        errorCode: 'ORDER-ERROR',
        reason: '주문 조회 실패',
        data: '주문 조회 중 오류가 발생했습니다.'
      },
      success: null
    }
  )
  @Response<ErrorResponse>(500, '서버 에러', commonError.serverError)
  public async getOrder(
    @Path() orderId: string,
    @Header('x-user-id') userId?: string
  ): Promise<TsoaResponse<GetOrderResponseDto>> {
    if (!userId) {
      throw new BasicError(401, 'UNAUTHORIZED', '로그인이 필요합니다.', '');
    }

    const result = await this.ordersService.getOrder(orderId, userId);

    return {
      resultType: 'SUCCESS',
      error: null,
      success: result
    };
  }
}
