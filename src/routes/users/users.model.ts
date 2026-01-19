import prisma from '../../config/prisma.config.js';
import { UpdateReformerStatusRequest, UpdateReformerStatusResponse } from './users.dto.js';

export class UsersModel {
  private prisma;

  constructor() {
    this.prisma = prisma;
  }

  async updateReformerStatus(reformerId: string, requestBody: UpdateReformerStatusRequest): Promise<UpdateReformerStatusResponse> {
    const { status } = requestBody;
    const reformer = await this.prisma.owner.update({
      where: { owner_id: reformerId },
      data: { status: status }
    });
    return {
      user: {
        id: reformer.owner_id,
        email: reformer.email as string,
        nickname: reformer.nickname as string,
        role: 'reformer',
        auth_status: reformer.status
      }
    } as UpdateReformerStatusResponse;
  }
}