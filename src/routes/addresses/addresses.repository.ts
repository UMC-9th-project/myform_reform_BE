import { delivery_address } from '@prisma/client';
import prisma from '../../config/prisma.config.js';
import { AddressesCreateInput, AddressesGetRequestDto } from './dto/addresses.req.dto.js'; 

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

  // 기본 주소를 해제합니다.
  async clearDefaultStatusByUserId(userId: string): Promise<void> {
    await prisma.delivery_address.updateMany({
      where: {
        user_id: userId,
        is_default: true,
      },
      data: { is_default: false },
    });
  }

  // 사용자의 주소록에 주소가 하나라도 있는지 확인합니다.
  async existsByUserId(userId: string): Promise<boolean> {
    const address = await prisma.delivery_address.count({
      where: {
        user_id: userId,
      },
    });
    return address > 0;
  }

  // 주소를 생성합니다.
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

  // 주소를 조회합니다.
  async getAddressById(addressId: string, userId: string): Promise<delivery_address | null> {
    return await prisma.delivery_address.findFirst({
      where: {
        delivery_address_id: addressId,
        user_id: userId,
      },
    });
  }

  // 주소를 삭제합니다.
  async deleteAddressById(addressId: string): Promise<void> {
    await prisma.delivery_address.delete({
      where: {
        delivery_address_id: addressId
      },
    });
  }

  // 기본 주소 상태를 업데이트합니다.
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