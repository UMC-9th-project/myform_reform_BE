import prisma, { runInTransaction } from '../../config/prisma.config.js';
import { Prisma } from '@prisma/client';
import {
  getPortonePayment,
  type PortonePaymentInfo
} from '../../config/portone.config.js';
import {
  ItemNotFoundError,
  InsufficientStockError,
  OrderNotFoundError,
  OrderError,
  PaymentVerificationError,
  PaymentAmountMismatchError
} from './orders.error.js';
import type {
  OrderSheetResponse,
  CreateOrderRequest,
  CreateOrderResponse,
  OrderResponse
} from './orders.model.js';

export class OrdersService {
  /**
   * 주문번호 생성 (YYYYMMDD-XXXXX 형식)
   * 동시성 문제 방지를 위해 재시도 로직 포함
   * @param createdAt 주문 생성 시각 (해당 날짜 기준으로 순번 계산)
   * @returns 주문번호 문자열 (예: "20260116-00001")
   */
  private async generateOrderNumber(createdAt: Date): Promise<string> {
    const dateStr = createdAt.toISOString().slice(0, 10).replace(/-/g, '');
    
    const dayStart = new Date(createdAt);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(createdAt);
    dayEnd.setHours(23, 59, 59, 999);
    
    const maxRetries = 5;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const orderCountResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint as count
        FROM "order"
        WHERE "created_at" >= ${dayStart}::timestamp
          AND "created_at" <= ${dayEnd}::timestamp
          AND "order_number" IS NOT NULL
        FOR UPDATE
      `;
      
      const orderCount = Number(orderCountResult[0]?.count || 0);
      const sequence = String(orderCount + 1).padStart(5, '0');
      const orderNumber = `${dateStr}-${sequence}`;
      
      if (attempt > 0) {
        const existing = await prisma.order.findUnique({
          where: { order_number: orderNumber },
          select: { order_id: true }
        });
        
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
   * UUID 또는 주문번호로 주문 조회
   * @param orderIdOrNumber UUID 또는 주문번호
   * @param userId 사용자 ID
   * @returns 주문 정보 또는 null
   */
  private async findOrderByIdOrNumber(
    orderIdOrNumber: string,
    userId: string
  ) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      orderIdOrNumber
    );

    if (isUuid) {
      return await prisma.order.findFirst({
        where: {
          order_id: orderIdOrNumber,
          user_id: userId
        },
        include: {
          owner: {
            select: {
              nickname: true
            }
          },
          order_option: {
            include: {
              option_item: {
                include: {
                  option_group: {
                    include: {
                      item: {
                        include: {
                          item_photo: {
                            select: {
                              content: true,
                              photo_order: true
                            },
                            orderBy: {
                              photo_order: 'asc'
                            },
                            take: 1
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          reciept: {
            orderBy: {
              created_at: 'desc'
            },
            take: 1
          }
        }
      });
    } else {
      return await prisma.order.findFirst({
        where: {
          order_number: orderIdOrNumber,
          user_id: userId
        },
        include: {
          owner: {
            select: {
              nickname: true
            }
          },
          order_option: {
            include: {
              option_item: {
                include: {
                  option_group: {
                    include: {
                      item: {
                        include: {
                          item_photo: {
                            select: {
                              content: true,
                              photo_order: true
                            },
                            orderBy: {
                              photo_order: 'asc'
                            },
                            take: 1
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          reciept: {
            orderBy: {
              created_at: 'desc'
            },
            take: 1
          }
        }
      });
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
    const item = await prisma.item.findUnique({
      where: { item_id: itemId },
      include: {
        owner: {
          select: {
            nickname: true
          }
        },
        item_photo: {
          select: {
            content: true,
            photo_order: true
          },
          orderBy: {
            photo_order: 'asc'
          },
          take: 1
        },
        option_group: {
          include: {
            option_item: {
              where: {
                option_item_id: { in: optionItemIds }
              }
            }
          }
        }
      }
    });

    if (!item) {
      throw new ItemNotFoundError(itemId);
    }

    const optionItems = await prisma.option_item.findMany({
      where: {
        option_item_id: { in: optionItemIds }
      },
      include: {
        option_group: {
          select: {
            name: true
          }
        }
      }
    });

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
      const address = await prisma.delivery_address.findFirst({
        where: {
          delivery_address_id: deliveryAddressId,
          user_id: userId
        }
      });
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
      const defaultAddress = await prisma.delivery_address.findFirst({
        where: {
          user_id: userId,
          is_default: true
        }
      });
      if (defaultAddress) {
        deliveryAddress = {
          delivery_address_id: defaultAddress.delivery_address_id,
          postal_code: defaultAddress.postal_code,
          address: defaultAddress.address,
          address_detail: defaultAddress.address_detail
        };
      }
    }

    return {
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
    const item = await prisma.item.findUnique({
      where: { item_id: itemId },
      include: {
        owner: {
          select: {
            owner_id: true
          }
        }
      }
    });

    if (!item) {
      throw new ItemNotFoundError(itemId);
    }

    const result = await runInTransaction(async () => {
      const existingPendingOrder = await prisma.order.findFirst({
        where: {
          user_id: userId,
          target_id: itemId,
          target_type: 'ITEM',
          status: {
            in: ['PENDING', 'PAID']
          }
        }
      });

      if (existingPendingOrder) {
        throw new OrderError(
          '이미 진행 중인 주문이 있습니다.',
          `주문 ID: ${existingPendingOrder.order_id}`
        );
      }

      const optionItems = await prisma.option_item.findMany({
        where: {
          option_item_id: { in: optionItemIds }
        },
        include: {
          option_group: {
            select: {
              item_id: true,
              option_group_id: true
            }
          }
        }
      });

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

      for (const optionItem of optionItems) {
        if (optionItem.quantity !== null) {
          const updateResult = await prisma.$executeRaw(
            Prisma.sql`
              UPDATE option_item
              SET quantity = quantity - ${quantity}
              WHERE option_item_id = ${optionItem.option_item_id}::uuid
                AND quantity >= ${quantity}
                AND quantity IS NOT NULL
            `
          );

          if (updateResult === 0) {
            const currentItem = await prisma.option_item.findUnique({
              where: { option_item_id: optionItem.option_item_id }
            });
            throw new InsufficientStockError(
              optionItem.name || '옵션',
              `현재 재고: ${currentItem?.quantity || 0}, 요청 수량: ${quantity}`
            );
          }
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

        const newDeliveryAddress = await prisma.delivery_address.create({
          data: {
            user_id: userId,
            owner_id: item.owner_id,
            postal_code: newAddress.postal_code,
            address: newAddress.address,
            address_detail: newAddress.address_detail || null,
            is_default: false
          }
        });
        finalDeliveryAddressId = newDeliveryAddress.delivery_address_id;
      } else if (finalDeliveryAddressId) {
        const address = await prisma.delivery_address.findFirst({
          where: {
            delivery_address_id: finalDeliveryAddressId,
            user_id: userId
          }
        });
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

      let order: {
        order_id: string;
        order_number: string | null;
      } | null = null;
      let orderNumber: string;
      const maxOrderNumberRetries = 5;
      
      for (let retryCount = 0; retryCount < maxOrderNumberRetries; retryCount++) {
        try {
          orderNumber = await this.generateOrderNumber(new Date());
          
          order = await prisma.order.create({
            data: {
              user_id: userId,
              owner_id: item.owner_id,
              target_type: 'ITEM',
              target_id: itemId,
              user_address: finalDeliveryAddressId,
              price: productAmount,
              delivery_fee: deliveryFee,
              amount: totalAmount,
              status: impUid ? 'PAID' : 'PENDING',
              order_number: orderNumber
            }
          });
          
          break;
        } catch (error: any) {
          if (error.code === 'P2002' && error.meta?.target?.includes('order_number')) {
            if (retryCount < maxOrderNumberRetries - 1) {
              await new Promise((resolve) => setTimeout(resolve, 50 * (retryCount + 1)));
              continue;
            } else {
              const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
              const timestamp = Date.now().toString().slice(-6);
              orderNumber = `${dateStr}-${timestamp}`;
              
              order = await prisma.order.create({
                data: {
                  user_id: userId,
                  owner_id: item.owner_id,
                  target_type: 'ITEM',
                  target_id: itemId,
                  user_address: finalDeliveryAddressId,
                  price: productAmount,
                  delivery_fee: deliveryFee,
                  amount: totalAmount,
                  status: impUid ? 'PAID' : 'PENDING',
                  order_number: orderNumber
                }
              });
              break;
            }
          } else {
            throw error;
          }
        }
      }

      if (!order) {
        throw new Error('주문 생성에 실패했습니다.');
      }

      if (optionItemIds.length > 0) {
        await prisma.order_option.createMany({
          data: optionItemIds.map((optionItemId) => ({
            order_id: order.order_id,
            option_item_id: optionItemId
          }))
        });
      }

      const receipt = await prisma.reciept.create({
        data: {
          order_id: order.order_id,
          payment_status: impUid ? 'paid' : 'pending',
          payment_method: impUid ? 'card' : null,
          payment_gateway: impUid ? 'portone' : null,
          transaction: impUid || null
        }
      });

      return {
        order_id: order.order_id,
        receipt_id: receipt.reciept_id,
        total_amount: totalAmount
      };
    });

    if (impUid) {
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
              throw error;
            }
          }
        }

        if (!paymentInfo && lastError) {
          throw lastError;
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

        await prisma.reciept.update({
          where: { reciept_id: result.receipt_id },
          data: {
            payment_status: 'paid',
            payment_method: paymentInfo.pay_method || 'card',
            payment_gateway: paymentInfo.pg_provider || 'portone',
            transaction: cardInfo
          }
        });

        await prisma.cart.deleteMany({
          where: {
            user_id: userId,
            item_id: itemId
          }
        });
      } catch (error: any) {
        try {
          await runInTransaction(async () => {
            await prisma.order.update({
              where: { order_id: result.order_id },
              data: { status: 'CANCELLED' }
            });

            await prisma.reciept.update({
              where: { reciept_id: result.receipt_id },
              data: { payment_status: 'cancelled' }
            });

            for (const optionItemId of optionItemIds) {
              let retryCount = 0;
              const maxRetries = 3;
              let restoreSuccess = false;

              while (retryCount < maxRetries && !restoreSuccess) {
                try {
                  const updateResult = await prisma.$executeRaw(
                    Prisma.sql`
                      UPDATE option_item
                      SET quantity = quantity + ${quantity}
                      WHERE option_item_id = ${optionItemId}::uuid
                        AND quantity IS NOT NULL
                    `
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
                      `재고 복구 실패 (optionItemId: ${optionItemId}):`,
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
    } else {
      await prisma.cart.deleteMany({
        where: {
          user_id: userId,
          item_id: itemId
        }
      });
    }

    return {
      order_id: result.order_id,
      payment_required: !impUid,
      payment_info: impUid
        ? {
            imp_uid: impUid,
            merchant_uid: merchantUid || result.order_id,
            amount: result.total_amount
          }
        : undefined
    };
  }

  /**
   * 주문 조회 (결제 완료 정보)
   * @param orderIdOrNumber UUID 또는 주문번호
   * @param userId 사용자 ID
   */
  async getOrder(orderIdOrNumber: string, userId: string): Promise<OrderResponse> {
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
      const address = await prisma.delivery_address.findUnique({
        where: { delivery_address_id: order.user_address }
      });
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
    const paymentInfo = {
      amount: order.amount ? Number(order.amount) : 0,
      payment_method: receipt?.payment_method || null,
      card_info: this.parseCardInfo(receipt?.transaction || null),
      approved_at: receipt?.created_at || null
    };

    return {
      order_id: order.order_id,
      order_number: order.order_number || order.order_id,
      delivery_address: deliveryAddress,
      order_items: orderItems,
      payment: paymentInfo,
      total_amount: order.amount ? Number(order.amount) : 0,
      delivery_fee: order.delivery_fee ? Number(order.delivery_fee) : 0
    };
  }
}
