import { ProfileRepository } from './profile.repository.js';
import {
  CategoryNotExist,
  ItemAddError,
  OrderItemError
} from './profile.error.js';
import { SaleRequestDto } from './dto/profile.req.dto.js';
import {
  Item,
  ItemDto,
  Reform,
  ReformDto,
  Sale,
  SaleDetail
} from './profile.model.js';

export class ProfileService {
  private profileRepository: ProfileRepository;

  constructor() {
    this.profileRepository = new ProfileRepository();
  }

  async addProduct(mode: 'ITEM' | 'REFORM', dto: Item | Reform) {
    try {
      const data = dto.toDto();
      const category = await this.profileRepository.getCategory(data);
      if (category === null) {
        throw new CategoryNotExist('카테고리가 없습니다');
      }
      const categoryId = category.category_id;

      switch (mode) {
        case 'ITEM': {
          const itemDto = data as ItemDto;
          const item = await this.profileRepository.addItem(
            itemDto,
            categoryId
          );
          if (itemDto.option && itemDto.option.length > 0) {
            await this.profileRepository.addOption(
              item.item_id,
              itemDto.option
            );
          }
          break;
        }
        case 'REFORM':
          await this.profileRepository.addReform(data as ReformDto, categoryId);
          break;
      }
    } catch (err: any) {
      console.log(err);
      throw new Error(err);
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
        break;

      case 'REQUEST':
        title =
          (await this.profileRepository.getRequestTitle(order.target_id!))
            ?.title ?? '';
        break;
    }

    return SaleDetail.create(order, option, title);
  }
}
