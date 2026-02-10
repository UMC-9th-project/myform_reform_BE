import prisma from '../../config/prisma.config.js';
import { Prisma, order_status_enum, target_type_enum } from '@prisma/client';
import { CreateReviewInput } from './orders.model.js';

export class OrdersRepository {
  /**
   * receipt_number로 receipt 존재 여부 확인
   */
  async findReceiptByReceiptNumber(receiptNumber: string) {
    return await prisma.receipt.findUnique({
      where: { receipt_number: receiptNumber },
      select: {
        receipt_id: true,
        payment_status: true
      }
    });
  }

  /**
   * 주문 조회 (결제 검증용, 사용자 검증 없음)
   */
  async findOrderByIdForVerification(orderId: string) {
    return await prisma.order.findUnique({
      where: { order_id: orderId },
      select: {
        order_id: true,
        receipt_id: true,
        price: true,
        status: true,
        order_option: {
          select: {
            option_item_id: true
          }
        },
        receipt: {
          select: {
            receipt_id: true,
            receipt_number: true,
            total_amount: true
          }
        }
      }
    });
  }

  /**
   * receipt_number로 receipt 조회 (결제 검증용)
   */
  async findReceiptByReceiptNumberForVerification(receiptNumber: string) {
    return await prisma.receipt.findUnique({
      where: { receipt_number: receiptNumber },
      select: {
        receipt_id: true,
        receipt_number: true,
        total_amount: true,
        order: {
          select: {
            order_id: true,
            price: true,
            status: true,
            quantity: true,
            order_option: {
              select: {
                option_item_id: true
              }
            }
          }
        }
      }
    });
  }

  /**
   * UUID로 주문 조회 (receipt 포함)
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
        receipt: {
          include: {
            order: {
              include: {
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
                owner: {
                  select: {
                    nickname: true
                  }
                }
              }
            }
          }
        }
      }
    });
  }

  /**
   * receipt_number로 receipt와 모든 order 조회
   */
  async findReceiptByReceiptNumberWithOrders(
    receiptNumber: string,
    userId: string
  ) {
    return await prisma.receipt.findFirst({
      where: {
        receipt_number: receiptNumber,
        order: {
          some: {
            user_id: userId
          }
        }
      },
      include: {
        order: {
          where: {
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
            }
          }
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
   * 상품 ID 목록으로 상품 조회 (옵션 그룹, 사진, 판매자 포함)
   */
  async findItemsByIds(itemIds: string[]) {
    if (!itemIds || itemIds.length === 0) {
      return [];
    }
    return await prisma.item.findMany({
      where: { item_id: { in: itemIds } },
      include: {
        owner: {
          select: {
            owner_id: true,
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
          }
        },
        option_group: {
          include: {
            option_item: true
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
   * 배송지 생성 (수령인·연락처 필수, 배송지명 선택)
   */
  async createDeliveryAddress(data: {
    user_id: string;
    owner_id: string;
    postal_code: string;
    address: string;
    address_detail: string | null;
    recipient?: string | null;
    phone?: string | null;
    address_name?: string | null;
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
    receipt_id: string;
    user_id: string;
    owner_id: string;
    target_type: target_type_enum;
    target_id: string;
    price: number;
    delivery_fee: number;
    quantity: number;
    status: order_status_enum;
  }) {
    return await prisma.order.create({
      data
    });
  }

  /**
   * 채팅 기반 리폼 주문 생성
   * target_id, chat_room_id
   */
  async createReformOrderFromChat(data: {
    receipt_id: string;
    user_id: string;
    owner_id: string;
    target_type: target_type_enum;
    target_id: string | null;
    price: number;
    delivery_fee: number;
    quantity: number;
    status: order_status_enum;
    chat_room_id: string | null;
  }) {
    return await prisma.order.create({
      data: {
        receipt_id: data.receipt_id,
        user_id: data.user_id,
        owner_id: data.owner_id,
        target_type: data.target_type,
        target_id: data.target_id,
        price: data.price,
        delivery_fee: data.delivery_fee,
        quantity: data.quantity,
        status: data.status,
        chat_room_id: data.chat_room_id
      }
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
   * 영수증 생성 (결제 시점 배송지 스냅샷 포함)
   */
  async createReceipt(data: {
    receipt_number: string;
    total_amount: number;
    payment_status: string;
    payment_method: string | null;
    payment_gateway: string;
    transaction: string | null;
    delivery_postal_code?: string | null;
    delivery_address?: string | null;
    delivery_address_detail?: string | null;
    delivery_recipient_name?: string | null;
    delivery_phone?: string | null;
    delivery_address_name?: string | null;
  }) {
    return await prisma.receipt.create({
      data
    });
  }

  /**
   * receipt_id로 receipt와 모든 order 조회
   */
  async findReceiptByIdWithOrders(receiptId: string) {
    return await prisma.receipt.findUnique({
      where: { receipt_id: receiptId },
      include: {
        order: {
          select: {
            order_id: true,
            status: true,
            quantity: true,
            order_option: {
              select: {
                option_item_id: true
              }
            }
          }
        }
      }
    });
  }

  /**
   * receipt_id로 모든 order 조회
   */
  async findOrdersByReceiptId(receiptId: string) {
    return await prisma.order.findMany({
      where: { receipt_id: receiptId },
      include: {
        order_option: {
          select: {
            option_item_id: true
          }
        }
      }
    });
  }

  /**
   * 리폼(채팅) 주문의 채팅방 정보 조회 (결제 완료 후 알림용)
   * target_type REQUEST/PROPOSAL/FEED 이고 chat_room_id가 있는 order만
   * 채팅 기반 리폼 주문은 하나의 receipt에 하나의 order만 존재
   */
  async findReformOrderChatRoomsByReceiptId(receiptId: string): Promise<{ chat_room_id: string; owner_id: string } | null> {
    const order = await prisma.order.findFirst({
      where: {
        receipt_id: receiptId,
        chat_room_id: { not: null },
        target_type: { in: ['REQUEST', 'PROPOSAL', 'FEED'] }
      },
      select: { chat_room_id: true, owner_id: true }
    });
    if (!order || !order.chat_room_id) return null;
    return { chat_room_id: order.chat_room_id, owner_id: order.owner_id };
  }

  /**
   * receipt 총액 업데이트
   */
  async updateReceiptTotalAmount(receiptId: string, totalAmount: number) {
    return await prisma.receipt.update({
      where: { receipt_id: receiptId },
      data: { total_amount: totalAmount }
    });
  }

  /**
   * cart_ids로 cart 조회 (옵션 포함)
   */
  async findCartsByIds(cartIds: string[], userId: string) {
    return await prisma.cart.findMany({
      where: {
        cart_id: { in: cartIds },
        user_id: userId
      },
      include: {
        cart_option: {
          include: {
            option_item: {
              include: {
                option_group: {
                  include: {
                    item: true
                  }
                }
              }
            }
          }
        }
      }
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
   * 여러 주문 상태를 배치로 업데이트
   */
  async updateOrdersStatus(orderIds: string[], status: order_status_enum) {
    if (orderIds.length === 0) {
      return { count: 0 };
    }
    return await prisma.order.updateMany({
      where: { order_id: { in: orderIds } },
      data: { status }
    });
  }

  /**
   * 영수증 업데이트
   */
  async updateReceipt(
    receiptId: string,
    data: {
      payment_status?: string;
      payment_method?: string;
      payment_gateway?: string;
      transaction?: string | null;
      approved_at?: Date | null;
      delivery_postal_code?: string | null;
      delivery_address?: string | null;
      delivery_address_detail?: string | null;
      delivery_recipient_name?: string | null;
      delivery_phone?: string | null;
      delivery_address_name?: string | null;
    }
  ) {
    return await prisma.receipt.update({
      where: { receipt_id: receiptId },
      data
    });
  }

  /**
   * 장바구니 아이템 삭제 (item_id 기준)
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
   * 장바구니 아이템 삭제 (cart_id 배열 기준)
   */
  async deleteCartsByIds(cartIds: string[]) {
    if (!cartIds || cartIds.length === 0) {
      return { count: 0 };
    }
    return await prisma.cart.deleteMany({
      where: { cart_id: { in: cartIds } }
    });
  }

  /**
   * order_id로 receipt 조회 (order.receipt_id 사용)
   */
  async findReceiptByOrderId(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { order_id: orderId },
      select: { receipt_id: true }
    });

    if (!order) {
      return null;
    }

    return await prisma.receipt.findUnique({
      where: { receipt_id: order.receipt_id! }
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

  /**
   * 주문 건에 대한 리뷰 작성
   */
  async createReview(createReviewInput: CreateReviewInput) {
    return await prisma.review.create({
      data: {
        order_id: createReviewInput.orderId,
        user_id: createReviewInput.userId,
        owner_id: createReviewInput.ownerId,
        star: createReviewInput.star,
        content: createReviewInput.content,
        review_photo: {
          createMany: {
            data: createReviewInput.photos.map((photo) => ({
              content: photo
            }))
          }
        }
      },
      include: {
        review_photo: true
      }
    });
  }

  /**
   * 주문 건에 대한 리뷰 조회
   */
  async findReviewByOrderId(orderId: string): Promise<boolean> {
    const review = await prisma.review.findFirst({
      where: {
        order_id: orderId
      },
      select: {
        review_id: true
      }
    });
    return !!review;
  }
}
