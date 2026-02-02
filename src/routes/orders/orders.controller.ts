import {
  Body,
  Controller,
  Example,
  Get,
  Header,
  Path,
  Post,
  Request,
  Response,
  Route,
  Security,
  SuccessResponse,
  Tags
} from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import { TsoaResponse, ErrorResponse, commonError } from '../../config/tsoaResponse.js';
import { BasicError } from '../../middleware/error.js';
import { OrdersService } from './orders.service.js';
import {
  GetOrderSheetRequestDto,
  CreateOrderRequestDto,
  VerifyPaymentRequestDto,
  GetOrderSheetFromCartRequestDto,
  CreateOrderFromCartRequestDto
} from './dto/orders.req.dto.js';
import {
  GetOrderSheetResponseDto,
  CreateOrderResponseDto,
  VerifyPaymentResponseDto,
  GetOrderResponseDto
} from './dto/orders.res.dto.js';
import { validateDto } from '../../middleware/validator.js';

@Route('orders')
@Tags('Orders')
@Security('jwt')
export class OrdersController extends Controller {
  private ordersService: OrdersService;

  constructor() {
    super();
    this.ordersService = new OrdersService();
  }

  /**
   * userId 필수 체크 (공통 함수)
   */
  private requireUserId(userId?: string): string {
    if (!userId) {
      throw new BasicError(401, 'UNAUTHORIZED', '로그인이 필요합니다.', '');
    }
    return userId;
  }

  /**
   * 주문서 정보 조회
   * @summary 주문서 정보를 조회하고 주문 번호(order_number)를 미리 생성하여 반환합니다
   * @param requestBody 주문서 정보 조회 요청
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
  @Security('jwt')
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
        errorCode: 'ERR-VALIDATION',
        reason: '입력값 검증 실패',
        data: [
          { field: 'item_id', value: 'invalid', messages: 'item_id는 UUID 형식이어야 합니다' },
          { field: 'quantity', value: 0, messages: 'quantity는 1 이상이어야 합니다' }
        ]
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
    @Request() req: ExpressRequest
  ): Promise<TsoaResponse<GetOrderSheetResponseDto>> {
    const userId = req.user?.id;
    const validUserId = this.requireUserId(userId);
    const dto = await validateDto(GetOrderSheetRequestDto, requestBody);

    const result = await this.ordersService.getOrderSheet(
      dto.item_id,
      dto.option_item_ids,
      dto.quantity,
      validUserId,
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
   * @summary 주문을 PENDING 상태로 생성합니다 (결제 전)
   * @param requestBody 주문 생성 요청 (merchant_uid 필수)
   * @returns 주문 생성 결과 (결제 상태는 'pending')
   * @description merchant_uid는 주문 시트 조회 API(POST /orders/sheet)에서 받은 order_number와 동일한 값이어야 합니다.
   *              프론트엔드에서 주문 시트 조회 시 받은 order_number를 merchant_uid로 사용하여 포트원 결제를 진행하고,
   *              결제 진행 전에 이 API를 호출하여 주문을 생성합니다. 결제 완료는 POST /orders/verify 또는 웹훅에서 처리됩니다.
   * @example requestBody {
   *   "item_id": "1f41caf0-dda0-4f9e-8085-35d1e79a2dfe",
   *   "option_item_ids": ["5cb0251c-cbfe-44b9-9f0f-8a1884989cf3"],
   *   "quantity": 1,
   *   "delivery_address_id": "0dcb2293-5c2a-43f6-b128-6e274bac7871",
   *   "merchant_uid": "481025937412"
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
   *   "merchant_uid": "481025937412"
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
        payment_required: false,
        payment_info: {
          merchant_uid: '481025937412',
          amount: 53000
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
        errorCode: 'ERR-VALIDATION',
        reason: '입력값 검증 실패',
        data: [
          { field: 'item_id', value: 'invalid', messages: 'item_id는 UUID 형식이어야 합니다' },
          { field: 'quantity', value: 0, messages: 'quantity는 1 이상이어야 합니다' },
          { field: 'merchant_uid', value: undefined, messages: 'merchant_uid는 필수입니다' }
        ]
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
    @Request() req: ExpressRequest
  ): Promise<TsoaResponse<CreateOrderResponseDto>> {
    const userId = req.user?.id;
    const validUserId = this.requireUserId(userId);
    const dto = await validateDto(CreateOrderRequestDto, requestBody);

    const result = await this.ordersService.createOrder(
      dto.item_id,
      dto.option_item_ids,
      dto.quantity,
      validUserId,
      dto.delivery_address_id,
      dto.new_address,
      dto.merchant_uid
    );

    return {
      resultType: 'SUCCESS',
      error: null,
      success: result
    };
  }

  /**
   * 결제 검증
   * @summary 포트원 결제 완료 후 결제를 검증하고 주문 상태를 업데이트합니다
   * @param requestBody 결제 검증 요청 (order_id, imp_uid)
   * @returns 결제 검증 결과
   * @description 프론트엔드에서 포트원 결제 완료 콜백에서 호출합니다.
   *              포트원 API로 결제 정보를 검증하고 주문 상태를 PAID로 업데이트합니다.
   * @example requestBody {
   *   "order_id": "1f41caf0-dda0-4f9e-8085-35d1e79a2dfe",
   *   "imp_uid": "imp_1234567890"
   * }
   */
  @Post('/verify')
  @SuccessResponse(200, '결제 검증 성공')
  @Response<TsoaResponse<VerifyPaymentResponseDto>>(
    200,
    '결제 검증 성공',
    {
      resultType: 'SUCCESS',
      error: null,
      success: {
        success: true
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
        errorCode: 'ERR-VALIDATION',
        reason: '입력값 검증 실패',
        data: [
          { field: 'order_id', value: 'invalid', messages: 'order_id는 UUID 형식이어야 합니다' },
          { field: 'imp_uid', value: undefined, messages: 'imp_uid는 필수입니다' }
        ]
      },
      success: null
    }
  )
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
  @Response<ErrorResponse>(500, '서버 에러', commonError.serverError)
  public async verifyPayment(
    @Body() requestBody: VerifyPaymentRequestDto,
    @Request() req: ExpressRequest
  ): Promise<TsoaResponse<VerifyPaymentResponseDto>> {
    const userId = req.user?.id;
    const validUserId = this.requireUserId(userId);
    const dto = await validateDto(VerifyPaymentRequestDto, requestBody);

    await this.ordersService.verifyPayment(dto.order_id, dto.imp_uid);

    return {
      resultType: 'SUCCESS',
      error: null,
      success: {
        success: true
      }
    };
  }

  /**
   * 주문 조회 (결제 완료 정보)
   * @summary 주문 정보를 조회합니다
   * @param orderId 주문 ID (UUID 또는 receipt_number 12자리 숫자)
   * @returns 주문 조회 결과
   * @description orderId는 UUID 형식 또는 receipt_number(12자리 숫자) 형식을 모두 지원합니다.
   * @example orderId "1f41caf0-dda0-4f9e-8085-35d1e79a2dfe"
   * @example orderId "481025937412"
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
    @Request() req: ExpressRequest
  ): Promise<TsoaResponse<GetOrderResponseDto>> {
    const userId = req.user?.id;
    const validUserId = this.requireUserId(userId);

    const result = await this.ordersService.getOrder(orderId, validUserId);

    return {
      resultType: 'SUCCESS',
      error: null,
      success: result
    };
  }

  /**
   * 포트원 웹훅
   * @summary 포트원 결제 완료/실패 알림을 처리합니다
   * @param requestBody 포트원 웹훅 요청 본문
   * @param request Express 요청 객체 (IP 주소 확인용)
   * @returns 성공 응답
   * @description 포트원 서버에서 결제 상태 변경 시 자동으로 호출됩니다.
   *              결제 정보를 검증하고 주문 상태를 업데이트합니다.
   *              보안: 포트원 IP 화이트리스트 검증 포함
   */
  @Post('/webhook')
  @SuccessResponse(200, '웹훅 처리 성공')
  @Response<ErrorResponse>(500, '서버 에러', commonError.serverError)
  public async handleWebhook(
    @Body() requestBody: { imp_uid: string; merchant_uid: string; status?: string },
    @Request() request?: ExpressRequest
  ): Promise<{ status: string }> {
    try {
      const { imp_uid, merchant_uid } = requestBody;

      if (!imp_uid || !merchant_uid) {
        console.warn('웹훅: 필수 파라미터 누락', { imp_uid, merchant_uid });
        return { status: 'invalid_request' };
      }

      if (request) {
        const clientIp = this.getClientIp(request);
        const allowedIps = [
          '52.78.100.19',
          '52.78.48.223',
          '52.78.5.241',
          '13.228.32.0'
        ];

        if (!allowedIps.includes(clientIp)) {
          console.warn('웹훅: 허용되지 않은 IP에서 접근', { 
            clientIp, 
            imp_uid, 
            merchant_uid 
          });
          return { status: 'unauthorized' };
        }
      }

      await this.ordersService.handleWebhook(imp_uid, merchant_uid);

      return { status: 'ok' };
    } catch (error) {
      console.error('웹훅 처리 중 오류:', error);
      return { status: 'error' };
    }
  }

  /**
   * 클라이언트 IP 주소 추출
   * 프록시 환경(x-forwarded-for)을 고려하여 실제 클라이언트 IP 추출
   */
  private getClientIp(request: ExpressRequest): string {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) 
        ? forwardedFor[0] 
        : forwardedFor.split(',')[0].trim();
      return ips;
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    return request.socket.remoteAddress || 'unknown';
  }

  /**
   * 장바구니에서 주문서 정보 조회
   * @summary 장바구니 항목들로 주문서 정보를 조회하고 주문 번호(receipt_number)를 미리 생성하여 반환합니다
   * @param requestBody 장바구니 주문서 정보 조회 요청
   * @returns 주문서 정보 조회 결과 (order_number 포함)
   * @description 반환된 order_number는 프론트엔드에서 포트원 결제 시 merchant_uid로 사용해야 합니다.
   *              결제 완료 후 POST /orders/from-cart API 호출 시에도 같은 order_number를 merchant_uid로 전달해야 합니다.
   * @example requestBody {
   *   "cart_ids": ["550e8400-e29b-41d4-a716-446655440000", "660e8400-e29b-41d4-a716-446655440001"]
   * }
   * @example requestBody {
   *   "cart_ids": ["550e8400-e29b-41d4-a716-446655440000", "660e8400-e29b-41d4-a716-446655440001"],
   *   "new_address": {
   *     "postal_code": "12345",
   *     "address": "서울시 강남구 테헤란로",
   *     "address_detail": "123번지"
   *   }
   * }
   */
  @Post('/sheet/from-cart')
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
        errorCode: 'ERR-VALIDATION',
        reason: '입력값 검증 실패',
        data: [
          { field: 'cart_ids', value: [], messages: 'cart_ids는 최소 1개 이상이어야 합니다' }
        ]
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
  public async getOrderSheetFromCart(
    @Body() requestBody: GetOrderSheetFromCartRequestDto,
    @Request() req: ExpressRequest
  ): Promise<TsoaResponse<GetOrderSheetResponseDto>> {
    const userId = req.user?.id;
    const validUserId = this.requireUserId(userId);
    const dto = await validateDto(GetOrderSheetFromCartRequestDto, requestBody);

    const result = await this.ordersService.getOrderSheetFromCart(
      dto.cart_ids,
      validUserId,
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
   * 장바구니에서 주문 생성
   * @summary 장바구니 항목들로 주문을 PENDING 상태로 생성합니다 (결제 전)
   * @param requestBody 장바구니 주문 생성 요청 (merchant_uid 필수)
   * @returns 주문 생성 결과 (결제 상태는 'pending')
   * @description merchant_uid는 주문 시트 조회 API(POST /orders/sheet/from-cart)에서 받은 order_number와 동일한 값이어야 합니다.
   *              프론트엔드에서 주문 시트 조회 시 받은 order_number를 merchant_uid로 사용하여 포트원 결제를 진행하고,
   *              결제 진행 전에 이 API를 호출하여 주문을 생성합니다. 결제 완료는 POST /orders/verify 또는 웹훅에서 처리됩니다.
   * @example requestBody {
   *   "cart_ids": ["550e8400-e29b-41d4-a716-446655440000", "660e8400-e29b-41d4-a716-446655440001"],
   *   "delivery_address_id": "0dcb2293-5c2a-43f6-b128-6e274bac7871",
   *   "merchant_uid": "481025937412"
   * }
   * @example requestBody {
   *   "cart_ids": ["550e8400-e29b-41d4-a716-446655440000", "660e8400-e29b-41d4-a716-446655440001"],
   *   "new_address": {
   *     "postal_code": "54321",
   *     "address": "서울시 서초구 서초대로",
   *     "address_detail": "456번지"
   *   },
   *   "merchant_uid": "481025937412"
   * }
   */
  @Post('/from-cart')
  @SuccessResponse(200, '주문 생성 성공')
  @Response<TsoaResponse<CreateOrderResponseDto>>(
    200,
    '주문 생성 성공',
    {
      resultType: 'SUCCESS',
      error: null,
      success: {
        order_id: '1f41caf0-dda0-4f9e-8085-35d1e79a2dfe',
        payment_required: false,
        payment_info: {
          merchant_uid: '481025937412',
          amount: 53000
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
        errorCode: 'ERR-VALIDATION',
        reason: '입력값 검증 실패',
        data: [
          { field: 'cart_ids', value: [], messages: 'cart_ids는 최소 1개 이상이어야 합니다' },
          { field: 'merchant_uid', value: undefined, messages: 'merchant_uid는 필수입니다' }
        ]
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
  public async createOrderFromCart(
    @Body() requestBody: CreateOrderFromCartRequestDto,
    @Request() req: ExpressRequest
  ): Promise<TsoaResponse<CreateOrderResponseDto>> {
    const userId = req.user?.id;
    const validUserId = this.requireUserId(userId);
    const dto = await validateDto(CreateOrderFromCartRequestDto, requestBody);

    const result = await this.ordersService.createOrdersFromCart(
      dto.cart_ids,
      validUserId,
      dto.delivery_address_id,
      dto.new_address,
      dto.merchant_uid
    );

    return {
      resultType: 'SUCCESS',
      error: null,
      success: result
    };
  }
}
