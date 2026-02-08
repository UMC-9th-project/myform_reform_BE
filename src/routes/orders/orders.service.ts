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
  PaymentAmountMismatchError,
  ReviewNotAllowedError,
  ReviewAlreadyExistsError
} from './orders.error.js';
import type {
  OrderSheetResponse,
  CreateOrderRequest,
  CreateOrderResponse,
  OrderResponse,
  OrderItemInfo,
} from './orders.model.js';
import type { GetOrderResponseDto } from './dto/orders.res.dto.js';
import { OrdersRepository } from './orders.repository.js';
import { customAlphabet } from 'nanoid';
import { Decimal } from '@prisma/client/runtime/binary';
import { CreateReviewRequestDto } from './dto/orders.req.dto.js';
import { CreateReviewInput } from './orders.model.js';
import { CreateReviewResponseDto } from './dto/orders.res.dto.js';


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
      recipient_name?: string;
      phone?: string;
      address_name?: string;
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
      if (!newAddress.postal_code?.trim() || !newAddress.address?.trim()) {
        throw new OrderError(
          '배송지 정보가 올바르지 않습니다.',
          '우편번호와 주소는 필수 입력 항목입니다.'
        );
      }
      if (!newAddress.recipient_name?.trim()) {
        throw new OrderError(
          '배송지 정보가 올바르지 않습니다.',
          '수령인은 필수 입력 항목입니다.'
        );
      }
      if (!newAddress.phone?.trim()) {
        throw new OrderError(
          '배송지 정보가 올바르지 않습니다.',
          '연락처는 필수 입력 항목입니다.'
        );
      }
      return undefined;
    } else {
      const defaultAddress =
        await this.repository.findDefaultDeliveryAddress(userId);
      return defaultAddress?.delivery_address_id;
    }
  }

  /**
   * 배송지 정보 조회
   */
  private async getDeliveryAddressInfo(
    userId: string,
    deliveryAddressId?: string,
    newAddress?: {
      postal_code?: string;
      address?: string;
      address_detail?: string;
      recipient_name?: string;
      phone?: string;
      address_name?: string;
    }
  ): Promise<{
    delivery_address_id?: string;
    postal_code: string | null;
    address: string | null;
    address_detail: string | null;
    recipient_name: string | null;
    phone: string | null;
    address_name: string | null;
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
          address_detail: address.address_detail,
          recipient_name: address.recipient ?? null,
          phone: address.phone ?? null,
          address_name: address.address_name ?? null
        };
      }
    } else if (newAddress) {
      return {
        postal_code: newAddress.postal_code ?? null,
        address: newAddress.address ?? null,
        address_detail: newAddress.address_detail ?? null,
        recipient_name: newAddress.recipient_name ?? null,
        phone: newAddress.phone ?? null,
        address_name: newAddress.address_name ?? null
      };
    } else {
      const defaultAddress =
        await this.repository.findDefaultDeliveryAddress(userId);
      if (defaultAddress) {
        return {
          delivery_address_id: defaultAddress.delivery_address_id,
          postal_code: defaultAddress.postal_code,
          address: defaultAddress.address,
          address_detail: defaultAddress.address_detail,
          recipient_name: defaultAddress.recipient ?? null,
          phone: defaultAddress.phone ?? null,
          address_name: defaultAddress.address_name ?? null
        };
      }
    }
    return null;
  }

  /**
   * receipt에 저장할 결제 시점 배송지 스냅샷
   */
  private async getDeliverySnapshotForReceipt(
    userId: string,
    _ownerId: string,
    deliveryAddressId?: string,
    newAddress?: {
      postal_code?: string;
      address?: string;
      address_detail?: string;
      recipient_name?: string;
      phone?: string;
      address_name?: string;
    }
  ): Promise<{
    delivery_postal_code: string | null;
    delivery_address: string | null;
    delivery_address_detail: string | null;
    delivery_recipient_name: string | null;
    delivery_phone: string | null;
    delivery_address_name: string | null;
  } | null> {
    const info = await this.getDeliveryAddressInfo(
      userId,
      deliveryAddressId,
      newAddress
    );
    if (!info) return null;
    return {
      delivery_postal_code: info.postal_code,
      delivery_address: info.address,
      delivery_address_detail: info.address_detail,
      delivery_recipient_name: info.recipient_name,
      delivery_phone: info.phone,
      delivery_address_name: info.address_name ?? null
    };
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
   * 채팅 기반 리폼 주문 생성 (내부/채팅 연동용)
   * receipt 생성 후 order 1건 생성.
   * @returns { receipt, order, receipt_number }
   */
  async createReformOrderFromChat(params: {
    chatRoomId: string;
    userId: string;
    ownerId: string;
    targetType: 'FEED' | 'REQUEST' | 'PROPOSAL';
    targetId: string | null;
    price: number;
    deliveryFee: number;
  }): Promise<{ receipt_number: string; receipt_id: string; order_id: string }> {
    const receiptNumber = await this.generateReceiptNumber();
    const totalAmount = params.price + params.deliveryFee;

    const receipt = await this.repository.createReceipt({
      receipt_number: receiptNumber,
      total_amount: totalAmount,
      payment_status: 'PENDING',
      payment_method: null,
      payment_gateway: 'CHAT',
      transaction: null
    });

    const order = await this.repository.createReformOrderFromChat({
      receipt_id: receipt.receipt_id,
      user_id: params.userId,
      owner_id: params.ownerId,
      target_type: params.targetType,
      target_id: params.targetId,
      price: params.price,
      delivery_fee: params.deliveryFee,
      quantity: 1,
      status: order_status_enum.PENDING,
      chat_room_id: params.chatRoomId
    });

    return {
      receipt_number: receiptNumber,
      receipt_id: receipt.receipt_id,
      order_id: order.order_id
    };
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
   * 주문서 정보 조회 (단일 상품, 조합 1개 또는 여러 개)
   * @param lines 조합별 { option_item_ids, quantity } (1개면 기존 단일, 2개 이상이면 여러 줄)
   */
  async getOrderSheet(
    itemId: string,
    lines: Array<{ option_item_ids: string[]; quantity: number }>,
    userId: string,
    deliveryAddressId?: string,
    newAddress?: {
      postal_code?: string;
      address?: string;
      address_detail?: string;
      recipient_name?: string;
      phone?: string;
      address_name?: string;
    }
  ): Promise<OrderSheetResponse> {
    try {
      if (!lines || lines.length === 0) {
        throw new OrderError(
          '주문 정보가 올바르지 않습니다.',
          'option_item_ids·quantity 또는 items가 필요합니다.'
        );
      }

      if (newAddress) {
        if (!newAddress.postal_code?.trim() || !newAddress.address?.trim()) {
          throw new OrderError(
            '배송지 정보가 올바르지 않습니다.',
            '우편번호와 주소는 필수 입력 항목입니다.'
          );
        }
        if (!newAddress.recipient_name?.trim()) {
          throw new OrderError(
            '배송지 정보가 올바르지 않습니다.',
            '수령인은 필수 입력 항목입니다.'
          );
        }
        if (!newAddress.phone?.trim()) {
          throw new OrderError(
            '배송지 정보가 올바르지 않습니다.',
            '연락처는 필수 입력 항목입니다.'
          );
        }
      }

      const firstLine = lines[0];
      const item = await this.repository.findItemWithOptionGroups(
        itemId,
        firstLine.option_item_ids
      );

      if (!item) {
        throw new ItemNotFoundError(itemId);
      }

      const orderItems: OrderItemInfo[] = [];
      let totalProductAmount = 0;
      let deliveryFee = item.delivery ? Number(item.delivery) : 0;

      for (const line of lines) {
        const optionItems =
          await this.repository.findOptionItemsByIds(line.option_item_ids);

        if (optionItems.length !== line.option_item_ids.length) {
          throw new ItemNotFoundError(
            '존재하지 않는 옵션이 포함되어 있습니다.'
          );
        }

        this.validateOptions(optionItems, itemId);
        this.validateStock(optionItems, line.quantity);

        const extraPriceSum = optionItems.reduce(
          (sum: number, oi: { extra_price: number | null }) =>
            sum + (oi.extra_price || 0),
          0
        );

        const selectedOptions = optionItems.map(
          (oi: {
            extra_price: number | null;
            option_group: { name: string | null };
            name: string | null;
          }) => {
            const extraPrice = oi.extra_price || 0;
            const priceText =
              extraPrice > 0 ? ` (+${extraPrice.toLocaleString()}원)` : '';
            return `${oi.option_group.name || ''} ${oi.name || ''}${priceText}`;
          }
        );

        const basePrice = item.price ? Number(item.price) : 0;
        const productAmount =
          (basePrice + extraPriceSum) * line.quantity;
        totalProductAmount += productAmount;

        const lineDelivery = item.delivery ? Number(item.delivery) : 0;
        if (lineDelivery > deliveryFee) deliveryFee = lineDelivery;

        orderItems.push({
          reformer_nickname: item.owner?.nickname || '',
          thumbnail:
            item.item_photo?.find((p) => p.photo_order === 1)?.content || '',
          title: item.title || '',
          selected_options: selectedOptions,
          quantity: line.quantity,
          price: productAmount
        });
      }

      const totalAmount = totalProductAmount + deliveryFee;

      const deliveryInfo = await this.getDeliveryAddressInfo(
        userId,
        deliveryAddressId,
        newAddress
      );
      const deliveryAddress = deliveryInfo
        ? {
            delivery_address_id: deliveryInfo.delivery_address_id,
            postal_code: deliveryInfo.postal_code ?? null,
            address: deliveryInfo.address ?? null,
            address_detail: deliveryInfo.address_detail ?? null,
            recipient_name: deliveryInfo.recipient_name ?? null,
            phone: deliveryInfo.phone ?? null,
            address_name: deliveryInfo.address_name ?? null
          }
        : null;

      const receiptNumber = await this.generateReceiptNumber();

      return {
        receipt_number: receiptNumber,
        delivery_fee: deliveryFee,
        delivery_address: deliveryAddress,
        payment: {
          product_amount: totalProductAmount,
          delivery_fee: deliveryFee,
          total_amount: totalAmount
        },
        seller_groups: [
          {
            owner_id: item.owner_id,
            reformer_nickname: item.owner?.nickname || '',
            items: orderItems,
            delivery_fee: deliveryFee
          }
        ]
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
   * 주문 생성 (PENDING 상태) — 단일 상품, 조합 1개 또는 여러 개
   * @param lines 조합별 { option_item_ids, quantity }
   */
  async createOrder(
    itemId: string,
    lines: Array<{ option_item_ids: string[]; quantity: number }>,
    userId: string,
    deliveryAddressId?: string,
    newAddress?: {
      postal_code?: string;
      address?: string;
      address_detail?: string;
      recipient_name?: string;
      phone?: string;
      address_name?: string;
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

      if (!lines || lines.length === 0) {
        throw new OrderError(
          '주문 정보가 올바르지 않습니다.',
          'option_item_ids·quantity 또는 items가 필요합니다.'
        );
      }

      const item = await this.repository.findItemById(itemId);

      if (!item) {
        throw new ItemNotFoundError(itemId);
      }

      const result = await runInTransaction(async () => {
        let totalProductAmount = 0;
        let deliveryFee = item.delivery ? Number(item.delivery) : 0;
        const orderDataList: Array<{
          optionItemIds: string[];
          quantity: number;
          productAmount: number;
          deliveryFee: number;
        }> = [];

        for (const line of lines) {
          const optionItems =
            await this.repository.findOptionItemsByIds(line.option_item_ids);

          if (optionItems.length !== line.option_item_ids.length) {
            throw new ItemNotFoundError(
              '존재하지 않는 옵션이 포함되어 있습니다.'
            );
          }

          this.validateOptions(optionItems, itemId);

          const optionItemIdsWithQuantity = optionItems
            .filter((oi) => oi.quantity !== null)
            .map((oi) => oi.option_item_id);

          if (optionItemIdsWithQuantity.length > 0) {
            for (const optionItemId of optionItemIdsWithQuantity) {
              const updateResult =
                await this.repository.updateOptionItemQuantities(
                  [optionItemId],
                  line.quantity
                );

              if (updateResult !== 1) {
                const updatedItem =
                  await this.repository.findUpdatedOptionItems([optionItemId]);
                const optionItem = optionItems.find(
                  (oi) => oi.option_item_id === optionItemId
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
                  `재고가 부족합니다. 현재 재고: ${currentQuantity}, 요청 수량: ${line.quantity}`
                );
              }
            }
          }

          const extraPriceSum = optionItems.reduce(
            (sum: number, oi: { extra_price: number | null }) =>
              sum + (oi.extra_price || 0),
            0
          );

          const basePrice = item.price ? Number(item.price) : 0;
          const productAmount =
            (basePrice + extraPriceSum) * line.quantity;
          totalProductAmount += productAmount;

          const lineDelivery = item.delivery ? Number(item.delivery) : 0;
          if (lineDelivery > deliveryFee) deliveryFee = lineDelivery;

          orderDataList.push({
            optionItemIds: line.option_item_ids,
            quantity: line.quantity,
            productAmount,
            deliveryFee: lineDelivery
          });
        }

        const totalAmount = totalProductAmount + deliveryFee;

        await this.processDeliveryAddress(
          userId,
          item.owner_id,
          deliveryAddressId,
          newAddress
        );

        const deliverySnapshot = await this.getDeliverySnapshotForReceipt(
          userId,
          item.owner_id,
          deliveryAddressId,
          newAddress
        );

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
            transaction: null,
            ...(deliverySnapshot && {
              delivery_postal_code: deliverySnapshot.delivery_postal_code,
              delivery_address: deliverySnapshot.delivery_address,
              delivery_address_detail: deliverySnapshot.delivery_address_detail,
              delivery_recipient_name: deliverySnapshot.delivery_recipient_name,
              delivery_phone: deliverySnapshot.delivery_phone,
              delivery_address_name: deliverySnapshot.delivery_address_name
            })
          });
        } else {
          await this.repository.updateReceiptTotalAmount(
            receipt.receipt_id,
            totalAmount
          );
          if (deliverySnapshot) {
            await this.repository.updateReceipt(receipt.receipt_id, {
              delivery_postal_code: deliverySnapshot.delivery_postal_code,
              delivery_address: deliverySnapshot.delivery_address,
              delivery_address_detail: deliverySnapshot.delivery_address_detail,
              delivery_recipient_name: deliverySnapshot.delivery_recipient_name,
              delivery_phone: deliverySnapshot.delivery_phone,
              delivery_address_name: deliverySnapshot.delivery_address_name
            });
          }
        }

        const initialOrderStatus =
          receipt.payment_status === 'paid'
            ? order_status_enum.PAID
            : order_status_enum.PENDING;

        let firstOrderId: string | null = null;

        for (const od of orderDataList) {
          const order = await this.repository.createOrder({
            receipt_id: receipt.receipt_id,
            user_id: userId,
            owner_id: item.owner_id,
            target_type: target_type_enum.ITEM,
            target_id: itemId,
            price: od.productAmount,
            delivery_fee: od.deliveryFee,
            quantity: od.quantity,
            status: initialOrderStatus
          });

          if (!firstOrderId) firstOrderId = order.order_id;

          await this.repository.createOrderOptions(
            order.order_id,
            od.optionItemIds
          );
        }

        await this.repository.deleteCartItems(userId, itemId);

        return {
          order_id: firstOrderId!,
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

      const deliveryAddress = {
        postal_code: receipt.delivery_postal_code ?? null,
        address: receipt.delivery_address ?? null,
        address_detail: receipt.delivery_address_detail ?? null,
        recipient_name: receipt.delivery_recipient_name ?? null,
        phone: receipt.delivery_phone ?? null,
        address_name: receipt.delivery_address_name ?? null
      };

      const orderItems = receipt.order.map(
        (order: {
          order_id: string;
          quantity: number | null;
          price: Decimal | null;
          owner: { nickname: string | null };
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
          const firstOption = order.order_option?.[0];
          const item = firstOption?.option_item?.option_group?.item;
          const selectedOptions = (order.order_option || []).map(
            (oo: {
              option_item: {
                option_group: { name: string | null };
                name: string | null;
              };
            }) =>
              `${oo.option_item?.option_group?.name || ''} ${oo.option_item?.name || ''}`.trim()
          );

          return {
            thumbnail: item?.item_photo?.[0]?.content || '',
            title: item?.title || '',
            selected_options: selectedOptions,
            reformer_nickname: order.owner?.nickname || '',
            quantity: order.quantity ?? 0,
            price: order.price ? Number(order.price) : 0
          };
        }
      );

      const cardDetails = this.extractCardDetails(receipt.transaction || null);
      const paymentInfo = {
        amount: receipt.total_amount ? Number(receipt.total_amount) : 0,
        payment_method: receipt.payment_method || null,
        card_name: cardDetails.card_name,
        masked_card_number: cardDetails.masked_card_number,
        card_info: this.parseCardInfo(receipt.transaction || null),
        approved_at: receipt.approved_at || null
      };

      const firstItem = orderItems.length > 0 ? orderItems[0] : null;
      const remainingItemsCount = Math.max(0, orderItems.length - 1);

      const maxDeliveryFeeByOwner = new Map<string, number>();
      for (const o of receipt.order) {
        const ownerId = (o as { owner_id: string }).owner_id;
        const fee = o.delivery_fee ? Number(o.delivery_fee) : 0;
        const current = maxDeliveryFeeByOwner.get(ownerId) ?? 0;
        maxDeliveryFeeByOwner.set(ownerId, Math.max(current, fee));
      }
      const totalDeliveryFee = [...maxDeliveryFeeByOwner.values()].reduce(
        (sum, fee) => sum + fee,
        0
      );

      const totalAmount = receipt.total_amount ? Number(receipt.total_amount) : 0;
      const product_amount = totalAmount - totalDeliveryFee;

      return {
        order_id: firstOrder.order_id,
        receipt_number: receipt.receipt_number || firstOrder.order_id,
        status: firstOrder.status || null,
        delivery_address: deliveryAddress,
        first_item: firstItem,
        remaining_items_count: remainingItemsCount,
        order_items: orderItems,
        payment: paymentInfo,
        total_amount: totalAmount,
        product_amount,
        delivery_fee: totalDeliveryFee
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
  private async fetchPaymentInfoWithRetry(
    impUid: string
  ): Promise<PortonePaymentInfo> {
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
              transaction: cardInfo,
              approved_at: paymentInfo.paid_at
                ? new Date(paymentInfo.paid_at * 1000)
                : new Date()
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
            '일부 주문이 PENDING 상태가 아닙니다.'
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
          transaction: cardInfo,
          approved_at: paymentInfo.paid_at
            ? new Date(paymentInfo.paid_at * 1000)
            : new Date()
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
   * order_id: UUID 또는 receipt_number(12자리) 모두 지원. receipt_number로 검증 시 merchant_uid와 동일하게 넣으면 됨.
   * @returns 성공 시 receipt_id (채팅 결제 완료 알림 등 후속 처리용)
   */
  async verifyPayment(orderId: string, impUid: string): Promise<string> {
    try {
      const isReceiptNumber = /^\d{12}$/.test(orderId);
      let receiptData: {
        receipt_id: string;
        receipt_number: string | null;
        total_amount: unknown;
        order: Array<{
          order_id: string;
          status: order_status_enum | null;
          quantity: number | null;
          order_option?: Array<{ option_item_id: string }>;
        }>;
      } | null;

      if (isReceiptNumber) {
        const byReceipt = await this.repository.findReceiptByReceiptNumberForVerification(orderId);
        if (!byReceipt) {
          throw new OrderNotFoundError(orderId);
        }
        receiptData = {
          receipt_id: byReceipt.receipt_id,
          receipt_number: byReceipt.receipt_number,
          total_amount: byReceipt.total_amount,
          order: byReceipt.order.map((o: any) => ({
            order_id: o.order_id,
            status: o.status,
            quantity: o.quantity,
            order_option: o.order_option
          }))
        };
      } else {
        const order = await this.repository.findOrderByIdForVerification(orderId);
        if (!order) {
          throw new OrderNotFoundError(orderId);
        }
        const orderReceipt = (order as any).receipt;
        if (!orderReceipt) {
          throw new OrderNotFoundError(orderId);
        }
        receiptData = await this.repository.findReceiptByIdWithOrders(
          orderReceipt.receipt_id
        );
      }

      if (!receiptData) {
        throw new OrderNotFoundError(orderId);
      }

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

      await this.verifyAndUpdatePayment(
        receipt,
        impUid,
        receipt.receipt_number || '',
        true
      );
      return receiptData.receipt_id;
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
   * 리폼(채팅) 결제 완료 시 알림용 채팅방 목록 조회
   */
  async getReformOrderChatRoomsByReceiptId(
    receiptId: string
  ): Promise<{ chat_room_id: string; owner_id: string }[]> {
    return this.repository.findReformOrderChatRoomsByReceiptId(receiptId);
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
                    transaction: cardInfo,
                    approved_at: paymentInfo.paid_at
                      ? new Date(paymentInfo.paid_at * 1000)
                      : new Date()
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
      recipient_name?: string;
      phone?: string;
      address_name?: string;
    }
  ): Promise<OrderSheetResponse> {
    try {
      if (!cartIds || cartIds.length === 0) {
        throw new OrderError(
          '장바구니가 비어있습니다.',
          '주문할 상품을 선택해주세요.'
        );
      }

      // 새 배송지 시: 수령인·배송지·연락처 필수, 배송지명 선택
      if (newAddress) {
        if (!newAddress.postal_code?.trim() || !newAddress.address?.trim()) {
          throw new OrderError(
            '배송지 정보가 올바르지 않습니다.',
            '우편번호와 주소는 필수 입력 항목입니다.'
          );
        }
        if (!newAddress.recipient_name?.trim()) {
          throw new OrderError(
            '배송지 정보가 올바르지 않습니다.',
            '수령인은 필수 입력 항목입니다.'
          );
        }
        if (!newAddress.phone?.trim()) {
          throw new OrderError(
            '배송지 정보가 올바르지 않습니다.',
            '연락처는 필수 입력 항목입니다.'
          );
        }
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
      const sellerGroupsMap = new Map<
        string,
        { reformer_nickname: string; items: OrderItemInfo[]; maxDeliveryFee: number }
      >();
      let totalProductAmount = 0;
      const maxDeliveryFeeByOwner = new Map<string, number>();

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
        const ownerId = item.owner_id;
        const currentMax = maxDeliveryFeeByOwner.get(ownerId) ?? 0;
        const newMax = Math.max(currentMax, deliveryFee);
        maxDeliveryFeeByOwner.set(ownerId, newMax);

        const selectedOptions = optionItems.map((oi) => {
          const extraPrice = oi.extra_price || 0;
          const priceText =
            extraPrice > 0 ? ` (+${extraPrice.toLocaleString()}원)` : '';
          const groupName = oi.option_group?.name || '';
          return `${groupName} ${oi.name || ''}${priceText}`;
        });

        const orderItem: OrderItemInfo = {
          reformer_nickname: item.owner?.nickname || '',
          thumbnail:
            item.item_photo.find((p) => p.photo_order === 1)?.content || '',
          title: item.title || '',
          selected_options: selectedOptions,
          quantity: cart.quantity,
          price: productAmount
        };
        orderItems.push(orderItem);

        if (!sellerGroupsMap.has(ownerId)) {
          sellerGroupsMap.set(ownerId, {
            reformer_nickname: item.owner?.nickname || '',
            items: [],
            maxDeliveryFee: 0
          });
        }
        const group = sellerGroupsMap.get(ownerId)!;
        group.items.push(orderItem);
        group.maxDeliveryFee = newMax;
      }

      const deliveryAddress = await this.getDeliveryAddressInfo(
        userId,
        deliveryAddressId,
        newAddress
      );

      const receiptNumber = await this.generateReceiptNumber();
      const totalDeliveryFee = [...maxDeliveryFeeByOwner.values()].reduce(
        (sum, fee) => sum + fee,
        0
      );
      const totalAmount = totalProductAmount + totalDeliveryFee;

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

      const normalizedDeliveryAddress = deliveryAddress
        ? {
            delivery_address_id: deliveryAddress.delivery_address_id,
            postal_code: deliveryAddress.postal_code ?? null,
            address: deliveryAddress.address ?? null,
            address_detail: deliveryAddress.address_detail ?? null,
            recipient_name: deliveryAddress.recipient_name ?? null,
            phone: deliveryAddress.phone ?? null,
            address_name: deliveryAddress.address_name ?? null
          }
        : null;

      const seller_groups = [...sellerGroupsMap.entries()].map(
        ([owner_id, g]) => ({
          owner_id,
          reformer_nickname: g.reformer_nickname,
          items: g.items,
          delivery_fee: g.maxDeliveryFee
        })
      );

      return {
        receipt_number: receiptNumber,
        delivery_fee: totalDeliveryFee,
        delivery_address: normalizedDeliveryAddress,
        payment: {
          product_amount: totalProductAmount,
          delivery_fee: totalDeliveryFee,
          total_amount: totalAmount
        },
        seller_groups
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
      recipient_name?: string;
      phone?: string;
      address_name?: string;
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
        const maxDeliveryFeeByOwner = new Map<string, number>();
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
          const ownerId = item.owner_id;
          const currentMax = maxDeliveryFeeByOwner.get(ownerId) ?? 0;
          maxDeliveryFeeByOwner.set(ownerId, Math.max(currentMax, deliveryFee));

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

        const firstOwnerId = ownerIds[0];
        const deliverySnapshot = await this.getDeliverySnapshotForReceipt(
          userId,
          firstOwnerId,
          deliveryAddressId,
          newAddress
        );

        const totalDeliveryFee = [...maxDeliveryFeeByOwner.values()].reduce(
          (sum, fee) => sum + fee,
          0
        );
        const totalAmount = totalProductAmount + totalDeliveryFee;
        let receipt =
          await this.repository.findReceiptByReceiptNumber(merchantUid);

        if (!receipt) {
          receipt = await this.repository.createReceipt({
            receipt_number: merchantUid,
            total_amount: totalAmount,
            payment_status: 'pending',
            payment_method: null,
            payment_gateway: 'portone',
            transaction: null,
            ...(deliverySnapshot && {
              delivery_postal_code: deliverySnapshot.delivery_postal_code,
              delivery_address: deliverySnapshot.delivery_address,
              delivery_address_detail: deliverySnapshot.delivery_address_detail,
              delivery_recipient_name: deliverySnapshot.delivery_recipient_name,
              delivery_phone: deliverySnapshot.delivery_phone,
              delivery_address_name: deliverySnapshot.delivery_address_name
            })
          });
        } else {
          await this.repository.updateReceiptTotalAmount(
            receipt.receipt_id,
            totalAmount
          );
          if (deliverySnapshot) {
            await this.repository.updateReceipt(receipt.receipt_id, {
              delivery_postal_code: deliverySnapshot.delivery_postal_code,
              delivery_address: deliverySnapshot.delivery_address,
              delivery_address_detail: deliverySnapshot.delivery_address_detail,
              delivery_recipient_name: deliverySnapshot.delivery_recipient_name,
              delivery_phone: deliverySnapshot.delivery_phone,
              delivery_address_name: deliverySnapshot.delivery_address_name
            });
          }
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

  // 주문 건에 대한 리뷰 작성
  async createReview(orderId: string, userId: string, requestBody: CreateReviewRequestDto): Promise<CreateReviewResponseDto> {
    const order = await this.repository.findOrderById(orderId, userId);
    if (!order) {
      throw new OrderNotFoundError(orderId);
    }
    if (order.status == order_status_enum.PENDING) {
      throw new ReviewNotAllowedError('해당 주문은 리뷰 작성 가능한 상태가 아닙니다.');
    }
    if (await this.repository.findReviewByOrderId(orderId)) {
      throw new ReviewAlreadyExistsError('해당 주문에 대한 리뷰가 이미 작성되었습니다.');
    }
    const createReviewInput = new CreateReviewInput(orderId, userId, order.owner_id, requestBody);
    const review = await this.repository.createReview(createReviewInput);
    const createReviewResponse = new CreateReviewResponseDto(review);
    return createReviewResponse;
  }
}
