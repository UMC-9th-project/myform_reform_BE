import { S3 } from '../../config/s3.js';
import { ReformFilter, ReformQuoteRequest } from './dto/reform.req.dto.js';
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
  ReformDetailProposalResponse,
  ReformRequestUpdate,
  ReformProposalUpdate,
  ReformQuoteFactory
} from './reform.model.js';
import { ReformRepository } from './reform.repository.js';
import { addSearchSyncJob } from '../../worker/search.queue.js';
import { CustomJwt } from '../../@types/expreees.js';
import { runInThisContext } from 'vm';
import { runInTransaction } from '../../config/prisma.config.js';

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
        const dto = ans.map((o) => ReformRequestFactory.createFromRaw(o)).map((o) => o.toDto());
        const ids = dto.map((d) => d.reformRequestId);
        const paidIds = await this.reformRepository.findPaidOrderTargetIds('REQUEST', ids);
        return dto.map((d) => ({ ...d, isCompleted: paidIds.has(d.reformRequestId) }));
      }
      if (filter.sortBy === 'POPULAR') {
        const ans = await this.reformRepository.getRequestByPopular(
          filter,
          categoryId
        );
        const dto = ans.map((o) => ReformRequestFactory.createFromRaw(o)).map((o) => o.toDto());
        const ids = dto.map((d) => d.reformRequestId);
        const paidIds = await this.reformRepository.findPaidOrderTargetIds('REQUEST', ids);
        return dto.map((d) => ({ ...d, isCompleted: paidIds.has(d.reformRequestId) }));
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
    payload: CustomJwt | null,
    requestId: string
  ): Promise<ReformDetailRequestResponse> {
    try {
      let isOwner = false;
      if (payload !== null) {
        isOwner = await this.reformRepository.checkRequestOwner(
          payload.id,
          requestId
        );
      }

      const { images, body } =
        await this.reformRepository.selectDetailRequest(requestId);
      if (body === null) throw new ReformError('존재하지 않는 아이템입니다.');

      const dto = ReformRequestFactory.createFromDetailRaw(
        body,
        images,
        isOwner
      );
      const paidIds = await this.reformRepository.findPaidOrderTargetIds('REQUEST', [requestId]);
      return {
        toDto: () => ({ ...dto.toDto(), isCompleted: paidIds.has(requestId) })
      } as ReformDetailRequestResponse;
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
        const dto = ans.map((o) => ReformProposalFactory.createFromRaw(o)).map((o) => o.toDto());
        const ids = dto.map((d) => d.reformProposalId);
        const paidIds = await this.reformRepository.findPaidOrderTargetIds('PROPOSAL', ids);
        return dto.map((d) => ({ ...d, isCompleted: paidIds.has(d.reformProposalId) }));
      }
      if (filter.sortBy === 'POPULAR') {
        const ans = await this.reformRepository.getProposalByPopular(
          filter,
          categoryId
        );
        const dto = ans.map((o) => ReformProposalFactory.createFromRaw(o)).map((o) => o.toDto());
        const ids = dto.map((d) => d.reformProposalId);
        const paidIds = await this.reformRepository.findPaidOrderTargetIds('PROPOSAL', ids);
        return dto.map((d) => ({ ...d, isCompleted: paidIds.has(d.reformProposalId) }));
      }

      return null;
    } catch (err: any) {
      console.error(err);
      throw new ReformError('제안서 조회중 에러가 발생했습니다.');
    }
  }

  async findDetailProposal(
    payload: CustomJwt | null,
    proposalId: string
  ): Promise<ReformDetailProposalResponse> {
    try {
      let isOwner = false;
      if (payload !== null) {
        isOwner = await this.reformRepository.checkProposalOwner(
          payload.id,
          proposalId
        );
      }
      const { images, body } =
        await this.reformRepository.selectDetailProposal(proposalId);
      if (body === null) throw new ReformError('존재하지 않는 제안서입니다.');

      const dto = ReformProposalFactory.createFromDetailRaw(
        body,
        images,
        isOwner
      );
      const paidIds = await this.reformRepository.findPaidOrderTargetIds('PROPOSAL', [proposalId]);
      return {
        toDto: () => ({ ...dto.toDto(), isCompleted: paidIds.has(proposalId) })
      } as ReformDetailProposalResponse;
    } catch (err: any) {
      throw new ReformError(err);
    }
  }

  async modifyProposal(dto: ReformProposalUpdate): Promise<string> {
    try {
      const data = dto.toUpdateData();

      // 소유자 확인
      const isOwner = await this.reformRepository.checkProposalOwner(
        data.ownerId,
        data.proposalId
      );
      if (!isOwner)
        throw new ReformError('본인의 제안서만 수정할 수 있습니다.');

      // 유효성 검사
      if (data.title !== undefined && data.title.length > 40)
        throw new ReformError('제목은 40자를 넘길 수 없습니다');

      if (data.contents !== undefined && data.contents.length > 1000)
        throw new ReformError('내용은 1000자를 넘길 수 없습니다');

      if (data.images !== undefined && data.images.length > 10)
        throw new ReformError('이미지는 최대 10장 까지 첨부 가능합니다');

      if (
        data.price !== undefined &&
        (data.price < 0 || data.price > 999999999)
      )
        throw new ReformError('가격은 0원~999999999원 까지입니다.');

      if (
        data.delivery !== undefined &&
        (data.delivery < 0 || data.delivery > 999999999)
      )
        throw new ReformError('배송비는 0원~999999999원 까지입니다.');

      if (
        data.expectedWorking !== undefined &&
        (data.expectedWorking < 0 || data.expectedWorking > 365)
      )
        throw new ReformError('예상 작업일은 0일~365일 까지입니다.');

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

      const ans = await this.reformRepository.updateProposal(dto, categoryId);

      await addSearchSyncJob({
        type: 'PROPOSAL',
        id: ans,
        action: 'UPSERT'
      });

      return ans;
    } catch (err: any) {
      throw new ReformError(err);
    }
  }

  async addReformQuote(data: ReformQuoteRequest, ownerId: string) {
    try {
      return await runInTransaction(async () => {
        const check = await this.reformRepository.selectReformRequestUser(
          data.targetId
        );

        if (check === null)
          throw new ReformError('요청서가 존재하지 않습니다.');

        if (data.contents !== undefined && data.contents.length > 1000)
          throw new ReformError('내용은 1000자를 넘길 수 없습니다');

        if (data.images !== undefined && data.images.length > 10)
          throw new ReformError('이미지는 최대 10장 까지 첨부 가능합니다');

        if (
          data.price !== undefined &&
          (data.price < 0 || data.price > 999999999)
        )
          throw new ReformError('가격은 0원~999999999원 까지입니다.');

        if (
          data.delivery !== undefined &&
          (data.delivery < 0 || data.delivery > 999999999)
        )
          throw new ReformError('배송비는 0원~999999999원 까지입니다.');

        if (
          data.expectedWorking !== undefined &&
          (data.expectedWorking < 0 || data.expectedWorking > 365)
        )
          throw new ReformError('예상 작업일은 0일~365일 까지입니다.');

        const userId = check.user_id;
        const dto = ReformQuoteFactory.create(data, userId, ownerId);
        const ans = await this.reformRepository.insertReformQuote(dto);

        if (ans === null) throw new ReformError('생성중 오류가 발생했습니다.');
        await this.reformRepository.insertReformQuotePhoto(dto, ans.order_id);

        return ans;
      });
    } catch (err: any) {
      throw new ReformError(err);
    }
  }
}
