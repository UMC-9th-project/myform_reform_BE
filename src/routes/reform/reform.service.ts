import { S3 } from '../../config/s3.js';
import { ReformFilter } from './dto/reform.req.dto.js';
import {
  ReformHomeResponse,
  ReformProposalResponseDto,
  ReformRequestResponseDto
} from './dto/reform.res.dto.js';
import { ReformError } from './reform.error.js';
import {
  ReformRequestFactory,
  ReformProposalFactory,
  ReformRequestCreate,
  ReformDetailRequestResponse,
  ReformRequestUpdate
} from './reform.model.js';
import { ReformRepository } from './reform.repository.js';
import { addSearchSyncJob } from '../../worker/search.queue.js';
import { CustomJwt } from '../../@types/expreees.js';

export class ReformService {
  private reformRepository: ReformRepository;
  private s3: S3;
  constructor() {
    this.reformRepository = new ReformRepository();
    this.s3 = new S3();
  }

  async selectHomeReform(): Promise<ReformHomeResponse> {
    try {
      const [requestData, proposalData] = await Promise.all([
        this.reformRepository.selectRequestLatest(),
        this.reformRepository.selectProposalLatest()
      ]);
      const requests = requestData.map((o) =>
        ReformRequestFactory.createFromRaw(o).toDto()
      );
      const proposals = proposalData.map((o) =>
        ReformProposalFactory.createFromRaw(o).toDto()
      );

      return { requests, proposals };
    } catch (err: any) {
      console.error(err);
      throw new ReformError('조회중 에러가 발생했습니다.');
    }
  }

  async getRequest(
    filter: ReformFilter
  ): Promise<ReformRequestResponseDto[] | null> {
    try {
      const categoryId = await this.reformRepository.getCategoryIds(
        filter.category
      );
      if (filter.sortBy === 'RECENT') {
        const ans = await this.reformRepository.getRequestByRecent(
          filter,
          categoryId
        );
        const dto = ans.map((o) => ReformRequestFactory.createFromRaw(o));
        return dto.map((o) => o.toDto());
      }
      if (filter.sortBy === 'POPULAR') {
      }

      return null;
    } catch (err: any) {
      console.error(err);
      throw new ReformError('요청서 조회중 에러가 발생했습니다.');
    }
  }

  async addRequest(dto: ReformRequestCreate): Promise<string> {
    try {
      const data = dto.toCreateData();
      if (data.title.length > 40)
        throw new ReformError('제목은 40자를 넘길 수 없습니다');

      if (data.contents.length > 1000)
        throw new ReformError('내용은 1000자를 넘길 수 없습니다');

      if (data.images.length > 10)
        throw new ReformError('이미지는 최대 10장 까지 첨부 가능합니다');

      if (data.minBudget < 0 || data.maxBudget > 999999999)
        throw new ReformError('예상 예산은 0원~999999999원 까지입니다.');

      if (data.minBudget > data.maxBudget)
        throw new ReformError('예산 범위가 잘못 설정 되었습니다.');

      const categoryId = await this.reformRepository.getCategoryIds(
        data.category
      );

      if (categoryId.length === 0)
        throw new ReformError('존재하지 않는 카테고리입니다');

      const ans = await this.reformRepository.insertRequest(dto, categoryId[0]);

      await addSearchSyncJob({
        type: 'REQUEST',
        id: ans,
        action: 'UPSERT'
      });
      return ans;
    } catch (err: any) {
      throw new ReformError(err);
    }
  }

  async findDetailRequest(
    payload: CustomJwt,
    reqeustId: string
  ): Promise<ReformDetailRequestResponse> {
    try {
      const isOwner = await this.reformRepository.checkRequestOwner(
        payload.id,
        reqeustId
      );
      const { images, body } =
        await this.reformRepository.selectDetailRequest(reqeustId);
      if (body === null || images.length === 0)
        throw new ReformError('존재하지 않는 아이템입니다.');

      const dto = ReformRequestFactory.createFromDetailRaw(
        body,
        images,
        isOwner
      );

      return dto;
    } catch (err: any) {
      throw new ReformError(err);
    }
  }

  async modifyRequest(dto: ReformRequestUpdate): Promise<string> {
    try {
      const data = dto.toUpdateData();

      // 소유자 확인
      const isOwner = await this.reformRepository.checkRequestOwner(
        data.userId,
        data.requestId
      );
      if (!isOwner)
        throw new ReformError('본인의 요청서만 수정할 수 있습니다.');

      // 유효성 검사
      if (data.title !== undefined && data.title.length > 40)
        throw new ReformError('제목은 40자를 넘길 수 없습니다');

      if (data.contents !== undefined && data.contents.length > 1000)
        throw new ReformError('내용은 1000자를 넘길 수 없습니다');

      if (data.images !== undefined && data.images.length > 10)
        throw new ReformError('이미지는 최대 10장 까지 첨부 가능합니다');

      if (data.minBudget !== undefined || data.maxBudget !== undefined) {
        const minBudget = data.minBudget ?? 0;
        const maxBudget = data.maxBudget ?? 999999999;
        if (minBudget < 0 || maxBudget > 999999999)
          throw new ReformError('예상 예산은 0원~999999999원 까지입니다.');
        if (minBudget > maxBudget)
          throw new ReformError('예산 범위가 잘못 설정 되었습니다.');
      }

      // 카테고리 ID 조회
      let categoryId: string | undefined;
      if (data.category !== undefined) {
        const categoryIds = await this.reformRepository.getCategoryIds(
          data.category
        );
        if (categoryIds.length === 0)
          throw new ReformError('존재하지 않는 카테고리입니다');
        categoryId = categoryIds[0];
      }

      const ans = await this.reformRepository.updateRequest(dto, categoryId);

      await addSearchSyncJob({
        type: 'REQUEST',
        id: ans,
        action: 'UPSERT'
      });

      return ans;
    } catch (err: any) {
      throw new ReformError(err);
    }
  }

  async getProposal(
    filter: ReformFilter
  ): Promise<ReformProposalResponseDto[] | null> {
    try {
      const categoryId = await this.reformRepository.getCategoryIds(
        filter.category
      );
      if (filter.sortBy === 'RECENT') {
        const ans = await this.reformRepository.getProposalByRecent(
          filter,
          categoryId
        );
        const dto = ans.map((o) => ReformProposalFactory.createFromRaw(o));
        return dto.map((o) => o.toDto());
      }
      if (filter.sortBy === 'POPULAR') {
      }

      return null;
    } catch (err: any) {
      console.error(err);
      throw new ReformError('제안서 조회중 에러가 발생했습니다.');
    }
  }

  // async findDetailProposal(id: string): Promise<ProposalDetailDto> {
  //   try {
  //     const ans = await this.reformRepository.findDetailProposal(id);
  //     const dto = new ProposalDetailDto(ans.body, ans.images);
  //     return dto;
  //   } catch (err: any) {
  //     console.error(err);
  //     throw new ReformError(err);
  //   }
  // }

  // async addQuoteOrder(dto: OrderQuoteDto, images: Express.Multer.File[]) {
  //   try {
  //     const image: {
  //       content: string;
  //       photo_order: number;
  //     }[] = [];
  //     for (let i = 0; i < images.length; i++) {
  //       const ans = await this.s3.uploadToS3(images[i]);
  //       const obj = {
  //         content: ans,
  //         photo_order: i + 1
  //       };
  //       image.push(obj);
  //     }

  //     dto.images = image;
  //     await this.refromModel.addQuoteOrder(dto);
  //   } catch (err: any) {
  //     throw new ReformError(err);
  //   }
  // }
}
