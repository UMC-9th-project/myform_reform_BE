import { delivery_address, PrismaClient } from '@prisma/client';
import prisma from '../../config/prisma.config.js';
import { AddressesCreateInput, AddressesDeleteInput, AddressesGetRequestDto } from './dto/addresses.req.dto.js'; 
import { Prisma } from '@prisma/client';
import { AddressNotFoundError } from './addresses.error.js';

export class AddressesRepository {
  // 주소 목록을 조회합니다. 기본 주소가 상단에 오도록 정렬합니다.
  
  async getAddresses(dto: AddressesGetRequestDto): Promise<delivery_address[]> {
    const { userId, page, limit, createdAtOrder } = dto;

    return await prisma.delivery_address.findMany({
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
  }

  // 주소를 생성합니다. Service에서 runInTransaction 사용하여 트랜잭션 처리
  // 기본 주소 설정 시 기존 기본 주소가 해제됩니다. 
  // 또한, 기본 주소가 없는 경우 첫 주소를 기본 주소로 설정합니다.

  async clearDefaultStatusByUserId(userId: string): Promise<void> {
    await prisma.delivery_address.updateMany({
      where: {
        user_id: userId,
        is_default: true,
      },
      data: { is_default: false },
    });
  }

  async existsByUserId(userId: string): Promise<boolean> {
    const address = await prisma.delivery_address.count({
      where: {
        user_id: userId,
      },
    });
    return address > 0;
  }

  async saveAddress(input: AddressesCreateInput): Promise<delivery_address> {
    const { userId, postalCode, address, addressDetail, addressName, recipient, phone, isDefault } = input;
    return await prisma.delivery_address.create({
      data: {
        user_id: userId,
        owner_id: "df593cd1-dbc7-45a1-be4e-84e3220bf231",
        postal_code: postalCode,
        address: address,
        address_detail: addressDetail,
        is_default: isDefault,
        address_name: addressName,
        recipient: recipient,
        phone: phone,
      },
    });
  }

  async getAddressById(addressId: string): Promise<delivery_address | null> {
    return await prisma.delivery_address.findUnique({
      where: {
        delivery_address_id: addressId,
      },
    });
  }

  async deleteAddressById(addressId: string): Promise<void> {
    await prisma.delivery_address.delete({
      where: {
        delivery_address_id: addressId,
      },
    });
  }

  async updateDefaultStatusByUserId(addressId: string, isDefault: boolean): Promise<void> {
    await prisma.delivery_address.update({
      where: {
        delivery_address_id: addressId,
      },
      data: { is_default: isDefault },
    });
  }

  async getNextDefaultAddress(userId: string): Promise<delivery_address | null> {
    const nextDefaultAddress = await prisma.delivery_address.findFirst({
      where: {
        user_id: userId,
      },
      orderBy: {
        created_at: 'asc',
      },
    });
    return nextDefaultAddress;
  }
}