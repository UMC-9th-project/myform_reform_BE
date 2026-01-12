import prisma from '../../config/prisma.config.js';
import { ReformRequestDto } from './reform.dto.js';

export class ReformModel {
  private prisma;
  constructor() {
    this.prisma = prisma;
  }
  async addRequest(dto: ReformRequestDto): Promise<void> {
    const { userId, images, category, ...data } = dto;
    await this.prisma.$transaction(async (tx) => {
      const categorydata = await tx.category.findFirst({
        where: { name: category.sub },
        select: { category_id: true }
      });
      const ans = await tx.reform_request.create({
        data: {
          user_id: userId,
          title: data.title,
          content: data.contents,
          min_budget: data.minBudget,
          max_budget: data.maxBudget,
          due_date: data.dueDate,
          category_id: categorydata!.category_id
        }
      });
      for (const img of images) {
        await tx.reform_request_photo.create({
          data: {
            reform_request_id: ans.reform_request_id,
            content: img
          }
        });
      }
    });
  }
}
