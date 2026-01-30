import { delivery_address, PrismaClient } from '@prisma/client';
import prisma from '../../config/prisma.config.js';
import { AddressesCreateInput, AddressesDeleteInput, AddressesGetRequestDto } from './dto/addresses.req.dto.js'; 
import { AddressNotFoundError } from './addresses.error.js';

export class AddressesRepository {
  private prisma: PrismaClient;
  constructor() {
    this.prisma = prisma;
  }
  // 주소 목록을 조회합니다. 기본 주소가 상단에 오도록 정렬합니다.
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
  // 기본 주소 설정 시 기존 기본 주소가 해제됩니다. 
  // 또한, 기본 주소가 없는 경우 첫 주소를 기본 주소로 설정합니다.
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
        // 수정 필요!! owner_id가 not null로 되어 있으나, 불필요함 -> 수정 필요 
        // but, order 부분에서 사용중이므로 수정하면 빌드에서 오류가 남
        // 일단 임시로 master 계정 uuid로 대체
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
    return newAddress;
  }

  // 주소를 삭제합니다. 기본 주소가 삭제되면 가장 오래된 주소를 기본 주소로 설정합니다.
  async deleteAddress(input: AddressesDeleteInput): Promise<void> {
    const { userId, addressId } = input;
    const targetAddress = await this.prisma.delivery_address.findFirst({
      where: {
        delivery_address_id: addressId,
        user_id: userId,
      },
    });

    if (!targetAddress) {
      throw new AddressNotFoundError('입력 받은 주소를 찾을 수 없습니다.');
    }

    await this.prisma.delivery_address.delete({
      where: {
        delivery_address_id: addressId,
      },
    });

    if (targetAddress.is_default) {
      const nextDefaultAddress = await this.prisma.delivery_address.findFirst({
        where: {
          user_id: userId,
        },
        orderBy: {
          created_at: 'asc',
        },
      });
      if (nextDefaultAddress) {
        await this.prisma.delivery_address.update({
          where: {
            delivery_address_id: nextDefaultAddress.delivery_address_id,
          },
          data: { is_default: true },
        });
      }
    }
  }
}