import { delivery_address, PrismaClient } from '@prisma/client';
import prisma from '../../config/prisma.config.js';
import { AddressesCreateInput, AddressesGetRequestDto } from './dto/addresses.req.dto.js';

export class AddressesRepository {
  private prisma: PrismaClient;
  constructor() {
    this.prisma = prisma;
  }
  // 주소 목록을 조회합니다.
  async getAddresses(dto: AddressesGetRequestDto): Promise<delivery_address[]> {
    const { userId, page, limit, createdAtOrder } = dto;

    const addresses = await this.prisma.delivery_address.findMany({
      where: {
        user_id: userId,
      },
      orderBy: [
        { is_default: 'desc' },
        { created_at: createdAtOrder as 'asc' | 'desc' },
      ],
      take: limit,
      skip: (page - 1) * limit,
    });
    return addresses;
  }

  // 주소를 생성합니다. Service에서 runInTransaction 사용하여 트랜잭션 처리
  async createAddress(input: AddressesCreateInput): Promise<delivery_address> {
    const { userId, postalCode, address, addressDetail, addressName, recipient, phone } = input;
    let { isDefault } = input;

    // 기본주소 설정 시 기존 기본주소 해제
    if (isDefault) {
      await this.prisma.delivery_address.updateMany({
        where: {
          user_id: userId,
        },
        data: { is_default: false },
      });
    }
    else {
      const isAddressExists = !!await this.prisma.delivery_address.findFirst({
        where: {
          user_id: userId,
        },
        select: {
          delivery_address_id: true,
        },
      });
      if (isAddressExists) {
        isDefault = true;
      }
    }

    const newAddress = await this.prisma.delivery_address.create({
      data: {
        user_id: userId,
        owner_id: "미등록",
        postal_code: postalCode,
        address: address,
        address_detail: addressDetail,
        is_default: isDefault,
        address_name: addressName,
        recipient: recipient,
        phone: phone,
      },
    });
    return newAddress;
  }
}