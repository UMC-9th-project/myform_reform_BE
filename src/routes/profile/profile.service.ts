import { ItemDto, ReformDto } from './dto/profile.dto.js';
import { ProfileRepository } from './profile.repository.js';
import { S3 } from '../../config/s3.js';
import { ItemAddError, OrderItemError } from './profile.error.js';
import { target_type_enum } from '@prisma/client';
import { SaleRequestDto } from './dto/profile.req.dto.js';
import { Sale, SaleDetail } from './profile.model.js';
import { SaleResponseDto } from './dto/profile.res.dto.js';
export class ProfileService {
  private profileRepository: ProfileRepository;
  private s3: S3;

  constructor() {
    this.profileRepository = new ProfileRepository();
    this.s3 = new S3();
  }

  async addProduct(
    mode: 'ITEM' | 'REFORM',
    dto: ItemDto | ReformDto,
    images: Express.Multer.File[]
  ) {
    try {
      const image: {
        content: string;
        photo_order: number;
      }[] = [];
      for (let i = 0; i < images.length; i++) {
        const ans = await this.s3.uploadToS3(images[i]);
        const obj = {
          content: ans,
          photo_order: i + 1
        };
        image.push(obj);
      }
      dto.images = image;
      await this.profileRepository.addProduct(mode, dto);
    } catch (err: any) {
      console.log(err);
      throw new ItemAddError(err);
    }
  }

  async getSales(dto: SaleRequestDto): Promise<Sale[]> {
    try {
      // 1. order 기본 정보 조회
      const orders = await this.profileRepository.getOrder(dto);

      // 2. target_type별로 ID 분리
      const requestIds = orders
        .filter((o) => o.target_type === 'REQUEST' && o.target_id !== null)
        .map((o) => o.target_id!);

      const proposalIds = orders
        .filter((o) => o.target_type === 'PROPOSAL' && o.target_id !== null)
        .map((o) => o.target_id!);

      // 3. batch로 title 조회 (병렬)
      const [requests, proposals] = await Promise.all([
        this.profileRepository.getRequestTitles(requestIds),
        this.profileRepository.getProposalTitles(proposalIds)
      ]);

      // 4. title Map 생성
      const titleMap = new Map<string, string | null>();
      for (const r of requests) {
        titleMap.set(r.reform_request_id, r.title);
      }
      for (const p of proposals) {
        titleMap.set(p.reform_proposal_id, p.title);
      }

      // 5. Sale 도메인 객체 생성
      return orders.map((order) => {
        const title = titleMap.get(order.target_id ?? '') ?? '';
        return Sale.create(order, title);
      });
    } catch (err: any) {
      throw new OrderItemError(err);
    }
  }

  async getSaleDetail(ownerId: string, orderId: string): Promise<SaleDetail> {
    const order = await this.profileRepository.getOrderDetail(ownerId, orderId);
    const option = await this.profileRepository.getOption(orderId);

    let title: string = '';
    switch (order.target_type) {
      case 'PROPOSAL':
        title =
          (await this.profileRepository.getProposalTitle(order.target_id!))
            ?.title ?? '';

      case 'REQUEST':
        title =
          (await this.profileRepository.getRequestTitle(order.target_id!))
            ?.title ?? '';
    }

    return SaleDetail.create(order, option, title);
  }
}
