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
import prisma from '../../config/prisma.config.js';
import { OrdersService } from './orders.service.js';
import type {
  GetOrderSheetRequestDto,
  GetOrderSheetResponseDto,
  CreateOrderRequestDto,
  CreateOrderResponseDto,
  GetOrderResponseDto
} from './orders.dto.js';

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
  @Response<ErrorResponse>(401, '로그인이 필요합니다.', commonError.unauthorized)
  @Response<ErrorResponse>(404, '상품을 찾을 수 없습니다.', commonError.notFound)
  @Response<ErrorResponse>(400, '재고가 부족합니다.', commonError.badRequest)
  @Response<ErrorResponse>(500, '서버 에러', commonError.serverError)
  @Example<GetOrderSheetRequestDto>({
    item_id: '550e8400-e29b-41d4-a716-446655440000',
    option_item_ids: ['660e8400-e29b-41d4-a716-446655440001'],
    quantity: 1
  })
  public async getOrderSheet(
    @Body() requestBody: GetOrderSheetRequestDto,
    @Header('x-user-id') userId?: string
  ): Promise<TsoaResponse<GetOrderSheetResponseDto>> {
    if (!userId) {
      throw new BasicError(401, 'UNAUTHORIZED', '로그인이 필요합니다.', '');
    }

    const result = await this.ordersService.getOrderSheet(
      requestBody.item_id,
      requestBody.option_item_ids,
      requestBody.quantity,
      userId,
      requestBody.delivery_address_id,
      requestBody.new_address
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
   * @example requestBody 결제 완료 후 주문 생성 - 결제가 완료된 후 imp_uid와 merchant_uid(order_number)와 함께 주문을 생성하는 경우
   * {
   *   "item_id": "1f41caf0-dda0-4f9e-8085-35d1e79a2dfe",
   *   "option_item_ids": ["5cb0251c-cbfe-44b9-9f0f-8a1884989cf3"],
   *   "quantity": 1,
   *   "delivery_address_id": "0dcb2293-5c2a-43f6-b128-6e274bac7871",
   *   "merchant_uid": "20241201-00001",
   *   "imp_uid": "imp_test_1234567890"
   * }
   * @example requestBody 새 배송지로 주문 생성 - 새로운 배송지를 입력하여 결제 완료 후 주문 생성
   * {
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
  @Response<ErrorResponse>(401, '로그인이 필요합니다.', commonError.unauthorized)
  @Response<ErrorResponse>(404, '상품을 찾을 수 없습니다.', commonError.notFound)
  @Response<ErrorResponse>(400, '재고가 부족합니다.', commonError.badRequest)
  @Response<ErrorResponse>(400, '결제 검증 실패', commonError.badRequest)
  @Response<ErrorResponse>(500, '서버 에러', commonError.serverError)
  @Example<CreateOrderRequestDto>({
    item_id: '1f41caf0-dda0-4f9e-8085-35d1e79a2dfe',
    option_item_ids: ['5cb0251c-cbfe-44b9-9f0f-8a1884989cf3'],
    quantity: 1,
    delivery_address_id: '0dcb2293-5c2a-43f6-b128-6e274bac7871',
    merchant_uid: 'order-test-20241201-001',
    imp_uid: 'imp_test_1234567890'
  })
  public async createOrder(
    @Body() requestBody: CreateOrderRequestDto,
    @Header('x-user-id') userId?: string
  ): Promise<TsoaResponse<CreateOrderResponseDto>> {
    if (!userId) {
      throw new BasicError(401, 'UNAUTHORIZED', '로그인이 필요합니다.', '');
    }

    const result = await this.ordersService.createOrder(
      requestBody.item_id,
      requestBody.option_item_ids,
      requestBody.quantity,
      userId,
      requestBody.delivery_address_id,
      requestBody.new_address,
      requestBody.merchant_uid,
      requestBody.imp_uid
    );

    const receipt = await prisma.reciept.findFirst({
      where: { order_id: result.order_id },
      orderBy: { created_at: 'desc' }
    });

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
  @Response<ErrorResponse>(401, '로그인이 필요합니다.', commonError.unauthorized)
  @Response<ErrorResponse>(404, '주문을 찾을 수 없습니다.', commonError.notFound)
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
