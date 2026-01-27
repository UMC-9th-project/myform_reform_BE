import { runInTransaction } from '../../config/prisma.config.js';
import { order_status_enum, target_type_enum } from '@prisma/client';
import {
  getPortonePayment,
  type PortonePaymentInfo
} from '../../config/portone.config.js';
import {
  ItemNotFoundError,
  InsufficientStockError,
  OrderNotFoundError,
  OrderError,
  PaymentError,
  PaymentVerificationError,
  PaymentAmountMismatchError
} from './orders.error.js';
import type {
  OrderSheetResponse,
  CreateOrderRequest,
  CreateOrderResponse,
  OrderResponse,
  OrderItemInfo
} from './orders.model.js';
import type { GetOrderResponseDto } from './dto/orders.res.dto.js';
import { OrdersRepository } from './orders.repository.js';
import { customAlphabet } from 'nanoid';

export class OrdersService {
  private static readonly ORDER_NUMBER_ALPHABET = '0123456789';
  private static readonly ORDER_NUMBER_LENGTH = 12;
  private static readonly generateNumericId = customAlphabet(
    OrdersService.ORDER_NUMBER_ALPHABET,
    OrdersService.ORDER_NUMBER_LENGTH
  );

  constructor(private repository: OrdersRepository = new OrdersRepository()) {}

  /**
   * 옵션 검증 (공통 로직)
   */
  private validateOptions(
    optionItems: Array<{
      option_group: { option_group_id: string; item_id: string };
      option_item_id: string;
    }>,
    itemId: string
  ): void {
    if (optionItems.length === 0) {
      return;
    }

    const invalidOptions = optionItems.filter(
      (opt) => opt.option_group.item_id !== itemId
    );
    if (invalidOptions.length > 0) {
      throw new ItemNotFoundError('요청한 옵션이 해당 상품의 옵션이 아닙니다.');
    }

    const optionGroupIds = new Set<string>();
    for (const optionItem of optionItems) {
      const groupId = optionItem.option_group.option_group_id;
      if (optionGroupIds.has(groupId)) {
        throw new ItemNotFoundError(
          '동일 옵션 그룹에서 여러 옵션을 선택할 수 없습니다.'
        );
      }
      optionGroupIds.add(groupId);
    }
  }

  /**
   * 재고 확인 (공통 로직)
   */
  private validateStock(
    optionItems: Array<{ quantity: number | null; name: string | null }>,
    quantity: number
  ): void {
    for (const optionItem of optionItems) {
      if (optionItem.quantity !== null && optionItem.quantity < quantity) {
        throw new InsufficientStockError(optionItem.name || '옵션');
      }
    }
  }

  /**
   * 배송지 처리 (공통 로직)
   */
  private async processDeliveryAddress(
    userId: string,
    ownerId: string,
    deliveryAddressId?: string,
    newAddress?: {
      postal_code?: string;
      address?: string;
      address_detail?: string;
    }
  ): Promise<string | undefined> {
    if (deliveryAddressId) {
      const address = await this.repository.findDeliveryAddressById(
        deliveryAddressId,
        userId
      );
      if (!address) {
        throw new OrderError(
          '배송지 정보가 올바르지 않습니다.',
          '접근할 수 없는 배송지입니다.'
        );
      }
      return deliveryAddressId;
    } else if (newAddress) {
      if (!newAddress.postal_code || !newAddress.address) {
        throw new OrderError(
          '배송지 정보가 올바르지 않습니다.',
          '우편번호와 주소는 필수 입력 항목입니다.'
        );
      }

      const newDeliveryAddress = await this.repository.createDeliveryAddress({
        user_id: userId,
        owner_id: ownerId,
        postal_code: newAddress.postal_code,
        address: newAddress.address,
        address_detail: newAddress.address_detail || null,
        is_default: false
      });
      return newDeliveryAddress.delivery_address_id;
    } else {
      const defaultAddress =
        await this.repository.findDefaultDeliveryAddress(userId);
      return defaultAddress?.delivery_address_id;
    }
  }

  /**
   * 배송지 정보 조회 (주문서용, 생성하지 않음)
   */
  private async getDeliveryAddressInfo(
    userId: string,
    deliveryAddressId?: string,
    newAddress?: {
      postal_code?: string;
      address?: string;
      address_detail?: string;
    }
  ): Promise<{
    delivery_address_id?: string;
    postal_code: string | null;
    address: string | null;
    address_detail: string | null;
  } | null> {
    if (deliveryAddressId) {
      const address = await this.repository.findDeliveryAddressById(
        deliveryAddressId,
        userId
      );
      if (address) {
        return {
          delivery_address_id: address.delivery_address_id,
          postal_code: address.postal_code,
          address: address.address,
          address_detail: address.address_detail
        };
      }
    } else if (newAddress) {
      return {
        postal_code: newAddress.postal_code || null,
        address: newAddress.address || null,
        address_detail: newAddress.address_detail || null
      };
    } else {
      const defaultAddress =
        await this.repository.findDefaultDeliveryAddress(userId);
      if (defaultAddress) {
        return {
          delivery_address_id: defaultAddress.delivery_address_id,
          postal_code: defaultAddress.postal_code,
          address: defaultAddress.address,
          address_detail: defaultAddress.address_detail
        };
      }
    }
    return null;
  }

  /**
   * 주문번호(receipt_number) 생성 (숫자 전용 12자리)
   * nanoid를 사용하여 충돌 가능성이 매우 낮은 고유 ID 생성
   * @returns 주문번호 문자열 (예: "481025937412")
   */
  private async generateReceiptNumber(): Promise<string> {
    try {
      const maxAttempts = 10;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const receiptNumber = OrdersService.generateNumericId();

        const existing =
          await this.repository.findReceiptByReceiptNumber(receiptNumber);
        if (!existing) {
          return receiptNumber;
        }
      }

      const timestamp = Date.now().toString().slice(-8);
      const randomPart = OrdersService.generateNumericId().slice(0, 4);
      return `${timestamp}${randomPart}`;
    } catch (error) {
      throw new OrderError(
        `주문번호 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        '주문번호 생성 중 데이터베이스 오류가 발생했습니다.'
      );
    }
  }

  /**
   * 카드번호 마스킹 (가운데 별 처리)
   * @param cardNumber 카드번호 (예: "1234567890123456")
   * @returns 마스킹된 카드번호 (예: "1234-****-****-3456")
   */
  private maskCardNumber(cardNumber: string | null | undefined): string | null {
    if (!cardNumber) {
      return null;
    }

    const cleaned = cardNumber.replace(/\D/g, '');
    if (cleaned.length < 8) {
      return cardNumber;
    }

    if (cleaned.length === 16) {
      return `${cleaned.slice(0, 4)}-****-****-${cleaned.slice(-4)}`;
    } else if (cleaned.length === 15) {
      return `${cleaned.slice(0, 4)}-****-***-${cleaned.slice(-4)}`;
    } else {
      const first4 = cleaned.slice(0, 4);
      const last4 = cleaned.slice(-4);
      const middle = '*'.repeat(Math.max(0, cleaned.length - 8));
      return `${first4}-${middle}-${last4}`;
    }
  }

  /**
   * 카드 정보 파싱 (포트원 응답 또는 JSON 문자열에서)
   * @param transaction receipt.transaction 필드 값 (JSON 문자열 또는 null)
   * @returns 포맷팅된 카드 정보 문자열 또는 null
   */
  private parseCardInfo(transaction: string | null): string | null {
    if (!transaction) {
      return null;
    }

    try {
      const cardData = JSON.parse(transaction);

      if (cardData.card_name && cardData.card_number) {
        const cardName = cardData.card_name;
        const cardNumber = cardData.card_number;
        const quota = cardData.card_quota || 0;

        if (quota > 0) {
          return `${cardName} ${cardNumber} (${quota}개월 할부)`;
        } else {
          return `${cardName} ${cardNumber}`;
        }
      }

      return transaction;
    } catch {
      return transaction;
    }
  }

  /**
   * 카드 정보 추출 (카드명, 마스킹된 카드번호)
   * @param transaction receipt.transaction 필드 값 (JSON 문자열 또는 null)
   * @returns 카드명과 마스킹된 카드번호 객체
   */
  private extractCardDetails(transaction: string | null): {
    card_name: string | null;
    masked_card_number: string | null;
  } {
    if (!transaction) {
      return {
        card_name: null,
        masked_card_number: null
      };
    }

    try {
      const cardData = JSON.parse(transaction);

      if (cardData.card_name && cardData.card_number) {
        return {
          card_name: cardData.card_name,
          masked_card_number: this.maskCardNumber(cardData.card_number)
        };
      }

      return {
        card_name: null,
        masked_card_number: null
      };
    } catch {
      return {
        card_name: null,
        masked_card_number: null
      };
    }
  }

  /**
   * UUID 또는 receipt_number로 receipt 조회
   * @param orderIdOrNumber UUID 또는 receipt_number
   * @param userId 사용자 ID
   * @returns receipt 정보 (order 포함) 또는 null
   */
  private async findReceiptByIdOrNumber(
    orderIdOrNumber: string,
    userId: string
  ) {
    try {
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          orderIdOrNumber
        );

      if (isUuid) {
        // UUID인 경우 order_id로 조회 후 receipt 반환
        const order = await this.repository.findOrderById(
          orderIdOrNumber,
          userId
        );
        if (!order) {
          return null;
        }
        return order.receipt;
      } else {
        if (!/^\d{12}$/.test(orderIdOrNumber)) {
          throw new OrderError(
            '주문 조회 실패',
            `잘못된 주문 ID 또는 주문번호 형식입니다: ${orderIdOrNumber}`
          );
        }
        return await this.repository.findReceiptByReceiptNumberWithOrders(
          orderIdOrNumber,
          userId
        );
      }
    } catch (error) {
      if (error instanceof OrderError) {
        throw error;
      }

      if (error instanceof Error) {
        const errorMessage = error.message;
        if (
          errorMessage.includes('Invalid') ||
          errorMessage.includes('UUID') ||
          errorMessage.includes('Inconsistent column data')
        ) {
          throw new OrderError(
            '주문 조회 실패',
            `잘못된 주문 ID 또는 주문번호 형식입니다: ${orderIdOrNumber}`
          );
        }
        if (
          errorMessage.includes('Record to update not found') ||
          errorMessage.includes('Unique constraint')
        ) {
          throw new OrderError(
            '주문 조회 실패',
            `주문을 찾을 수 없습니다: ${orderIdOrNumber}`
          );
        }
      }

      throw new OrderError(
        '주문 조회 실패',
        `주문 ID 또는 번호: ${orderIdOrNumber}`
      );
    }
  }

  /**
   * 주문서 정보 조회
   */
  async getOrderSheet(
    itemId: string,
    optionItemIds: string[],
    quantity: number,
    userId: string,
    deliveryAddressId?: string,
    newAddress?: {
      postal_code?: string;
      address?: string;
      address_detail?: string;
    }
  ): Promise<OrderSheetResponse> {
    try {
      const item = await this.repository.findItemWithOptionGroups(
        itemId,
        optionItemIds
      );

      if (!item) {
        throw new ItemNotFoundError(itemId);
      }

      const optionItems =
        await this.repository.findOptionItemsByIds(optionItemIds);

      if (optionItems.length !== optionItemIds.length) {
        throw new ItemNotFoundError('존재하지 않는 옵션이 포함되어 있습니다.');
      }

      // 옵션 검증
      this.validateOptions(optionItems, itemId);

      // 재고 확인 (조합별 수량만큼 확인)
      this.validateStock(optionItems, quantity);

      const extraPriceSum = optionItems.reduce(
        (sum: number, item: { extra_price: number | null }) =>
          sum + (item.extra_price || 0),
        0
      );

      const selectedOptions = optionItems.map(
        (item: {
          extra_price: number | null;
          option_group: { name: string | null };
          name: string | null;
        }) => {
          const extraPrice = item.extra_price || 0;
          const priceText =
            extraPrice > 0 ? ` (+${extraPrice.toLocaleString()}원)` : '';
          return `${item.option_group.name || ''} ${item.name || ''}${priceText}`;
        }
      );

      const basePrice = item.price ? Number(item.price) : 0;
      const productAmount = (basePrice + extraPriceSum) * quantity;
      const deliveryFee = item.delivery ? Number(item.delivery) : 0;
      const totalAmount = productAmount + deliveryFee;

      let deliveryAddress = null;
      if (deliveryAddressId) {
        const address = await this.repository.findDeliveryAddressById(
          deliveryAddressId,
          userId
        );
        if (address) {
          deliveryAddress = {
            delivery_address_id: address.delivery_address_id,
            postal_code: address.postal_code,
            address: address.address,
            address_detail: address.address_detail
          };
        }
      } else if (newAddress) {
        deliveryAddress = {
          postal_code: newAddress.postal_code || null,
          address: newAddress.address || null,
          address_detail: newAddress.address_detail || null
        };
      } else {
        const defaultAddress =
          await this.repository.findDefaultDeliveryAddress(userId);
        if (defaultAddress) {
          deliveryAddress = {
            delivery_address_id: defaultAddress.delivery_address_id,
            postal_code: defaultAddress.postal_code,
            address: defaultAddress.address,
            address_detail: defaultAddress.address_detail
          };
        }
      }

      const receiptNumber = await this.generateReceiptNumber();

      return {
        order_number: receiptNumber,
        order_item: {
          reformer_nickname: item.owner.nickname || '',
          thumbnail: item.item_photo[0]?.content || '',
          title: item.title || '',
          selected_options: selectedOptions,
          quantity,
          price: productAmount
        },
        delivery_address: deliveryAddress,
        payment: {
          product_amount: productAmount,
          delivery_fee: deliveryFee,
          total_amount: totalAmount
        }
      };
    } catch (error) {
      if (
        error instanceof ItemNotFoundError ||
        error instanceof InsufficientStockError ||
        error instanceof OrderError
      ) {
        throw error;
      }
      if (error instanceof Error) {
        const errMsg = error.message;
        if (
          errMsg.includes('Invalid') ||
          errMsg.includes('UUID') ||
          errMsg.includes('Inconsistent column data')
        ) {
          throw new ItemNotFoundError(itemId);
        }
      }

      throw new OrderError(
        '주문서 조회 실패',
        error instanceof Error ? error.message : '알 수 없는 오류'
      );
    }
  }

  /**
   * 주문 생성 (PENDING 상태)
   * 결제 검증은 웹훅이나 verify 엔드포인트에서 수행
   */
  async createOrder(
    itemId: string,
    optionItemIds: string[],
    quantity: number,
    userId: string,
    deliveryAddressId?: string,
    newAddress?: {
      postal_code?: string;
      address?: string;
      address_detail?: string;
    },
    merchantUid?: string
  ): Promise<CreateOrderResponse> {
    try {
      if (!merchantUid) {
        throw new OrderError(
          '주문 번호가 필요합니다.',
          'merchant_uid(order_number)는 필수입니다.'
        );
      }

      const item = await this.repository.findItemById(itemId);

      if (!item) {
        throw new ItemNotFoundError(itemId);
      }

      const result = await runInTransaction(async () => {
        const optionItems =
          await this.repository.findOptionItemsByIds(optionItemIds);

        if (optionItems.length !== optionItemIds.length) {
          throw new ItemNotFoundError(
            '존재하지 않는 옵션이 포함되어 있습니다.'
          );
        }

        // 옵션 검증
        this.validateOptions(optionItems, itemId);

        const optionItemIdsWithQuantity = optionItems
          .filter((item) => item.quantity !== null)
          .map((item) => item.option_item_id);

        if (optionItemIdsWithQuantity.length > 0) {
          // 각 옵션 아이템마다 조합별 수량만큼 차감
          for (const optionItemId of optionItemIdsWithQuantity) {
            const updateResult =
              await this.repository.updateOptionItemQuantities(
                [optionItemId],
                quantity
              );

            if (updateResult !== 1) {
              const updatedItem = await this.repository.findUpdatedOptionItems([
                optionItemId
              ]);
              const optionItem = optionItems.find(
                (item) => item.option_item_id === optionItemId
              );

              if (!updatedItem || updatedItem.length === 0) {
                throw new InsufficientStockError(
                  optionItem?.name || '옵션',
                  '옵션 아이템을 찾을 수 없습니다.'
                );
              }

              const currentQuantity = updatedItem[0].quantity;
              if (currentQuantity === null) {
                throw new InsufficientStockError(
                  optionItem?.name || '옵션',
                  '재고 정보가 없습니다.'
                );
              }

              throw new InsufficientStockError(
                optionItem?.name || '옵션',
                `재고가 부족합니다. 현재 재고: ${currentQuantity}, 요청 수량: ${quantity}`
              );
            }
          }
        }

        const extraPriceSum = optionItems.reduce(
          (sum: number, optionItem: { extra_price: number | null }) =>
            sum + (optionItem.extra_price || 0),
          0
        );

        const finalDeliveryAddressId = await this.processDeliveryAddress(
          userId,
          item.owner_id,
          deliveryAddressId,
          newAddress
        );

        const basePrice = item.price ? Number(item.price) : 0;
        const productAmount = (basePrice + extraPriceSum) * quantity;
        const deliveryFee = item.delivery ? Number(item.delivery) : 0;
        const totalAmount = productAmount + deliveryFee;

        const receiptNumber = merchantUid;
        let receipt =
          await this.repository.findReceiptByReceiptNumber(receiptNumber);

        if (!receipt) {
          receipt = await this.repository.createReceipt({
            receipt_number: receiptNumber,
            total_amount: totalAmount,
            payment_status: 'pending',
            payment_method: null,
            payment_gateway: 'portone',
            transaction: null
          });
        } else {
          await this.repository.updateReceiptTotalAmount(
            receipt.receipt_id,
            totalAmount
          );
        }

        const initialOrderStatus =
          receipt.payment_status === 'paid'
            ? order_status_enum.PAID
            : order_status_enum.PENDING;
        const order = await this.repository.createOrder({
          receipt_id: receipt.receipt_id,
          user_id: userId,
          owner_id: item.owner_id,
          target_type: target_type_enum.ITEM,
          target_id: itemId,
          user_address: finalDeliveryAddressId,
          price: productAmount,
          delivery_fee: deliveryFee,
          quantity: quantity,
          status: initialOrderStatus
        });

        await this.repository.createOrderOptions(order.order_id, optionItemIds);

        await this.repository.deleteCartItems(userId, itemId);

        return {
          order_id: order.order_id,
          receipt_id: receipt.receipt_id,
          total_amount: totalAmount
        };
      });

      return {
        order_id: result.order_id,
        payment_required: false,
        payment_info: {
          merchant_uid: merchantUid,
          amount: result.total_amount
        }
      };
    } catch (error) {
      if (
        error instanceof OrderError ||
        error instanceof ItemNotFoundError ||
        error instanceof InsufficientStockError ||
        error instanceof PaymentError ||
        error instanceof PaymentVerificationError ||
        error instanceof PaymentAmountMismatchError
      ) {
        throw error;
      }
      let errorMessage = '알 수 없는 오류';
      if (error instanceof Error) {
        const errMsg = error.message;
        if (
          errMsg.includes('Invalid') ||
          errMsg.includes('UUID') ||
          errMsg.includes('Inconsistent column data')
        ) {
          errorMessage = '잘못된 입력 형식입니다';
        } else if (
          errMsg.includes('Record to update not found') ||
          errMsg.includes('Unique constraint')
        ) {
          errorMessage = '데이터를 찾을 수 없습니다';
        } else {
          errorMessage = errMsg.split('\n')[0];
        }
      }

      throw new OrderError('주문 생성 실패', errorMessage);
    }
  }

  /**
   * 주문 조회 (결제 완료 정보)
   * @param orderIdOrNumber UUID 또는 receipt_number
   * @param userId 사용자 ID
   */
  async getOrder(
    orderIdOrNumber: string,
    userId: string
  ): Promise<GetOrderResponseDto> {
    try {
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          orderIdOrNumber
        );
      const isReceiptNumber = /^\d{12}$/.test(orderIdOrNumber);

      if (!isUuid && !isReceiptNumber) {
        throw new OrderNotFoundError(orderIdOrNumber);
      }

      const receipt = await this.findReceiptByIdOrNumber(
        orderIdOrNumber,
        userId
      );

      if (!receipt || !receipt.order || receipt.order.length === 0) {
        throw new OrderNotFoundError(orderIdOrNumber);
      }

      const firstOrder = receipt.order[0];
      if (firstOrder.user_id !== userId) {
        throw new OrderNotFoundError(orderIdOrNumber);
      }

      // 모든 order의 배송지 정보는 첫 번째 order의 배송지 사용
      let deliveryAddress = {
        postal_code: null as string | null,
        address: null as string | null,
        address_detail: null as string | null
      };
      if (firstOrder.user_address) {
        const address = await this.repository.findDeliveryAddressByIdDetailed(
          firstOrder.user_address
        );
        if (address) {
          deliveryAddress = {
            postal_code: address.postal_code,
            address: address.address,
            address_detail: address.address_detail
          };
        }
      }

      const orderItems = receipt.order.flatMap(
        (order: {
          order_id: string;
          status: order_status_enum | null;
          owner: {
            nickname: string | null;
          };
          order_option: Array<{
            option_item: {
              option_group: {
                name: string | null;
                item: {
                  item_photo: Array<{ content: string | null }>;
                  title: string | null;
                };
              };
              name: string | null;
            };
          }>;
        }) => {
          return order.order_option.map(
            (orderOption: {
              option_item: {
                option_group: {
                  name: string | null;
                  item: {
                    item_photo: Array<{ content: string | null }>;
                    title: string | null;
                  };
                };
                name: string | null;
              };
            }) => {
              const item = orderOption.option_item.option_group.item;
              const selectedOptions = [
                `${orderOption.option_item.option_group.name || ''} ${orderOption.option_item.name || ''}`
              ];

              return {
                thumbnail: item.item_photo[0]?.content || '',
                title: item.title || '',
                selected_options: selectedOptions,
                reformer_nickname: order.owner.nickname || ''
              };
            }
          );
        }
      );

      const cardDetails = this.extractCardDetails(receipt.transaction || null);
      const paymentInfo = {
        amount: receipt.total_amount ? Number(receipt.total_amount) : 0,
        payment_method: receipt.payment_method || null,
        card_name: cardDetails.card_name,
        masked_card_number: cardDetails.masked_card_number,
        card_info: this.parseCardInfo(receipt.transaction || null),
        approved_at: receipt.created_at || null
      };

      const firstItem = orderItems.length > 0 ? orderItems[0] : null;
      const remainingItemsCount = Math.max(0, orderItems.length - 1);

      // 총 배송비는 각 order의 delivery_fee 중 최대값
      const maxDeliveryFee = Math.max(
        ...receipt.order.map((o: { delivery_fee: number | null }) =>
          o.delivery_fee ? Number(o.delivery_fee) : 0
        )
      );

      return {
        order_id: firstOrder.order_id,
        order_number: receipt.receipt_number || firstOrder.order_id,
        status: firstOrder.status || null,
        delivery_address: deliveryAddress,
        first_item: firstItem,
        remaining_items_count: remainingItemsCount,
        order_items: orderItems,
        payment: paymentInfo,
        total_amount: receipt.total_amount ? Number(receipt.total_amount) : 0,
        delivery_fee: maxDeliveryFee
      };
    } catch (error) {
      if (error instanceof OrderNotFoundError || error instanceof OrderError) {
        throw error;
      }

      if (error instanceof Error) {
        const errorMessage = error.message;
        if (
          errorMessage.includes('Invalid') ||
          errorMessage.includes('UUID') ||
          errorMessage.includes('Inconsistent column data')
        ) {
          throw new OrderNotFoundError(orderIdOrNumber);
        }
      }

      throw new OrderError(
        '주문 조회 실패',
        `주문 ID 또는 번호: ${orderIdOrNumber}`
      );
    }
  }

  /**
   * 포트원 API로 결제보 조회 (재시도 로직 포함)
   */
  private async tchPaymentInfoWithRetry(
    impUid: stri
  ): Promise<PornePaymentInfo> {
    let paymennfo: PortonePaymentInfo | null = null;
    let retryCount = 0;
    const maxRetries = 3;
    let lastError: Error | null = null;

    while (retryCount < maxRetries && !paymentInfo) {
      try {
        paymentInfo = await getPortonePayment(impUid);
        break;
      } catch (error: any) {
        lastError = error;
        retryCount++;

        const isRetryableError =
          error.message?.includes('network') ||
          error.message?.includes('timeout') ||
          error.message?.includes('ECONNRESET') ||
          error.message?.includes('ETIMEDOUT') ||
          error.response?.status >= 500;

        if (isRetryableError && retryCount < maxRetries) {
          const delayMs = 1000 * Math.pow(2, retryCount - 1);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        } else {
          throw new PaymentError(
            '결제 정보 조회 중 오류가 발생했습니다.',
            error.message || '포트원 API 호출 실패'
          );
        }
      }
    }
    ('');
    if (!paymentInfo && lastError) {
      throw new PaymentError(
        '결제 정보 조회 중 오류가 발생했습니다.',
        lastError.message || '포트원 API 호출 실패'
      );
    }

    if (!paymentInfo) {
      throw new PaymentVerificationError(
        '결제 정보를 조회할 수 없습니다.',
        '포트원 API 호출 실패'
      );
    }

    return paymentInfo;
  }

  /**
   * 결제 검증 및 주문 상태 업데이트 (공통 로직)
   * verifyPayment와 handleWebhook에서 공통으로 사용
   */
  private async verifyAndUpdatePayment(
    receipt: {
      receipt_id: string;
      receipt_number: string | null;
      total_amount: number | null;
      order: Array<{
        order_id: string;
        status: order_status_enum | null;
        quantity: number | null;
        order_option?: Array<{ option_item_id: string }>;
      }>;
    },
    impUid: string,
    merchantUid: string,
    throwOnError: boolean = true
  ): Promise<boolean> {
    try {
      if (receipt.order.length === 0) {
        const paymentInfo = await this.fetchPaymentInfoWithRetry(impUid);

        if (paymentInfo.status === 'paid') {
          const expectedAmount = receipt.total_amount
            ? Number(receipt.total_amount)
            : 0;
          if (
            paymentInfo.amount === expectedAmount &&
            paymentInfo.merchant_uid === merchantUid
          ) {
            const cardInfo =
              paymentInfo.card_name && paymentInfo.card_number
                ? JSON.stringify({
                    imp_uid: impUid,
                    card_name: paymentInfo.card_name,
                    card_number: paymentInfo.card_number,
                    card_code: paymentInfo.card_code || null,
                    card_quota: paymentInfo.card_quota || 0,
                    card_type: paymentInfo.card_type || null
                  })
                : impUid;

            await this.repository.updateReceipt(receipt.receipt_id, {
              payment_status: 'paid',
              payment_method: 'card',
              transaction: cardInfo
            });

            return true;
          }
        }

        if (throwOnError) {
          throw new OrderError(
            '주문이 아직 생성되지 않았습니다.',
            '주문 생성 후 결제 검증을 진행해주세요.'
          );
        }
        return false;
      }

      const allPaid = receipt.order.every(
        (o) => o.status === order_status_enum.PAID
      );
      if (allPaid) {
        return true;
      }

      const allPending = receipt.order.every(
        (o) => o.status === order_status_enum.PENDING
      );
      if (!allPending) {
        if (throwOnError) {
          throw new OrderError(
            '결제 검증할 수 없는 주문 상태입니다.',
            `일부 주문이 PENDING 상태가 아닙니다.`
          );
        }
        return false;
      }

      const paymentInfo = await this.fetchPaymentInfoWithRetry(impUid);

      if (paymentInfo.status !== 'paid') {
        await this.cancelReceipt(receipt, impUid);
        if (throwOnError) {
          throw new PaymentVerificationError(
            '결제가 완료되지 않았습니다.',
            `결제 상태: ${paymentInfo.status}`
          );
        }
        return false;
      }

      const expectedAmount = receipt.total_amount
        ? Number(receipt.total_amount)
        : 0;
      if (paymentInfo.amount !== expectedAmount) {
        await this.cancelReceipt(receipt, impUid);
        if (throwOnError) {
          throw new PaymentAmountMismatchError(
            expectedAmount,
            paymentInfo.amount
          );
        }
        return false;
      }

      if (paymentInfo.merchant_uid !== merchantUid) {
        await this.cancelReceipt(receipt, impUid);
        if (throwOnError) {
          throw new PaymentVerificationError(
            '주문 정보가 일치하지 않습니다.',
            `예상 merchant_uid: ${merchantUid}, 실제: ${paymentInfo.merchant_uid}`
          );
        }
        return false;
      }

      // 트랜잭션으로 상태 업데이트
      await runInTransaction(async () => {
        // receipt의 모든 order 상태를 배치로 업데이트
        const orderIds = receipt.order.map((o) => o.order_id);
        await this.repository.updateOrdersStatus(
          orderIds,
          order_status_enum.PAID
        );

        // 영수증 업데이트
        const cardInfo =
          paymentInfo.card_name && paymentInfo.card_number
            ? JSON.stringify({
                imp_uid: impUid,
                card_name: paymentInfo.card_name,
                card_number: paymentInfo.card_number,
                card_code: paymentInfo.card_code || null,
                card_quota: paymentInfo.card_quota || 0,
                card_type: paymentInfo.card_type || null
              })
            : impUid;

        await this.repository.updateReceipt(receipt.receipt_id, {
          payment_status: 'paid',
          payment_method: paymentInfo.pay_method || 'card',
          payment_gateway: paymentInfo.pg_provider || 'portone',
          transaction: cardInfo
        });
      });

      return true;
    } catch (error) {
      if (throwOnError) {
        throw error;
      }
      return false;
    }
  }

  /**
   * 결제 검증 및 주문 상태 업데이트 (프론트엔드용)
   * 포트원 API로 결제 정보를 검증하고 주문 상태를 PAID로 업데이트
   */
  async verifyPayment(orderId: string, impUid: string): Promise<void> {
    try {
      const order = await this.repository.findOrderByIdForVerification(orderId);
      if (!order) {
        throw new OrderNotFoundError(orderId);
      }

      const orderReceipt = (order as any).receipt;
      if (!orderReceipt) {
        throw new OrderNotFoundError(orderId);
      }

      const receiptData = await this.repository.findReceiptByIdWithOrders(
        orderReceipt.receipt_id
      );
      if (!receiptData) {
        throw new OrrNotFoundError(orderId);
      }

      const receipt = {
        receipt_id: ceiptData.receipt_id,
        receipt_numer: receiptData.receipt_number,
        total_amount: receiptData.total_amount
          ? Number(receiptData.total_amount)
          : null,
        order: receiptData.order.map(
          (o: {
            order_id: string;
            status: order_status_enum | null;
            quantity: number | null;
            order_option?: Array<{ option_item_id: string }>;
          }) => ({
            order_id: o.order_id,
            status: o.satus,
            quantity: oquantity,
            order_optio: o.order_option?.map(
              (oo: { opion_item_id: string }) => ({
                option_tem_id: oo.option_item_id
              })
            )
          })
        )
      };

      await this.verifyAndUpdatePayment(
        receipt,
        impUid,
        receipt.receipt_number || '',
        true
      );
    } catch (error) {
      if (
        error instanceof OrderError ||
        error instanceof OrderNotFoundError ||
        error instanceof PaymentError ||
        error instanceof PaymentVerificationError ||
        error instanceof PaymentAmountMismatchError
      ) {
        throw error;
      }
      throw new OrderError(
        '결제 검증 실패',
        error instanceof Error ? error.message : '알 수 없는 오류'
      );
    }
  }

  /**
   * receipt의 모든 order 취소 및 재고 복구 (결제 실패 시)
   * PENDING 상태에서 주문 생성 시 차감된 재고를 복구
   */
  private async cancelReceipt(
    receipt: {
      receipt_id: string;
      order: Array<{
        order_id: string;
        quantity?: number | null;
        order_option?: Array<{ option_item_id: string }>;
      }>;
    },
    impUid: string
  ): Promise<void> {
    try {
      await runInTransaction(async () => {
        for (const order of receipt.order) {
          await this.repository.updateOrderStatus(
            order.order_id,
            order_status_enum.CANCELLED
          );

          if (
            order.order_option &&
            order.order_option.length > 0 &&
            order.quantity
          ) {
            const restoreQuantity = order.quantity;
            for (const opt of order.order_option) {
              await this.repository.restoreOptionItemQuantities(
                [opt.option_item_id],
                restoreQuantity
              );
            }
          }
        }

        await this.repository.updateReceipt(receipt.receipt_id, {
          payment_status: 'cancelled'
        });
      });
    } catch (error) {
      console.error(
        `주문 취소 실패 (receiptId: ${receipt.receipt_id}, impUid: ${impUid}):`,
        error
      );
    }
  }

  /**
   * 웹훅 처리: 결제 검증 및 주문 상태 업데이트
   * 프론트엔드 요청과 동일한 검증 로직 사용
   */
  async handleWebhook(impUid: string, merchantUid: string): Promise<void> {
    try {
      let receiptData =
        await this.repository.findReceiptByReceiptNumberForVerification(
          merchantUid
        );

      if (!receiptData) {
        try {
          const paymentInfo = await this.fetchPaymentInfoWithRetry(impUid);

          if (
            paymentInfo.status === 'paid' &&
            paymentInfo.merchant_uid === merchantUid
          ) {
            try {
              await this.repository.createReceipt({
                receipt_number: merchantUid,
                total_amount: paymentInfo.amount,
                payment_status: 'paid',
                payment_method: 'card',
                payment_gateway: 'portone',
                transaction:
                  paymentInfo.card_name && paymentInfo.card_number
                    ? JSON.stringify({
                        imp_uid: impUid,
                        card_name: paymentInfo.card_name,
                        card_number: paymentInfo.card_number,
                        card_code: paymentInfo.card_code || null,
                        card_quota: paymentInfo.card_quota || 0,
                        card_type: paymentInfo.card_type || null
                      })
                    : impUid
              });
            } catch (createError: any) {
              // unique constraint 위반 시 (주문 생성이 먼저 receipt를 생성한 경우)
              // receipt를 다시 조회하여 업데이트
              if (
                createError?.code === 'P2002' ||
                createError?.message?.includes('Unique constraint')
              ) {
                receiptData =
                  await this.repository.findReceiptByReceiptNumberForVerification(
                    merchantUid
                  );
                if (receiptData) {
                  // receipt가 이미 존재하므로 업데이트만 수행
                  const cardInfo =
                    paymentInfo.card_name && paymentInfo.card_number
                      ? JSON.stringify({
                          imp_uid: impUid,
                          card_name: paymentInfo.card_name,
                          card_number: paymentInfo.card_number,
                          card_code: paymentInfo.card_code || null,
                          card_quota: paymentInfo.card_quota || 0,
                          card_type: paymentInfo.card_type || null
                        })
                      : impUid;

                  await this.repository.updateReceipt(receiptData.receipt_id, {
                    payment_status: 'paid',
                    payment_method: 'card',
                    transaction: cardInfo
                  });
                } else {
                  console.error(
                    `웹훅: receipt 생성 실패 후 조회도 실패 (merchantUid: ${merchantUid}, impUid: ${impUid})`
                  );
                  return;
                }
              } else {
                throw createError;
              }
            }

            if (!receiptData) {
              receiptData =
                await this.repository.findReceiptByReceiptNumberForVerification(
                  merchantUid
                );
            }

            if (!receiptData) {
              console.error(
                `웹훅: receipt 생성/업데이트 후 조회 실패 (merchantUid: ${merchantUid}, impUid: ${impUid})`
              );
              return;
            }
          } else {
            // 결제가 완료되지 않았거나 merchant_uid가 일치하지 않음
            console.error(
              `웹훅: 결제 정보 불일치 (merchantUid: ${merchantUid}, impUid: ${impUid}, status: ${paymentInfo.status})`
            );
            return;
          }
        } catch (error) {
          // 포트원 API 조회 실패 시 로그만 남기고 성공 응답 (재전송 방지)
          console.error(
            `웹훅: receipt를 찾을 수 없고 결제 정보 조회 실패 (merchantUid: ${merchantUid}, impUid: ${impUid}):`,
            error
          );
          return;
        }
      }

      // Decimal을 number로 변환하고 order 배열 변환
      const receipt = {
        receipt_id: receiptData.receipt_id,
        receipt_number: receiptData.receipt_number,
        total_amount: receiptData.total_amount
          ? Number(receiptData.total_amount)
          : null,
        order: receiptData.order.map(
          (o: {
            order_id: string;
            status: order_status_enum | null;
            quantity: number | null;
            order_option?: Array<{ option_item_id: string }>;
          }) => ({
            order_id: o.order_id,
            status: o.status,
            quantity: o.quantity,
            order_option: o.order_option?.map(
              (oo: { option_item_id: string }) => ({
                option_item_id: oo.option_item_id
              })
            )
          })
        )
      };

      await this.verifyAndUpdatePayment(receipt, impUid, merchantUid, false);
    } catch (error) {
      console.error(
        `웹훅 처리 실패 (impUid: ${impUid}, merchantUid: ${merchantUid}):`,
        error
      );
    }
  }

  /**
   * 주문 ID로 영수증 조회
   */
  async getReceiptByOrderId(orderId: string) {
    try {
      return await this.repository.findReceiptByOrderId(orderId);
    } catch (error) {
      let errorMessage = '알 수 없는 오류';
      if (error instanceof Error) {
        const errMsg = error.message;
        if (
          errMsg.includes('Invalid') ||
          errMsg.includes('UUID') ||
          errMsg.includes('Inconsistent column data')
        ) {
          errorMessage = '잘못된 주문 ID 형식입니다';
        } else {
          errorMessage = errMsg.split('\n')[0];
        }
      }

      throw new OrderError('영수증 조회 실패', errorMessage);
    }
  }

  /**
   * 장바구니에서 주문서 정보 조회
   */
  async getOrderSheetFromCart(
    cartIds: string[],
    userId: string,
    deliveryAddressId?: string,
    newAddress?: {
      postal_code?: string;
      address?: string;
      address_detail?: string;
    }
  ): Promise<OrderSheetResponse> {
    try {
      if (!cartIds || cartIds.length === 0) {
        throw new OrderError(
          '장바구니가 비어있습니다.',
          '주문할 상품을 선택해주세요.'
        );
      }

      const carts = await this.repository.findCartsByIds(cartIds, userId);

      if (carts.length === 0) {
        throw new OrderError(
          '장바구니를 찾을 수 없습니다.',
          '선택한 장바구니 항목이 존재하지 않습니다.'
        );
      }

      if (carts.length !== cartIds.length) {
        throw new OrderError(
          '일부 장바구니 항목을 찾을 수 없습니다.',
          '선택한 장바구니 항목 중 일부가 존재하지 않습니다.'
        );
      }

      // 각 cart의 item 정보 조회
      const itemIds = Array.from(
        new Set(
          carts.map((c) => c.item_id).filter((id): id is string => id !== null)
        )
      );
      const items = await this.repository.findItemsByIds(itemIds);

      const itemsMap = new Map(items.map((item) => [item.item_id, item]));

      const orderItems: OrderItemInfo[] = [];
      let totalProductAmount = 0;
      let maxDeliveryFee = 0;

      for (const cart of carts) {
        if (!cart.item_id) continue;

        const item = itemsMap.get(cart.item_id);
        if (!item) {
          throw new ItemNotFoundError(cart.item_id);
        }

        const optionItems = cart.cart_option
          .map((co) => co.option_item)
          .filter((oi): oi is NonNullable<typeof oi> => oi !== null);

        const allOptionItems = await this.repository.findOptionItemsByIds(
          optionItems.map((oi) => oi.option_item_id)
        );

        if (allOptionItems.length !== optionItems.length) {
          throw new ItemNotFoundError(
            '존재하지 않는 옵션이 포함되어 있습니다.'
          );
        }

        this.validateOptions(allOptionItems, cart.item_id);
        this.validateStock(allOptionItems, cart.quantity);

        const extraPriceSum = optionItems.reduce(
          (sum, oi) => sum + (oi.extra_price || 0),
          0
        );

        const basePrice = item.price ? Number(item.price) : 0;
        const productAmount = (basePrice + extraPriceSum) * cart.quantity;
        totalProductAmount += productAmount;

        const deliveryFee = item.delivery ? Number(item.delivery) : 0;
        maxDeliveryFee = Math.max(maxDeliveryFee, deliveryFee);

        const selectedOptions = optionItems.map((oi) => {
          const extraPrice = oi.extra_price || 0;
          const priceText =
            extraPrice > 0 ? ` (+${extraPrice.toLocaleString()}원)` : '';
          const groupName = oi.option_group?.name || '';
          return `${groupName} ${oi.name || ''}${priceText}`;
        });

        orderItems.push({
          reformer_nickname: item.owner?.nickname || '',
          thumbnail:
            item.item_photo.find((p) => p.photo_order === 1)?.content || '',
          title: item.title || '',
          selected_options: selectedOptions,
          quantity: cart.quantity,
          price: productAmount
        });
      }

      // 배송지 정보 (주문서용, 생성하지 않음)
      const deliveryAddress = await this.getDeliveryAddressInfo(
        userId,
        deliveryAddressId,
        newAddress
      );

      const receiptNumber = await this.generateReceiptNumber();
      const totalAmount = totalProductAmount + maxDeliveryFee;

      let receipt =
        await this.repository.findReceiptByReceiptNumber(receiptNumber);
      if (!receipt) {
        receipt = await this.repository.createReceipt({
          receipt_number: receiptNumber,
          total_amount: totalAmount,
          payment_status: 'pending',
          payment_method: null,
          payment_gateway: 'portone',
          transaction: null
        });
      }

      return {
        order_number: receiptNumber,
        order_item: orderItems[0], // 첫 번째 상품 정보
        delivery_address: deliveryAddress,
        payment: {
          product_amount: totalProductAmount,
          delivery_fee: maxDeliveryFee,
          total_amount: totalAmount
        }
      };
    } catch (error) {
      if (
        error instanceof ItemNotFoundError ||
        error instanceof InsufficientStockError ||
        error instanceof OrderError
      ) {
        throw error;
      }
      if (error instanceof Error) {
        const errMsg = error.message;
        if (
          errMsg.includes('Invalid') ||
          errMsg.includes('UUID') ||
          errMsg.includes('Inconsistent column data')
        ) {
          throw new OrderError('주문서 조회 실패', '잘못된 입력 형식입니다');
        }
      }

      throw new OrderError(
        '주문서 조회 실패',
        error instanceof Error ? error.message : '알 수 없는 오류'
      );
    }
  }

  /**
   * 장바구니에서 주문 생성
   */
  async createOrdersFromCart(
    cartIds: string[],
    userId: string,
    deliveryAddressId?: string,
    newAddress?: {
      postal_code?: string;
      address?: string;
      address_detail?: string;
    },
    merchantUid?: string
  ): Promise<CreateOrderResponse> {
    try {
      if (!merchantUid) {
        throw new OrderError(
          '주문 번호가 필요합니다.',
          'merchant_uid(receipt_number)는 필수입니다.'
        );
      }

      if (!cartIds || cartIds.length === 0) {
        throw new OrderError(
          '장바구니가 비어있습니다.',
          '주문할 상품을 선택해주세요.'
        );
      }

      const result = await runInTransaction(async () => {
        const carts = await this.repository.findCartsByIds(cartIds, userId);

        if (carts.length === 0) {
          throw new OrderError(
            '장바구니를 찾을 수 없습니다.',
            '선택한 장바구니 항목이 존재하지 않습니다.'
          );
        }

        if (carts.length !== cartIds.length) {
          throw new OrderError(
            '일부 장바구니 항목을 찾을 수 없습니다.',
            '선택한 장바구니 항목 중 일부가 존재하지 않습니다.'
          );
        }

        // 각 cart의 item 정보 조회
        const itemIds = Array.from(
          new Set(
            carts
              .map((c) => c.item_id)
              .filter((id): id is string => id !== null)
          )
        );
        const items = await this.repository.findItemsByIds(itemIds);
        const itemsMap = new Map(items.map((item) => [item.item_id, item]));

        // 총액 계산 (먼저 계산하여 receipt 생성)
        let totalProductAmount = 0;
        let maxDeliveryFee = 0;
        const orderDataList: Array<{
          cart: (typeof carts)[0];
          item: (typeof items)[0];
          optionItemIds: string[];
          productAmount: number;
          deliveryFee: number;
          deliveryAddressId?: string;
        }> = [];

        for (const cart of carts) {
          if (!cart.item_id) continue;

          const item = itemsMap.get(cart.item_id);
          if (!item) {
            throw new ItemNotFoundError(cart.item_id);
          }

          const optionItems = cart.cart_option
            .map((co) => co.option_item)
            .filter((oi): oi is NonNullable<typeof oi> => oi !== null);

          const optionItemIds = optionItems.map((oi) => oi.option_item_id);
          const allOptionItems =
            await this.repository.findOptionItemsByIds(optionItemIds);

          if (allOptionItems.length !== optionItemIds.length) {
            throw new ItemNotFoundError(
              '존재하지 않는 옵션이 포함되어 있습니다.'
            );
          }

          this.validateOptions(allOptionItems, cart.item_id);

          const extraPriceSum = allOptionItems.reduce(
            (sum, oi) => sum + (oi.extra_price || 0),
            0
          );
          const basePrice = item.price ? Number(item.price) : 0;
          const productAmount = (basePrice + extraPriceSum) * cart.quantity;
          totalProductAmount += productAmount;

          const deliveryFee = item.delivery ? Number(item.delivery) : 0;
          maxDeliveryFee = Math.max(maxDeliveryFee, deliveryFee);

          orderDataList.push({
            cart,
            item,
            optionItemIds,
            productAmount,
            deliveryFee
          });
        }

        const ownerIds = Array.from(
          new Set(orderDataList.map((od) => od.item.owner_id))
        );
        const deliveryAddressMap = new Map<string, string | undefined>();

        for (const ownerId of ownerIds) {
          const deliveryAddressIdForOwner = await this.processDeliveryAddress(
            userId,
            ownerId,
            deliveryAddressId,
            newAddress
          );
          deliveryAddressMap.set(ownerId, deliveryAddressIdForOwner);
        }

        for (const orderData of orderDataList) {
          orderData.deliveryAddressId = deliveryAddressMap.get(
            orderData.item.owner_id
          );
        }

        const totalAmount = totalProductAmount + maxDeliveryFee;
        let receipt =
          await this.repository.findReceiptByReceiptNumber(merchantUid);

        if (!receipt) {
          receipt = await this.repository.createReceipt({
            receipt_number: merchantUid,
            total_amount: totalAmount,
            payment_status: 'pending',
            payment_method: null,
            payment_gateway: 'portone',
            transaction: null
          });
        } else {
          await this.repository.updateReceiptTotalAmount(
            receipt.receipt_id,
            totalAmount
          );
        }

        const initialOrderStatus =
          receipt.payment_status === 'paid'
            ? order_status_enum.PAID
            : order_status_enum.PENDING;

        const createdOrders: Array<{ order_id: string; item_id: string }> = [];

        for (const orderData of orderDataList) {
          const {
            cart,
            item,
            optionItemIds,
            productAmount,
            deliveryFee,
            deliveryAddressId
          } = orderData;

          const allOptionItems =
            await this.repository.findOptionItemsByIds(optionItemIds);
          const optionItemIdsWithQuantity = allOptionItems
            .filter((oi) => oi.quantity !== null)
            .map((oi) => oi.option_item_id);

          if (optionItemIdsWithQuantity.length > 0) {
            for (const optionItemId of optionItemIdsWithQuantity) {
              const updateResult =
                await this.repository.updateOptionItemQuantities(
                  [optionItemId],
                  cart.quantity
                );

              if (updateResult !== 1) {
                const updatedItem =
                  await this.repository.findUpdatedOptionItems([optionItemId]);
                const optionItem = allOptionItems.find(
                  (item) => item.option_item_id === optionItemId
                );

                if (!updatedItem || updatedItem.length === 0) {
                  throw new InsufficientStockError(
                    optionItem?.name || '옵션',
                    '옵션 아이템을 찾을 수 없습니다.'
                  );
                }

                const currentQuantity = updatedItem[0].quantity;
                if (currentQuantity === null) {
                  throw new InsufficientStockError(
                    optionItem?.name || '옵션',
                    '재고 정보가 없습니다.'
                  );
                }

                throw new InsufficientStockError(
                  optionItem?.name || '옵션',
                  `재고가 부족합니다. 현재 재고: ${currentQuantity}, 요청 수량: ${cart.quantity}`
                );
              }
            }
          }

          const order = await this.repository.createOrder({
            receipt_id: receipt.receipt_id,
            user_id: userId,
            owner_id: item.owner_id,
            target_type: target_type_enum.ITEM,
            target_id: cart.item_id!,
            user_address: deliveryAddressId,
            price: productAmount,
            delivery_fee: deliveryFee,
            quantity: cart.quantity,
            status: initialOrderStatus
          });

          // order_option 생성 (order.quantity에 수량이 저장되므로 order_option에는 quantity 불필요)
          await this.repository.createOrderOptions(
            order.order_id,
            optionItemIds
          );

          createdOrders.push({
            order_id: order.order_id,
            item_id: cart.item_id!
          });
        }

        const cartIdsToDelete = carts.map((c) => c.cart_id);
        await this.repository.deleteCartsByIds(cartIdsToDelete);

        return {
          order_id: createdOrders[0]?.order_id || '',
          receipt_id: receipt.receipt_id,
          total_amount: totalAmount
        };
      });

      return {
        order_id: result.order_id,
        payment_required: false,
        payment_info: {
          merchant_uid: merchantUid,
          amount: result.total_amount
        }
      };
    } catch (error) {
      if (
        error instanceof OrderError ||
        error instanceof ItemNotFoundError ||
        error instanceof InsufficientStockError ||
        error instanceof PaymentError ||
        error instanceof PaymentVerificationError ||
        error instanceof PaymentAmountMismatchError
      ) {
        throw error;
      }
      let errorMessage = '알 수 없는 오류';
      if (error instanceof Error) {
        const errMsg = error.message;
        if (
          errMsg.includes('Invalid') ||
          errMsg.includes('UUID') ||
          errMsg.includes('Inconsistent column data')
        ) {
          errorMessage = '잘못된 입력 형식입니다';
        } else if (
          errMsg.includes('Record to update not found') ||
          errMsg.includes('Unique constraint')
        ) {
          errorMessage = '데이터를 찾을 수 없습니다';
        } else {
          errorMessage = errMsg.split('\n')[0];
        }
      }

      throw new OrderError('주문 생성 실패', errorMessage);
    }
  }
}
