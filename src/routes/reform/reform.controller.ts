import {
  Body,
  Controller,
  Delete,
  Example,
  Get,
  Patch,
  Path,
  Post,
  Query,
  Request,
  Response,
  Route,
  Security,
  SuccessResponse,
  Tags
} from 'tsoa';
import { ReformService } from './reform.service.js';

import {
  ErrorResponse,
  ResponseHandler,
  TsoaResponse
} from '../../config/tsoaResponse.js';
import { Request as ExRequest } from 'express';
import {
  ModifyProposalRequest,
  ModifyRequestRequest,
  ReformRequestRequest,
  ReformFilter,
  ReformQuoteRequest
} from './dto/reform.req.dto.js';
import {
  ReformDetailProposalResponseDto,
  ReformDetailRequestResponseDto,
  ReformHomeResponse
} from './dto/reform.res.dto.js';
import { ReformError } from './reform.error.js';
import { CustomJwt } from '../../@types/expreees.js';
import { ReformProposalFactory, ReformRequestFactory } from './reform.model.js';

@Tags('Reform Router')
@Route('reform')
export class ReformController extends Controller {
  private reformService: ReformService;
  constructor() {
    super();
    this.reformService = new ReformService();
  }

  /**
   * 모든 리폼 요청 목록을 조회
   *
   * 주문제작 메인 페이지 진입시 보여지는 요청서 3개, 제안서 3개를 조회합니다.
   * @summary 주문제작 페이지 목록 조회
   * @return 최신순 요청서 3개, 최신순 제안서 3개
   */
  @Get('/')
  @Security('jwt_optional')
  @SuccessResponse(200, '조회 성공')
  @Response<ErrorResponse>(500, '데이터베이스 오류')
  public async findAll(
    @Request() req: ExRequest
  ): Promise<TsoaResponse<ReformHomeResponse>> {
    const payload = req.user ?? null;
    const ans = await this.reformService.selectHomeReform(payload);
    return new ResponseHandler(ans);
  }

  /**
   * @summary 요청서 목록을 보여줍니다.
   * @param sortBy 정렬 기준
   * @param page 현재 페이지, 기본값 1
   * @param limit 보여줄 최대 아이템 갯수 기본값 15
   * @param category 카테고리 대분류
   * @param subcategory 카테고리 소분류
   */
  @Get('/request')
  async getRequest(
    @Query() sortBy: 'RECENT' | 'POPULAR',
    @Query() page: number = 1,
    @Query() limit: number = 15,
    @Query() category?: string,
    @Query() subcategory?: string
  ) {
    const dto = new ReformFilter(sortBy, page, limit, category, subcategory);
    const ans = await this.reformService.getRequest(dto);
    return new ResponseHandler(ans);
  }

  /**
   *
   *
   * @summary 새로운 리폼요청서를 작성합니다
   * @returns 생성 성공 메시지
   */
  @Post('/request')
  @Security('jwt')
  @SuccessResponse(200, '생성 성공')
  public async addRequest(
    @Body() body: ReformRequestRequest,
    @Request() req: ExRequest
  ): Promise<TsoaResponse<string>> {
    const payload = req.user;
    if (payload.role !== 'user')
      throw new ReformError('일반 유저만 요청서를 작성 할 수 있습니다.');

    const userId = req.user.id;
    const dto = ReformRequestFactory.createFromRequest(body, userId);
    const ans = await this.reformService.addRequest(dto);
    return new ResponseHandler(ans);
  }

  /**
   * @summary 특정 리폼요청서의 상세 정보를 조회합니다.
   * @param id 리폼 요청 ID (UUID)
   * @returns 리폼 요청 상세 정보
   */
  @Get('/request/:id')
  @Security('jwt_optional')
  @Example<ReformDetailRequestResponseDto>({
    isOwner: true,
    reformRequestId: 'bb1a025b-2b3e-4218-85a0-454c05de22ce',
    dueDate: new Date(),
    title:
      '제 소중한 기아 쿠로미 유니폼 짐색으로 만들어주실 리폼 장인을 찾아요',
    content: 'string',
    minBudget: 0,
    maxBudget: 50000,
    name: '홍길동',
    profile: '',
    images: [
      {
        photo: 'https://image.png',
        photo_order: 1
      }
    ]
  })
  @SuccessResponse(200, '조회 성공')
  public async findDetailRequest(
    @Path() id: string,
    @Request() req: ExRequest
  ): Promise<TsoaResponse<ReformDetailRequestResponseDto>> {
    const payload = req.user ?? null;
    const ans = (
      await this.reformService.findDetailRequest(payload, id)
    ).toDto();
    return new ResponseHandler(ans);
  }

  /**
   * @summary 특정 리폼 요청을 수정합니다.
   * @param id 리폼 요청 ID (UUID)
   * @param body 수정할 데이터
   * @returns 수정된 리폼 요청 ID
   */
  @Patch('/request/:id')
  @Security('jwt')
  @SuccessResponse(200, '수정 성공')
  public async modifyRequest(
    @Path() id: string,
    @Body() body: ModifyRequestRequest,
    @Request() req: ExRequest
  ): Promise<TsoaResponse<string>> {
    const payload = req.user;
    if (payload.role !== 'user')
      throw new ReformError('일반 유저만 요청서를 수정할 수 있습니다.');

    const userId = req.user.id;
    const dto = ReformRequestFactory.createFromModifyRequest(body, id, userId);
    const ans = await this.reformService.modifyRequest(dto);
    return new ResponseHandler(ans);
  }

  /**
   * @summary 특정 리폼 요청을 삭제합니다.
   * @param id 삭제하려는 리폼 요청글 ID (UUID)
   * @returns 리폼 요청 삭제 성공 여부
   */
  @Delete('/request/:id')
  @Security('jwt')
  @SuccessResponse(200, '삭제 성공')
  public async deleteRequest(
    @Path() id: string,
    @Request() req: ExRequest
  ): Promise<TsoaResponse<string>> {
    const payload = req.user;
    const userId = payload.id;
    const ans = await this.reformService.deleteRequest(id, userId);
    return new ResponseHandler(ans);
  }

  /**
   * @summary 제안서 목록을 보여줍니다.
   * @param sortBy 정렬 기준
   * @param page 현재 페이지, 기본값 1
   * @param limit 보여줄 최대 아이템 갯수 기본값 15
   * @param category 카테고리 대분류
   * @param subcategory 카테고리 소분류
   */
  @Get('/proposal')
  @Security('jwt_optional')
  async getProposal(
    @Request() req: ExRequest,
    @Query() sortBy: 'RECENT' | 'POPULAR',
    @Query() page: number = 1,
    @Query() limit: number = 15,
    @Query() category?: string,
    @Query() subcategory?: string
  ) {
    const payload = req.user ?? null;
    const dto = new ReformFilter(sortBy, page, limit, category, subcategory);
    const ans = await this.reformService.getProposal(dto, payload);
    return new ResponseHandler(ans);
  }

  /**
   * @summary 특정 리폼제안서의 상세 정보를 조회합니다.
   * @param id 제안 ID (UUID)
   * @returns 제안 상세 정보
   */
  @Get('/proposal/:id')
  @Security('jwt_optional')
  @SuccessResponse(200, '조회 성공')
  public async findDetailProposal(
    @Path() id: string,
    @Request() req: ExRequest
  ): Promise<TsoaResponse<ReformDetailProposalResponseDto>> {
    const payload = req.user ?? null;

    const ans = (
      await this.reformService.findDetailProposal(payload, id)
    ).toDto();
    return new ResponseHandler(ans);
  }

  /**
   * @summary 특정 제안서를 수정합니다.
   * @param id 제안 ID (UUID)
   * @param body 수정할 데이터
   * @returns 수정된 제안서 ID
   */
  @Patch('/proposal/:id')
  @Security('jwt')
  @SuccessResponse(200, '수정 성공')
  public async modifyProposal(
    @Path() id: string,
    @Body() body: ModifyProposalRequest,
    @Request() req: ExRequest
  ): Promise<TsoaResponse<string>> {
    const payload = req.user;
    if (payload.role !== 'reformer')
      throw new ReformError('리폼러만 제안서를 수정할 수 있습니다.');

    const ownerId = req.user.id;
    const dto = ReformProposalFactory.createFromModifyRequest(
      body,
      id,
      ownerId
    );
    const ans = await this.reformService.modifyProposal(dto);
    return new ResponseHandler(ans);
  }

  /**
   * @summary 요청서를 바탕으로 새로운 견적서를 생성합니다.
   * @param body 견적서
   * @returns 생성된 견적서 UUID
   */
  @Post('/quote')
  @Security('jwt')
  @SuccessResponse(200, '생성 성공')
  public async addQuote(
    @Request() req: ExRequest,
    @Body() body: ReformQuoteRequest
  ): Promise<TsoaResponse<{ order_id: string }>> {
    const payload = req.user;
    if (payload.role !== 'reformer')
      throw new ReformError('리폼러만 견적서를 작성 할 수 있습니다');

    const ownerId = req.user.id;

    const ans = await this.reformService.addReformQuote(body, ownerId);
    return new ResponseHandler(ans);
  }
}
