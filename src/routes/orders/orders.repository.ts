import prisma from '../../config/prisma.config.js';
import { Prisma, order_status_enum, target_type_enum } from '@prisma/client';

export class OrdersRepository {
  /**
   * 날짜 범위 내 주문 개수 조회
   */
  async countOrdersByDateRange(dayStart: Date, dayEnd: Date): Promise<number> {
    const orderCountResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint as count
      FROM "order"
      WHERE "created_at" >= ${dayStart}::timestamp
        AND "created_at" <= ${dayEnd}::timestamp
        AND "order_number" IS NOT NULL
    `;
    
    return Number(orderCountResult[0]?.count || 0);
  }

  /**
   * 주문번호로 주문 존재 여부 확인
   */
  async findOrderByOrderNumber(orderNumber: string) {
    return await prisma.order.findUnique({
      where: { order_number: orderNumber },
      select: { order_id: true }
    });
  }

  /**
   * UUID로 주문 조회
   */
  async findOrderById(orderId: string, userId: string) {
    return await prisma.order.findFirst({
      where: {
        order_id: orderId,
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

  /**
   * 주문번호로 주문 조회
   */
  async findOrderByNumber(orderNumber: string, userId: string) {
    return await prisma.order.findFirst({
      where: {
        order_number: orderNumber,
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

  /**
   * 상품 ID로 상품 조회 (옵션 그룹 포함)
   */
  async findItemWithOptionGroups(itemId: string, optionItemIds: string[]) {
    return await prisma.item.findUnique({
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
  }

  /**
   * 상품 ID로 상품 조회 (기본 정보만)
   */
  async findItemById(itemId: string) {
    return await prisma.item.findUnique({
      where: { item_id: itemId },
      include: {
        owner: {
          select: {
            owner_id: true
          }
        }
      }
    });
  }

  /**
   * 옵션 아이템 ID 목록으로 옵션 아이템 조회
   */
  async findOptionItemsByIds(optionItemIds: string[]) {
    return await prisma.option_item.findMany({
      where: {
        option_item_id: { in: optionItemIds }
      },
      include: {
        option_group: {
          select: {
            item_id: true,
            option_group_id: true,
            name: true
          }
        }
      }
    });
  }

  /**
   * 옵션 아이템 재고 차감
   */
  async updateOptionItemQuantities(
    optionItemIds: string[],
    quantity: number
  ): Promise<number> {
    return await prisma.$executeRaw(
      Prisma.sql`
        UPDATE option_item
        SET quantity = quantity - ${quantity}
        WHERE option_item_id = ANY(${optionItemIds}::uuid[])
          AND quantity >= ${quantity}
          AND quantity IS NOT NULL
      `
    );
  }

  /**
   * 옵션 아이템 재고 복구
   */
  async restoreOptionItemQuantities(
    optionItemIds: string[],
    quantity: number
  ): Promise<number> {
    return await prisma.$executeRaw(
      Prisma.sql`
        UPDATE option_item
        SET quantity = quantity + ${quantity}
        WHERE option_item_id = ANY(${optionItemIds}::uuid[])
          AND quantity IS NOT NULL
      `
    );
  }

  /**
   * 업데이트된 옵션 아이템 조회
   */
  async findUpdatedOptionItems(optionItemIds: string[]) {
    return await prisma.option_item.findMany({
      where: {
        option_item_id: { in: optionItemIds }
      },
      select: {
        option_item_id: true,
        name: true,
        quantity: true
      }
    });
  }

  /**
   * 배송지 ID로 배송지 조회
   */
  async findDeliveryAddressById(addressId: string, userId: string) {
    return await prisma.delivery_address.findFirst({
      where: {
        delivery_address_id: addressId,
        user_id: userId
      }
    });
  }

  /**
   * 기본 배송지 조회
   */
  async findDefaultDeliveryAddress(userId: string) {
    return await prisma.delivery_address.findFirst({
      where: {
        user_id: userId,
        is_default: true
      }
    });
  }

  /**
   * 배송지 생성
   */
  async createDeliveryAddress(data: {
    user_id: string;
    owner_id: string;
    postal_code: string;
    address: string;
    address_detail: string | null;
    is_default: boolean;
  }) {
    return await prisma.delivery_address.create({
      data
    });
  }

  /**
   * 주문 생성
   */
  async createOrder(data: {
    user_id: string;
    owner_id: string;
    target_type: target_type_enum;
    target_id: string;
    user_address: string | undefined;
    price: number;
    delivery_fee: number;
    amount: number;
    status: order_status_enum;
    order_number: string;
  }) {
    return await prisma.order.create({
      data
    });
  }

  /**
   * 주문 옵션 생성
   */
  async createOrderOptions(orderId: string, optionItemIds: string[]) {
    if (optionItemIds.length === 0) {
      return;
    }
    
    return await prisma.order_option.createMany({
      data: optionItemIds.map((optionItemId) => ({
        order_id: orderId,
        option_item_id: optionItemId
      }))
    });
  }

  /**
   * 영수증 생성
   */
  async createReceipt(data: {
    order_id: string;
    payment_status: string;
    payment_method: string;
    payment_gateway: string;
    transaction: string | null;
  }) {
    return await prisma.reciept.create({
      data
    });
  }

  /**
   * 주문 상태 업데이트
   */
  async updateOrderStatus(orderId: string, status: order_status_enum) {
    return await prisma.order.update({
      where: { order_id: orderId },
      data: { status }
    });
  }

  /**
   * 영수증 업데이트
   */
  async updateReceipt(receiptId: string, data: {
    payment_status?: string;
    payment_method?: string;
    payment_gateway?: string;
    transaction?: string | null;
  }) {
    return await prisma.reciept.update({
      where: { reciept_id: receiptId },
      data
    });
  }

  /**
   * 장바구니 아이템 삭제
   */
  async deleteCartItems(userId: string, itemId: string) {
    return await prisma.cart.deleteMany({
      where: {
        user_id: userId,
        item_id: itemId
      }
    });
  }

  /**
   * 주문 ID로 영수증 조회
   */
  async findReceiptByOrderId(orderId: string) {
    return await prisma.reciept.findFirst({
      where: { order_id: orderId },
      orderBy: { created_at: 'desc' }
    });
  }

  /**
   * 배송지 ID로 배송지 조회 (상세)
   */
  async findDeliveryAddressByIdDetailed(addressId: string) {
    return await prisma.delivery_address.findUnique({
      where: { delivery_address_id: addressId }
    });
  }
}
