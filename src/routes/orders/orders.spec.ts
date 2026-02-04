/**
 * Order 변경사항 검증 스펙
 * - 주문서/주문 응답 구조 (receipt_number, seller_groups, delivery_address.recipient_name 등)
 * - 배송지 필수값 검증 (수령인, 연락처)
 * - OrdersService getOrderSheet 검증/성공 시나리오
 */
jest.mock('nanoid', () => ({
  customAlphabet: () => () => '123456789012'
}));

import type {
  OrderSheetResponse,
  OrderResponse,
  DeliveryAddressInfo,
  OrderSheetSellerGroup,
  OrderItemInfo
} from './orders.model.js';
import { OrdersService } from './orders.service.js';
import { OrderError, ItemNotFoundError } from './orders.error.js';

describe('orders.model / DTO shape', () => {
  describe('OrderSheetResponse', () => {
    it('receipt_number, delivery_fee, seller_groups, delivery_address 필드 존재', () => {
      const sample: OrderSheetResponse = {
        receipt_number: '481025937412',
        delivery_fee: 3000,
        delivery_address: {
          postal_code: '12345',
          address: '서울시 강남구',
          address_detail: '101동',
          recipient_name: '홍길동',
          phone: '010-1234-5678',
          address_name: '집'
        },
        payment: {
          product_amount: 50000,
          delivery_fee: 3000,
          total_amount: 53000
        },
        seller_groups: [
          {
            owner_id: 'owner-uuid',
            reformer_nickname: '리포머',
            items: [
              {
                reformer_nickname: '리포머',
                thumbnail: 'https://',
                title: '상품명',
                selected_options: ['옵션1'],
                quantity: 1,
                price: 50000
              }
            ],
            delivery_fee: 3000
          }
        ]
      };
      expect(sample.receipt_number).toBeDefined();
      expect(sample.delivery_fee).toBeDefined();
      expect(sample.seller_groups).toHaveLength(1);
      expect(sample.seller_groups[0].items[0]).toHaveProperty('quantity');
      expect(sample.seller_groups[0].items[0]).toHaveProperty('price');
      expect(sample.delivery_address).toMatchObject({
        recipient_name: '홍길동',
        phone: '010-1234-5678',
        address_name: '집'
      });
    });
  });

  describe('DeliveryAddressInfo', () => {
    it('recipient_name, phone, address_name 필드 포함', () => {
      const addr: DeliveryAddressInfo = {
        postal_code: '12345',
        address: '주소',
        address_detail: '상세',
        recipient_name: '수령인',
        phone: '010-0000-0000',
        address_name: '배송지명'
      };
      expect(addr.recipient_name).toBe('수령인');
      expect(addr.phone).toBe('010-0000-0000');
      expect(addr.address_name).toBe('배송지명');
    });
  });

  describe('OrderResponse / GetOrderResponseDto', () => {
    it('receipt_number, product_amount, delivery_fee 및 order_items 내 quantity, price 포함', () => {
      const sample: OrderResponse = {
        order_id: 'order-uuid',
        receipt_number: '481025937412',
        status: 'DONE',
        delivery_address: {
          postal_code: '12345',
          address: '주소',
          address_detail: null,
          recipient_name: '수령인',
          phone: '010-1234-5678',
          address_name: null
        },
        first_item: {
          thumbnail: '',
          title: '상품',
          selected_options: [],
          reformer_nickname: '리포머',
          quantity: 2,
          price: 10000
        },
        remaining_items_count: 0,
        order_items: [],
        payment: {
          amount: 23000,
          payment_method: 'card',
          card_name: null,
          masked_card_number: null,
          card_info: null,
          approved_at: null
        },
        total_amount: 23000,
        product_amount: 20000,
        delivery_fee: 3000
      };
      expect(sample.receipt_number).toBeDefined();
      expect(sample.product_amount).toBe(20000);
      expect(sample.delivery_fee).toBe(3000);
      expect(sample.first_item?.quantity).toBe(2);
      expect(sample.first_item?.price).toBe(10000);
      expect(sample.delivery_address.recipient_name).toBe('수령인');
      expect(sample.delivery_address.phone).toBe('010-1234-5678');
    });
  });
});

describe('OrdersService getOrderSheet validation', () => {
  const mockRepo = {
    findItemWithOptionGroups: jest.fn(),
    findOptionItemsByIds: jest.fn(),
    findReceiptByReceiptNumber: jest.fn().mockResolvedValue(null)
  };
  const service = new OrdersService(mockRepo as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lines 비어 있으면 OrderError', async () => {
    await expect(
      service.getOrderSheet('item-uuid', [], 'user-uuid')
    ).rejects.toThrow(OrderError);
    expect(mockRepo.findItemWithOptionGroups).not.toHaveBeenCalled();
  });

  it('new_address 있는데 recipient_name 없으면 OrderError', async () => {
    await expect(
      service.getOrderSheet(
        'item-uuid',
        [{ option_item_ids: [], quantity: 1 }],
        'user-uuid',
        undefined,
        {
          postal_code: '12345',
          address: '서울시 강남구',
          phone: '010-1234-5678'
          // recipient_name 없음
        }
      )
    ).rejects.toThrow(OrderError);
    expect(mockRepo.findItemWithOptionGroups).not.toHaveBeenCalled();
  });

  it('new_address 있는데 phone 없으면 OrderError', async () => {
    await expect(
      service.getOrderSheet(
        'item-uuid',
        [{ option_item_ids: [], quantity: 1 }],
        'user-uuid',
        undefined,
        {
          postal_code: '12345',
          address: '서울시 강남구',
          recipient_name: '홍길동'
          // phone 없음
        }
      )
    ).rejects.toThrow(OrderError);
    expect(mockRepo.findItemWithOptionGroups).not.toHaveBeenCalled();
  });

  it('new_address 있는데 postal_code/address 없으면 OrderError', async () => {
    await expect(
      service.getOrderSheet(
        'item-uuid',
        [{ option_item_ids: [], quantity: 1 }],
        'user-uuid',
        undefined,
        {
          recipient_name: '홍길동',
          phone: '010-1234-5678'
          // postal_code, address 없음
        }
      )
    ).rejects.toThrow(OrderError);
  });
});

describe('OrdersService getOrderSheet success shape', () => {
  const itemId = 'item-uuid';
  const userId = 'user-uuid';
  const lines = [{ option_item_ids: ['opt-1'], quantity: 1 }];

  const mockItem = {
    item_id: itemId,
    price: 10000,
    delivery: 3000,
    owner_id: 'owner-uuid',
    owner: { nickname: '테스트리포머' },
    item_photo: [{ content: 'https://thumbnail', photo_order: 1 }],
    title: '테스트 상품'
  };

  const mockOptionItems = [
    {
      option_item_id: 'opt-1',
      extra_price: 0,
      name: '옵션A',
      quantity: 10,
      option_group: { option_group_id: 'og-1', item_id: itemId, name: '색상' }
    }
  ];

  const mockRepo = {
    findItemWithOptionGroups: jest.fn().mockResolvedValue(mockItem),
    findOptionItemsByIds: jest.fn().mockResolvedValue(mockOptionItems),
    findReceiptByReceiptNumber: jest.fn().mockResolvedValue(null)
  };

  const service = new OrdersService(mockRepo as any);

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo.findItemWithOptionGroups.mockResolvedValue(mockItem);
    mockRepo.findOptionItemsByIds.mockResolvedValue(mockOptionItems);
    mockRepo.findReceiptByReceiptNumber.mockResolvedValue(null);
  });

  it('반환값에 receipt_number, delivery_fee, seller_groups, delivery_address(recipient_name, phone) 포함', async () => {
    const result = await service.getOrderSheet(
      itemId,
      lines,
      userId,
      undefined,
      {
        postal_code: '12345',
        address: '서울시 강남구',
        address_detail: '101동',
        recipient_name: '홍길동',
        phone: '010-1234-5678',
        address_name: '집'
      }
    );

    expect(result).toHaveProperty('receipt_number');
    expect(typeof result.receipt_number).toBe('string');
    expect(result.receipt_number.length).toBe(12);
    expect(result).toHaveProperty('delivery_fee', 3000);
    expect(result).toHaveProperty('seller_groups');
    expect(Array.isArray(result.seller_groups)).toBe(true);
    expect(result.seller_groups.length).toBeGreaterThan(0);
    expect(result.seller_groups[0]).toHaveProperty('owner_id', 'owner-uuid');
    expect(result.seller_groups[0]).toHaveProperty('reformer_nickname');
    expect(result.seller_groups[0]).toHaveProperty('items');
    expect(result.seller_groups[0]).toHaveProperty('delivery_fee');
    expect(result.seller_groups[0].items[0]).toMatchObject({
      quantity: 1,
      price: 10000
    });

    expect(result.delivery_address).not.toBeNull();
    expect(result.delivery_address).toMatchObject({
      postal_code: '12345',
      address: '서울시 강남구',
      address_detail: '101동',
      recipient_name: '홍길동',
      phone: '010-1234-5678',
      address_name: '집'
    });

    expect(result.payment).toMatchObject({
      product_amount: 10000,
      delivery_fee: 3000,
      total_amount: 13000
    });
  });

  it('존재하지 않는 item_id면 ItemNotFoundError', async () => {
    mockRepo.findItemWithOptionGroups.mockResolvedValue(null);
    await expect(
      service.getOrderSheet(itemId, lines, userId)
    ).rejects.toThrow(ItemNotFoundError);
  });
});
