import {
  Controller,
  Post,
  Route,
  SuccessResponse,
  Response,
  Tags,
  Get,
  Path,
  Body,
  Query,
  Security,
  Request
} from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import { ProfileService } from './profile.service.js';
import {
  ErrorResponse,
  ResponseHandler,
  TsoaResponse,
  commonError
} from '../../config/tsoaResponse.js';
import {
  AddItemRequestDto,
  AddReformRequestDto,
  SaleRequestDto
} from './dto/profile.req.dto.js';
import {
  SaleDetailResponseDto,
  SaleResponseDto,
  ProfileInfoResponse,
  FeedListResponse,
  MarketListResponse,
  ProposalListResponse,
  ReviewListResponse
} from './dto/profile.res.dto.js';
import { Request as ExRequest } from 'express';
import { Item, Reform } from './profile.model.js';
import { ItemAddError } from './profile.error.js';
import { CustomJwt } from '../../@types/expreees.js';

@Route('profile')
@Tags('Profile Router')
export class ProfileController extends Controller {
  private profileService: ProfileService;
  constructor() {
    super();
    this.profileService = new ProfileService();
  }

  /**
   * 판매 상품 등록
   *
   * @summary 새로운 판매 상품을 등록합니다
   * @param body 판매 상품 정보
   * @returns 판매글 등록 결과
   */
  @Post('add/item')
  @Security('jwt')
  @SuccessResponse(200, '판매글 등록 성공')
  @Response<ErrorResponse>(500, '서버에러', commonError.serverError)
  public async addItem(
    @Body() body: AddItemRequestDto,
    @Request() req: ExRequest
  ): Promise<TsoaResponse<string>> {
    //TODO: JWT 로직 추가 이후 ownerID 목업 삭제
    const payload = req.user; // 자동으로 CustomJWT 타입으로 추론됨
    if (payload.role !== 'reformer') {
      throw new ItemAddError('판매자만 등록 할 수 있습니다.');
    }
    const ownerId = payload.id;
    const dto = Item.create(body, ownerId);
    await this.profileService.addProduct('ITEM', dto);

    return new ResponseHandler('판매글 등록 성공');
  }

  /**
   * 주문제작 상품 등록
   *
   * @summary 새로운 주문제작 상품을 등록합니다
   * @param body 주문제작 상품 정보
   * @returns 주문제작 등록 결과
   */
  @Post('add/reform')
  @Security('jwt')
  @SuccessResponse(200, '주문제작 등록 성공')
  @Response<ErrorResponse>(500, '서버에러', commonError.serverError)
  public async addReform(
    @Body() body: AddReformRequestDto,
    @Request() req: ExRequest
  ): Promise<TsoaResponse<string>> {
    const payload = req.user;
    if (payload.role !== 'reformer') {
      throw new ItemAddError('판매자만 등록 할 수 있습니다.');
    }
    const ownerId = payload.id;
    const dto = Reform.create(body, ownerId);
    await this.profileService.addProduct('REFORM', dto);

    return new ResponseHandler('주문제작 등록 성공');
  }

  /**
   * 판매관리 목록 조회
   * @summary 사용자의 전체 판매 상품 목록을 조회합니다
   * @returns 판매관리 목록
   * @param type 주문제작 or 판매상품 선택
   * @param page 현재 페이지
   * @param limit 한 페이지 보여줄 목록 수
   */
  @Get('sales')
  @Security('jwt')
  @SuccessResponse(200, '판매관리 조회 성공')
  @Response<ErrorResponse>(500, '서버에러', commonError.serverError)
  public async getSales(
    @Query() type: 'ITEM' | 'REFORM',
    @Query() page: number = 1,
    @Query() limit: number = 15,
    @Request() req: ExRequest
  ): Promise<TsoaResponse<SaleResponseDto[]>> {
    const payload = req.user;
    if (payload.role !== 'reformer') {
      throw new ItemAddError('판매자만 조회할 수 있습니다.');
    }
    const ownerId = payload.id;
    const dto = new SaleRequestDto(type, page, limit, ownerId);
    const data = await this.profileService.getSales(dto);

    const res = data.map((sale) => {
      return sale.toResponse();
    });

    return new ResponseHandler(res);
  }

  /**
   * 특정 판매목록 상세 조회
   * @summary 판매상품 ID로 해당 상품의 상세 정보를 조회합니다
   * @param id 판매상품 ID
   * @returns 판매상품 상세 정보
   */
  @Get('sales/:id')
  @Security('jwt')
  @SuccessResponse(200, '특정 판매상품 조회 성공')
  @Response<ErrorResponse>(500, '서버에러', commonError.serverError)
  public async getDetailSales(
    @Path() id: string,
    @Request() req: ExRequest
  ): Promise<TsoaResponse<SaleDetailResponseDto>> {
    const payload = req.user;
    if (payload.role !== 'reformer') {
      throw new ItemAddError('판매자만 조회할 수 있습니다.');
    }
    const ownerId = payload.id;

    const data = await this.profileService.getSaleDetail(ownerId, id);

    return new ResponseHandler(data.toResponse());
  }

  /**
   * 프로필 기본 정보 조회
   * @summary owner ID로 프로필 정보(닉네임, 평점, 리뷰 수 등)를 조회합니다
   * @param id owner UUID
   * @returns 프로필 정보
   */
  @Get('{id}')
  @SuccessResponse(200, '프로필 정보 조회 성공')
  @Response<ErrorResponse>(
    404,
    '프로필을 찾을 수 없습니다.',
    {
      resultType: 'FAIL',
      error: {
        errorCode: 'OWNER-NOT-FOUND',
        reason: '프로필을 찾을 수 없습니다.',
        data: 'Owner ID: {id}'
      },
      success: null
    }
  )
  @Response<ErrorResponse>(500, '서버 에러', commonError.serverError)
  public async getProfileInfo(
    @Path() id: string
  ): Promise<TsoaResponse<ProfileInfoResponse>> {
    const result = await this.profileService.getProfileInfo(id);
    return new ResponseHandler(result);
  }

  /**
   * 프로필 피드 목록 조회 (cursor 기반)
   * @summary owner의 피드 목록을 조회합니다 (공개)
   * @param id owner UUID
   * @param cursor 페이지네이션 커서 (선택)
   * @param limit 한 번에 조회할 개수 (기본 20, 최대 50)
   * @returns 피드 목록
   */
  @Get('{id}/feed')
  @SuccessResponse(200, '피드 목록 조회 성공')
  @Response<ErrorResponse>(
    404,
    '프로필을 찾을 수 없습니다.',
    {
      resultType: 'FAIL',
      error: {
        errorCode: 'OWNER-NOT-FOUND',
        reason: '프로필을 찾을 수 없습니다.',
        data: 'Owner ID: {id}'
      },
      success: null
    }
  )
  @Response<ErrorResponse>(500, '서버 에러', commonError.serverError)
  public async getProfileFeed(
    @Path() id: string,
    @Query() cursor?: string,
    @Query() limit?: number
  ): Promise<TsoaResponse<FeedListResponse>> {
    const limitValue = limit && limit > 0 ? limit : 20;
    const result = await this.profileService.getProfileFeed(
      id,
      cursor,
      limitValue
    );
    return new ResponseHandler(result);
  }

  /**
   * 프로필 판매 상품 목록 조회 (cursor 기반)
   * @summary owner의 판매 상품 목록을 조회합니다 (로그인 시 찜 여부 포함)
   * @param id owner UUID
   * @param cursor 페이지네이션 커서 (선택)
   * @param limit 한 번에 조회할 개수 (기본 20, 최대 50)
   * @returns 판매 상품 목록
   */
  @Get('{id}/item')
  @SuccessResponse(200, '판매 상품 목록 조회 성공')
  @Response<ErrorResponse>(
    404,
    '프로필을 찾을 수 없습니다.',
    {
      resultType: 'FAIL',
      error: {
        errorCode: 'OWNER-NOT-FOUND',
        reason: '프로필을 찾을 수 없습니다.',
        data: 'Owner ID: {id}'
      },
      success: null
    }
  )
  @Response<ErrorResponse>(500, '서버 에러', commonError.serverError)
  public async getProfileItems(
    @Path() id: string,
    @Request() req: ExpressRequest,
    @Query() cursor?: string,
    @Query() limit?: number
  ): Promise<TsoaResponse<MarketListResponse>> {
    const limitValue = limit && limit > 0 ? limit : 20;
    const userId = req.user?.id;
    const result = await this.profileService.getProfileItems(
      id,
      cursor,
      limitValue,
      userId
    );
    return new ResponseHandler(result);
  }

  /**
   * 프로필 주문제작 목록 조회 (cursor 기반)
   * @summary owner의 주문제작 상품 목록을 조회합니다 (로그인 시 찜 여부 포함)
   * @param id owner UUID
   * @param cursor 페이지네이션 커서 (선택)
   * @param limit 한 번에 조회할 개수 (기본 20, 최대 50)
   * @returns 주문제작 목록
   */
  @Get('{id}/proposal')
  @SuccessResponse(200, '주문제작 목록 조회 성공')
  @Response<ErrorResponse>(
    404,
    '프로필을 찾을 수 없습니다.',
    {
      resultType: 'FAIL',
      error: {
        errorCode: 'OWNER-NOT-FOUND',
        reason: '프로필을 찾을 수 없습니다.',
        data: 'Owner ID: {id}'
      },
      success: null
    }
  )
  @Response<ErrorResponse>(500, '서버 에러', commonError.serverError)
  public async getProfileProposals(
    @Path() id: string,
    @Request() req: ExpressRequest,
    @Query() cursor?: string,
    @Query() limit?: number
  ): Promise<TsoaResponse<ProposalListResponse>> {
    const limitValue = limit && limit > 0 ? limit : 20;
    const userId = req.user?.id;
    const result = await this.profileService.getProfileProposals(
      id,
      cursor,
      limitValue,
      userId
    );
    return new ResponseHandler(result);
  }

  /**
   * 프로필 리뷰 목록 조회 (cursor 기반)
   * @summary owner에 대한 리뷰 목록을 조회합니다 (공개)
   * @param id owner UUID
   * @param cursor 페이지네이션 커서 (선택)
   * @param limit 한 번에 조회할 개수 (기본 20, 최대 50)
   * @returns 리뷰 목록
   */
  @Get('{id}/review')
  @SuccessResponse(200, '리뷰 목록 조회 성공')
  @Response<ErrorResponse>(
    404,
    '프로필을 찾을 수 없습니다.',
    {
      resultType: 'FAIL',
      error: {
        errorCode: 'OWNER-NOT-FOUND',
        reason: '프로필을 찾을 수 없습니다.',
        data: 'Owner ID: {id}'
      },
      success: null
    }
  )
  @Response<ErrorResponse>(500, '서버 에러', commonError.serverError)
  public async getProfileReviews(
    @Path() id: string,
    @Query() cursor?: string,
    @Query() limit?: number
  ): Promise<TsoaResponse<ReviewListResponse>> {
    const limitValue = limit && limit > 0 ? limit : 20;
    const result = await this.profileService.getProfileReviews(
      id,
      cursor,
      limitValue
    );
    return new ResponseHandler(result);
  }
}
