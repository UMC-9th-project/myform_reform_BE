import { delivery_address, PrismaClient } from '@prisma/client';
import prisma from '../../config/prisma.config.js';
import { AddressesRequestDto } from './dto/addresses.req.dto.js';

export class AddressesRepository {
  private prisma: PrismaClient;
  constructor() {
    this.prisma = prisma;
  }
  async getAddresses(dto: AddressesRequestDto): Promise<delivery_address[]> {
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
}