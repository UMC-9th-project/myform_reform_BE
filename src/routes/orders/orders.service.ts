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
  OrderResponse
} from './orders.model.js';
import type { GetOrderResponseDto } from './orders.dto.js';
import { OrdersRepository } from './orders.repository.js';

export class OrdersService {
  constructor(private repository: OrdersRepository = new OrdersRepository()) {}
  /**
   * 주문번호 생성 (YYYYMMDD-XXXXX 형식)
   * 동시성 문제 방지를 위해 재시도 로직 포함
   * @param createdAt 주문 생성 시각 (해당 날짜 기준으로 순번 계산)
   * @returns 주문번호 문자열 (예: "20260116-00001")
   */
  private async generateOrderNumber(createdAt: Date): Promise<string> {
    try {
      const dateStr = createdAt.toISOString().slice(0, 10).replace(/-/g, '');
      
      const dayStart = new Date(createdAt);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(createdAt);
      dayEnd.setHours(23, 59, 59, 999);
      
      const maxRetries = 5;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const orderCount = await this.repository.countOrdersByDateRange(dayStart, dayEnd);
        const sequence = String(orderCount + 1).padStart(5, '0');
        const orderNumber = `${dateStr}-${sequence}`;
        
        if (attempt > 0) {
          const existing = await this.repository.findOrderByOrderNumber(orderNumber);
          
          if (!existing) {
            return orderNumber;
          }
          
          await new Promise((resolve) => setTimeout(resolve, 10 * (attempt + 1)));
          continue;
        }
        
        return orderNumber;
      }
      
      const timestamp = Date.now().toString().slice(-4);
      return `${dateStr}-${timestamp}`;
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
   * UUID 또는 주문번호로 주문 조회
   * @param orderIdOrNumber UUID 또는 주문번호
   * @param userId 사용자 ID
   * @returns 주문 정보 또는 null
   */
  private async findOrderByIdOrNumber(
    orderIdOrNumber: string,
    userId: string
  ) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        orderIdOrNumber
      );

      if (isUuid) {
        return await this.repository.findOrderById(orderIdOrNumber, userId);
      } else {
        if (!/^\d{8}-\d{5}$/.test(orderIdOrNumber)) {
          throw new OrderError(
            '주문 조회 실패',
            `잘못된 주문 ID 또는 주문번호 형식입니다: ${orderIdOrNumber}`
          );
        }
        return await this.repository.findOrderByNumber(orderIdOrNumber, userId);
      }
    } catch (error) {
      if (error instanceof OrderError) {
        throw error;
      }
      
      if (error instanceof Error) {
        const errorMessage = error.message;
        if (errorMessage.includes('Invalid') || errorMessage.includes('UUID') || errorMessage.includes('Inconsistent column data')) {
          throw new OrderError(
            '주문 조회 실패',
            `잘못된 주문 ID 또는 주문번호 형식입니다: ${orderIdOrNumber}`
          );
        }
        if (errorMessage.includes('Record to update not found') || errorMessage.includes('Unique constraint')) {
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
      const item = await this.repository.findItemWithOptionGroups(itemId, optionItemIds);

      if (!item) {
        throw new ItemNotFoundError(itemId);
      }

      const optionItems = await this.repository.findOptionItemsByIds(optionItemIds);

      if (optionItems.length !== optionItemIds.length) {
        throw new ItemNotFoundError('존재하지 않는 옵션이 포함되어 있습니다.');
      }

      const invalidOptions = optionItems.filter(
        (opt: { option_group: { item_id: string } }) => opt.option_group.item_id !== itemId
      );
      if (invalidOptions.length > 0) {
        throw new ItemNotFoundError('요청한 옵션이 해당 상품의 옵션이 아닙니다.');
      }

    for (const optionItem of optionItems) {
      if (optionItem.quantity !== null && optionItem.quantity < quantity) {
        throw new InsufficientStockError(optionItem.name || '옵션');
      }
    }

    const extraPriceSum = optionItems.reduce(
      (sum: number, item: { extra_price: number | null }) => sum + (item.extra_price || 0),
      0
    );

    const selectedOptions = optionItems.map((item: { extra_price: number | null; option_group: { name: string | null }; name: string | null }) => {
      const extraPrice = item.extra_price || 0;
      const priceText = extraPrice > 0 ? ` (+${extraPrice.toLocaleString()}원)` : '';
      return `${item.option_group.name || ''} ${item.name || ''}${priceText}`;
    });

    const basePrice = item.price ? Number(item.price) : 0;
    const productAmount = (basePrice + extraPriceSum) * quantity;
    const deliveryFee = item.delivery ? Number(item.delivery) : 0;
    const totalAmount = productAmount + deliveryFee;

      let deliveryAddress = null;
      if (deliveryAddressId) {
        const address = await this.repository.findDeliveryAddressById(deliveryAddressId, userId);
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
        const defaultAddress = await this.repository.findDefaultDeliveryAddress(userId);
        if (defaultAddress) {
          deliveryAddress = {
            delivery_address_id: defaultAddress.delivery_address_id,
            postal_code: defaultAddress.postal_code,
            address: defaultAddress.address,
            address_detail: defaultAddress.address_detail
          };
        }
      }

      const orderNumber = await this.generateOrderNumber(new Date());

      return {
        order_number: orderNumber,
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
        if (errMsg.includes('Invalid') || errMsg.includes('UUID') || errMsg.includes('Inconsistent column data')) {
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
   * 주문 생성
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
    merchantUid?: string,
    impUid?: string
  ): Promise<CreateOrderResponse> {
    try {
      if (!impUid) {
        throw new OrderError(
          '결제 정보가 필요합니다.',
          'imp_uid는 필수입니다.'
        );
      }

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
        const optionItems = await this.repository.findOptionItemsByIds(optionItemIds);

      if (optionItems.length !== optionItemIds.length) {
        throw new ItemNotFoundError('존재하지 않는 옵션이 포함되어 있습니다.');
      }

      const invalidOptions = optionItems.filter(
        (opt: { option_group: { item_id: string } }) => opt.option_group.item_id !== itemId
      );
      if (invalidOptions.length > 0) {
        throw new ItemNotFoundError(
          '요청한 옵션이 해당 상품의 옵션이 아닙니다.'
        );
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

      const optionItemIdsWithQuantity = optionItems
        .filter((item) => item.quantity !== null)
        .map((item) => item.option_item_id);

        if (optionItemIdsWithQuantity.length > 0) {
          const updateResult = await this.repository.updateOptionItemQuantities(
            optionItemIdsWithQuantity,
            quantity
          );

          if (updateResult !== optionItemIdsWithQuantity.length) {
            const updatedItems = await this.repository.findUpdatedOptionItems(optionItemIdsWithQuantity);

          for (const optionItem of optionItems) {
            if (optionItem.quantity !== null) {
              const updatedItem = updatedItems.find(
                (item) => item.option_item_id === optionItem.option_item_id
              );
              
              if (!updatedItem) {
                throw new InsufficientStockError(
                  optionItem.name || '옵션',
                  `옵션 아이템을 찾을 수 없습니다.`
                );
              }
              
              const expectedQuantityAfterUpdate = optionItem.quantity - quantity;
              const actualQuantity = updatedItem.quantity;
              
              if (actualQuantity === null) {
                throw new InsufficientStockError(
                  optionItem.name || '옵션',
                  `재고 정보가 없습니다.`
                );
              }
              
              if (actualQuantity !== null && actualQuantity > expectedQuantityAfterUpdate) {
                throw new InsufficientStockError(
                  optionItem.name || '옵션',
                  `현재 재고: ${actualQuantity}, 요청 수량: ${quantity}`
                );
              }
            }
          }

          throw new InsufficientStockError(
            '일부 옵션의 재고가 부족합니다.',
            `업데이트된 행 수: ${updateResult}, 예상 행 수: ${optionItemIdsWithQuantity.length}`
          );
        }
      }

      const extraPriceSum = optionItems.reduce(
        (sum: number, optionItem: { extra_price: number | null }) =>
          sum + (optionItem.extra_price || 0),
        0
      );

        let finalDeliveryAddressId: string | undefined = deliveryAddressId;
        if (!finalDeliveryAddressId && newAddress) {
          if (!newAddress.postal_code || !newAddress.address) {
            throw new OrderError(
              '배송지 정보가 올바르지 않습니다.',
              '우편번호와 주소는 필수 입력 항목입니다.'
            );
          }

          const newDeliveryAddress = await this.repository.createDeliveryAddress({
            user_id: userId,
            owner_id: item.owner_id,
            postal_code: newAddress.postal_code,
            address: newAddress.address,
            address_detail: newAddress.address_detail || null,
            is_default: false
          });
          finalDeliveryAddressId = newDeliveryAddress.delivery_address_id;
        } else if (finalDeliveryAddressId) {
          const address = await this.repository.findDeliveryAddressById(finalDeliveryAddressId, userId);
          if (!address) {
            throw new OrderError(
              '배송지 정보가 올바르지 않습니다.',
              '접근할 수 없는 배송지입니다.'
            );
          }
        }

      const basePrice = item.price ? Number(item.price) : 0;
      const productAmount = (basePrice + extraPriceSum) * quantity;
      const deliveryFee = item.delivery ? Number(item.delivery) : 0;
      const totalAmount = productAmount + deliveryFee;

        const orderNumber = merchantUid;
        const existingOrder = await this.repository.findOrderByOrderNumber(orderNumber);
        
        if (existingOrder) {
          throw new OrderError(
            '이미 사용된 주문 번호입니다.',
            `order_number: ${orderNumber}`
          );
        }

        const order = await this.repository.createOrder({
          user_id: userId,
          owner_id: item.owner_id,
          target_type: target_type_enum.ITEM,
          target_id: itemId,
          user_address: finalDeliveryAddressId,
          price: productAmount,
          delivery_fee: deliveryFee,
          amount: totalAmount,
          status: order_status_enum.PAID,
          order_number: orderNumber
        });

        await this.repository.createOrderOptions(order.order_id, optionItemIds);

        const receipt = await this.repository.createReceipt({
          order_id: order.order_id,
          payment_status: 'paid',
          payment_method: 'card',
          payment_gateway: 'portone',
          transaction: null
        });

      return {
        order_id: order.order_id,
        receipt_id: receipt.reciept_id,
        total_amount: totalAmount
      };
    });

    try {
        let paymentInfo: PortonePaymentInfo | null = null;
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

        if (paymentInfo.status !== 'paid') {
          throw new PaymentVerificationError(
            '결제가 완료되지 않았습니다.',
            `결제 상태: ${paymentInfo.status}`
          );
        }

        if (paymentInfo.amount !== result.total_amount) {
          throw new PaymentAmountMismatchError(
            result.total_amount,
            paymentInfo.amount
          );
        }

        const expectedMerchantUid = merchantUid || result.order_id;
        if (paymentInfo.merchant_uid !== expectedMerchantUid) {
          throw new PaymentVerificationError(
            '주문 정보가 일치하지 않습니다.',
            `예상 merchant_uid: ${expectedMerchantUid}, 실제: ${paymentInfo.merchant_uid}`
          );
        }

        const cardInfo = paymentInfo.card_name && paymentInfo.card_number
          ? JSON.stringify({
              imp_uid: impUid,
              card_name: paymentInfo.card_name,
              card_number: paymentInfo.card_number,
              card_code: paymentInfo.card_code || null,
              card_quota: paymentInfo.card_quota || 0,
              card_type: paymentInfo.card_type || null
            })
          : impUid;

        await this.repository.updateReceipt(result.receipt_id, {
          payment_status: 'paid',
          payment_method: paymentInfo.pay_method || 'card',
          payment_gateway: paymentInfo.pg_provider || 'portone',
          transaction: cardInfo
        });

        await this.repository.deleteCartItems(userId, itemId);
      } catch (error: any) {
        try {
          await runInTransaction(async () => {
            await this.repository.updateOrderStatus(result.order_id, order_status_enum.CANCELLED);

            await this.repository.updateReceipt(result.receipt_id, { payment_status: 'cancelled' });

            if (optionItemIds.length > 0) {
              let retryCount = 0;
              const maxRetries = 3;
              let restoreSuccess = false;

              while (retryCount < maxRetries && !restoreSuccess) {
                try {
                  const updateResult = await this.repository.restoreOptionItemQuantities(
                    optionItemIds,
                    quantity
                  );
                  
                  if (updateResult > 0) {
                    restoreSuccess = true;
                  } else {
                    retryCount++;
                    if (retryCount < maxRetries) {
                      await new Promise((resolve) =>
                        setTimeout(resolve, 100 * Math.pow(2, retryCount - 1))
                      );
                    }
                  }
                } catch (error) {
                  retryCount++;
                  if (retryCount < maxRetries) {
                    await new Promise((resolve) =>
                      setTimeout(resolve, 100 * Math.pow(2, retryCount - 1))
                    );
                  } else {
                    console.error(
                      `재고 복구 실패 (optionItemIds: ${optionItemIds.join(', ')}):`,
                      error
                    );
                  }
                }
              }
            }
          });
        } catch (rollbackError: any) {
          console.error('주문 롤백 실패:', rollbackError);
        }
        
        throw error;
      }

      return {
        order_id: result.order_id,
        payment_required: false,
        payment_info: {
          imp_uid: impUid,
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
        if (errMsg.includes('Invalid') || errMsg.includes('UUID') || errMsg.includes('Inconsistent column data')) {
          errorMessage = '잘못된 입력 형식입니다';
        } else if (errMsg.includes('Record to update not found') || errMsg.includes('Unique constraint')) {
          errorMessage = '데이터를 찾을 수 없습니다';
        } else {
          errorMessage = errMsg.split('\n')[0];
        }
      }
      
      throw new OrderError(
        '주문 생성 실패',
        errorMessage
      );
    }
  }

  /**
   * 주문 조회 (결제 완료 정보)
   * @param orderIdOrNumber UUID 또는 주문번호
   * @param userId 사용자 ID
   */
  async getOrder(orderIdOrNumber: string, userId: string): Promise<GetOrderResponseDto> {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderIdOrNumber);
      const isOrderNumber = /^\d{8}-\d{5}$/.test(orderIdOrNumber);
      
      if (!isUuid && !isOrderNumber) {
        throw new OrderNotFoundError(orderIdOrNumber);
      }

      const order = await this.findOrderByIdOrNumber(orderIdOrNumber, userId);

      if (!order) {
        throw new OrderNotFoundError(orderIdOrNumber);
      }

      if (order.user_id !== userId) {
        throw new OrderNotFoundError(orderIdOrNumber);
      }

      let deliveryAddress = {
        postal_code: null as string | null,
        address: null as string | null,
        address_detail: null as string | null
      };
      if (order.user_address) {
        const address = await this.repository.findDeliveryAddressByIdDetailed(order.user_address);
        if (address) {
          deliveryAddress = {
            postal_code: address.postal_code,
            address: address.address,
            address_detail: address.address_detail
          };
        }
      }

    const orderItems = order.order_option.map((orderOption: {
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
    });

    const receipt = order.reciept[0];
    const cardDetails = this.extractCardDetails(receipt?.transaction || null);
    const paymentInfo = {
      amount: order.amount ? Number(order.amount) : 0,
      payment_method: receipt?.payment_method || null,
      card_name: cardDetails.card_name,
      masked_card_number: cardDetails.masked_card_number,
      card_info: this.parseCardInfo(receipt?.transaction || null),
      approved_at: receipt?.created_at || null
    };

    const firstItem = orderItems.length > 0 ? orderItems[0] : null;
    const remainingItemsCount = Math.max(0, orderItems.length - 1);

      return {
        order_id: order.order_id,
        order_number: order.order_number || order.order_id,
        status: order.status || null,
        delivery_address: deliveryAddress,
        first_item: firstItem,
        remaining_items_count: remainingItemsCount,
        order_items: orderItems,
        payment: paymentInfo,
        total_amount: order.amount ? Number(order.amount) : 0,
        delivery_fee: order.delivery_fee ? Number(order.delivery_fee) : 0
      };
    } catch (error) {
      if (error instanceof OrderNotFoundError || error instanceof OrderError) {
        throw error;
      }
      
      if (error instanceof Error) {
        const errorMessage = error.message;
        if (errorMessage.includes('Invalid') || errorMessage.includes('UUID') || errorMessage.includes('Inconsistent column data')) {
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
   * 주문 ID로 영수증 조회
   */
  async getReceiptByOrderId(orderId: string) {
    try {
      return await this.repository.findReceiptByOrderId(orderId);
    } catch (error) {
      let errorMessage = '알 수 없는 오류';
      if (error instanceof Error) {
        const errMsg = error.message;
        if (errMsg.includes('Invalid') || errMsg.includes('UUID') || errMsg.includes('Inconsistent column data')) {
          errorMessage = '잘못된 주문 ID 형식입니다';
        } else {
          errorMessage = errMsg.split('\n')[0];
        }
      }
      
      throw new OrderError(
        '영수증 조회 실패',
        errorMessage
      );
    }
  }
}
