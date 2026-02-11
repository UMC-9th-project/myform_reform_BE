import {
  Controller,
  Post,
  Patch,
  Route,
  SuccessResponse,
  Response,
  Tags,
  Get,
  Path,
  Body,
  Query,
  Security,
  Request,
  Example
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
  AddFeedRequestDto,
  AddItemRequestDto,
  AddReformRequestDto,
  UpdateItemRequest,
  SaleRequestDto,
  OrderRequestDto,
  RequestListRequestDto
} from './dto/profile.req.dto.js';
import {
  AddFeedResponseDto,
  SaleDetailResponseDto,
  SaleResponseDto,
  ProfileInfoResponse,
  FeedListResponse,
  MarketListResponse,
  ProposalListResponse,
  ReviewListResponse,
  OrderDetailResponseDto,
  OrderListResponseDto,
  RequestsListResponseDto
} from './dto/profile.res.dto.js';
import { Request as ExRequest } from 'express';
import { Item, ItemUpdate, Reform } from './profile.model.js';
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
   * 판매 상품 수정
   *
   * @summary 기존 판매 상품 정보를 수정합니다
   * @param id 판매 상품 ID (item_id)
   * @param body 수정할 판매 상품 정보
   * @returns 판매글 수정 결과
   */
  @Patch('item/{itemId}')
  @Security('jwt')
  @SuccessResponse(200, '판매글 수정 성공')
  @Response<ErrorResponse>(500, '서버에러', commonError.serverError)
  public async updateItem(
    @Path() itemId: string,
    @Body() body: UpdateItemRequest,
    @Request() req: ExRequest
  ): Promise<TsoaResponse<string>> {
    const payload = req.user;
    if (payload.role !== 'reformer') {
      throw new ItemAddError('판매자만 수정할 수 있습니다.');
    }
    const ownerId = payload.id;
    const dto = ItemUpdate.createFromUpdateRequest(body, itemId, ownerId);
    const ans = await this.profileService.updateItem(dto);

    return new ResponseHandler(ans);
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
   * 프로필 피드 사진 등록
   * @summary 본인(리폼러) 프로필에 피드 사진을 등록합니다. 이미지는 /upload 또는 /upload/many로 먼저 업로드한 뒤 받은 URL을 imageUrls에 넣어 보냅니다.
   * @param body imageUrls(1개 이상), isPinned(고정 여부, 선택)
   * @returns 생성된 feedId
   */
  @Post('feed')
  @Security('jwt')
  @SuccessResponse(201, '피드 등록 성공')
  @Response<TsoaResponse<AddFeedResponseDto>>(201, '피드 등록 성공', {
    resultType: 'SUCCESS',
    error: null,
    success: {
      feedId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    }
  })
  @Response<ErrorResponse>(
    401,
    '로그인이 필요합니다.',
    commonError.unauthorized
  )
  @Response<ErrorResponse>(400, '판매자(리폼러)만 등록할 수 있습니다.', {
    resultType: 'FAIL',
    error: {
      errorCode: 'ERR-FEED-NOT-REFORMER',
      reason: '판매자(리폼러)만 등록할 수 있습니다.',
      data: null
    },
    success: null
  })
  @Response<ErrorResponse>(400, '이미지 URL을 1개 이상 입력해 주세요.', {
    resultType: 'FAIL',
    error: {
      errorCode: 'ERR-FEED-VALIDATION',
      reason: '이미지 URL을 1개 이상 입력해 주세요.',
      data: null
    },
    success: null
  })
  @Response<ErrorResponse>(500, '서버 에러', commonError.serverError)
  public async addFeed(
    @Body() body: AddFeedRequestDto,
    @Request() req: ExRequest
  ): Promise<TsoaResponse<AddFeedResponseDto>> {
    const payload = req.user;
    if (payload.role !== 'reformer') {
      throw new ItemAddError('판매자(리폼러)만 등록할 수 있습니다.');
    }
    const ownerId = payload.id;
    const result = await this.profileService.addFeed(ownerId, body);
    this.setStatus(201);
    return new ResponseHandler(result);
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
    @Query() sort: 'asc' | 'desc' = 'desc',
    @Request() req: ExRequest
  ): Promise<TsoaResponse<SaleResponseDto[]>> {
    const payload = req.user;
    if (payload.role !== 'reformer') {
      throw new ItemAddError('판매자만 조회할 수 있습니다.');
    }

    const ownerId = payload.id;
    const dto = new SaleRequestDto(type, page, limit, ownerId, sort);

    const data = await this.profileService.getSales(dto);

    const res = data.map((sale) => {
      return sale.toResponse();
    });

    return new ResponseHandler(res);
  }

  /**
   * 운송장 번호 수정
   * @summary 판매상품 ID로 해당 상품의 상세 정보를 조회합니다
   * @param orderId 판매상품 ID (order_id)
   * @returns 판매상품 상세 정보
   */
  @Patch('sales/{orderId}/tracking')
  @Security('jwt')
  @SuccessResponse(200, '운송장 번호 수정 성공')
  @Response<ErrorResponse>(500, '서버에러', commonError.serverError)
  public async updateTrackingNumber(
    @Path() orderId: string,
    @Body() body: { trackingNumber: string },
    @Request() req: ExRequest
  ): Promise<TsoaResponse<string>> {
    const payload = req.user;
    if (payload.role !== 'reformer') {
      throw new ItemAddError('판매자만 조회할 수 있습니다.');
    }
    const ownerId = payload.id;

    await this.profileService.updateTrackingNumber(
      ownerId,
      orderId,
      body.trackingNumber
    );
    return new ResponseHandler('수정 성공');
  }
  /**
   * 특정 판매목록 상세 조회
   * @summary 판매상품 ID로 해당 상품의 상세 정보를 조회합니다
   * @param orderId 판매상품 ID (order_id)
   * @returns 판매상품 상세 정보
   */
  @Get('sales/{orderId}')
  @Security('jwt')
  @SuccessResponse(200, '특정 판매상품 조회 성공')
  @Response<TsoaResponse<SaleDetailResponseDto>>(
    200,
    '특정 판매상품 조회 성공',
    {
      resultType: 'SUCCESS',
      error: null,
      success: {
        orderId: '1f41caf0-dda0-4f9e-8085-35d1e79a2dfe',
        targetId: '550e8400-e29b-41d4-a716-446655440000',
        status: 'COMPLETE',
        price: 53000,
        deliveryFee: 3000,
        userName: '구매자이름',
        createdAt: new Date('2024-12-01T10:30:00Z'),
        title: '상품명',
        thumbnail: 'https://example.com/thumbnail.jpg',
        phone: '01012345678',
        tracking_number: '12312123',
        delivery_address: {
          postal_code: '12345',
          address: '서울시 강남구 테헤란로',
          address_detail: '123번지',
          recipient_name: '홍길동',
          phone: '01012345678',
          address_name: '수원집'
        },
        billNumber: '',
        option: '옵션그룹1 옵션1',
        receiptNumber: '123456789012',
        chatRoomId: null,
        targetType: 'ITEM'
      }
    }
  )
  @Response<ErrorResponse>(500, '서버에러', commonError.serverError)
  public async getDetailSales(
    @Path() orderId: string,
    @Request() req: ExRequest
  ): Promise<TsoaResponse<SaleDetailResponseDto>> {
    const payload = req.user;
    if (payload.role !== 'reformer') {
      throw new ItemAddError('판매자만 조회할 수 있습니다.');
    }
    const ownerId = payload.id;

    const data = await this.profileService.getSaleDetail(ownerId, orderId);

    return new ResponseHandler(data.toResponse());
  }

  /**
   * 내 프로필 정보 조회 (리폼러 전용)
   * @summary 로그인한 리폼러가 본인 프로필 정보를 조회합니다
   * @returns 프로필 정보
   */
  @Get()
  @Security('jwt')
  @SuccessResponse(200, '내 프로필 조회 성공')
  @Response<ErrorResponse>(
    401,
    '로그인이 필요합니다.',
    commonError.unauthorized
  )
  @Response<ErrorResponse>(400, '판매자(리폼러)만 조회할 수 있습니다.', {
    resultType: 'FAIL',
    error: {
      errorCode: 'ERR-PROFILE-NOT-REFORMER',
      reason: '판매자(리폼러)만 조회할 수 있습니다.',
      data: null
    },
    success: null
  })
  @Response<ErrorResponse>(404, '프로필을 찾을 수 없습니다.', {
    resultType: 'FAIL',
    error: {
      errorCode: 'OWNER-NOT-FOUND',
      reason: '프로필을 찾을 수 없습니다.',
      data: null
    },
    success: null
  })
  @Response<ErrorResponse>(500, '서버 에러', commonError.serverError)
  public async getMyProfile(
    @Request() req: ExRequest
  ): Promise<TsoaResponse<ProfileInfoResponse>> {
    const payload = req.user;
    if (payload.role !== 'reformer') {
      throw new ItemAddError('판매자(리폼러)만 조회할 수 있습니다.');
    }
    const ownerId = payload.id;
    const result = await this.profileService.getProfileInfo(ownerId);
    return new ResponseHandler(result);
  }

  /**
   * 구매 목록 조회
   * @summary 사용자의 전체 구매이력 목록을 조회합니다
   * @returns 구매이력 목록
   * @param type 주문제작 or 판매상품 선택
   * @param cursor 페이지네이션 커서
   * @param limit 한 번에 보여줄 목록 수
   * @param OnlyReviewAvailable 리뷰 가능한 주문 목록만 조회하기 (리뷰 가능 조건 : PENDING이 아닐 때, 작성된 리뷰가 없을 때)
   */
  @Security('jwt', ['user'])
  @Get('orders')
  @SuccessResponse(200, '구매이력 조회 성공')
  @Response<ErrorResponse>(500, '서버에러', commonError.serverError)
  public async getOrders(
    @Query() type: 'ITEM' | 'REFORM' | 'ALL',
    @Request() req: ExRequest,
    @Query() cursor?: string,
    @Query() limit: number = 20,
    @Query() order: 'asc' | 'desc' = 'desc',
    @Query() OnlyReviewAvailable: boolean = false
  ): Promise<TsoaResponse<OrderListResponseDto>> {
    const payload = req.user;
    const userId = payload.id;
    const dto = new OrderRequestDto(
      type,
      cursor,
      limit,
      userId,
      OnlyReviewAvailable,
      order
    );
    const { orders, nextCursor, hasNext } =
      await this.profileService.getOrders(dto);
    const ordersRes = orders.map((o) => o.toResponse());
    const res: OrderListResponseDto = {
      orders: ordersRes,
      nextCursor,
      hasNext
    };
    return new ResponseHandler(res);
  }

  /**
   * 구매 목록 상세 조회
   * @summary 구매 목록 ID로 해당 목록의 상세 정보를 조회합니다
   * @param orderId 구매 목록 ID (order_id)
   * @returns 구매 목록 상세 정보
   */
  @Get('orders/{orderId}')
  @Security('jwt', ['user'])
  @SuccessResponse(200, '구매 목록 상세 조회 성공')
  @Response<ErrorResponse>(500, '서버에러', commonError.serverError)
  public async getOrderDetail(
    @Path() orderId: string,
    @Request() req: ExRequest
  ): Promise<TsoaResponse<OrderDetailResponseDto>> {
    const payload = req.user;
    const userId = payload.id;
    const data = await this.profileService.getOrderDetail(userId, orderId);
    return new ResponseHandler(data);
  }

  /**
   * 일반 유저 작성한 요청 글목록 조회
   * @summary 작성한 요청글 목록을 조회합니다. (일반 유저, 자신의 글만 조회 가능)
   * @param cursor 페이지네이션 커서 (optional)
   * @param limit 한 번에 보여줄 목록 수 (기본 값 20)
   * @return 사용자가 작성한 요청글 목록
   */
  @Get('requests')
  @Security('jwt', ['user'])
  @SuccessResponse(200, '작성 요청글 조회 성공')
  @Response<ErrorResponse>(500, '서버에러', commonError.serverError)
  public async getRequests(
    @Request() req: ExRequest,
    @Query() cursor?: string,
    @Query() limit: number = 20,
    @Query() order: 'asc' | 'desc' = 'desc'
  ): Promise<TsoaResponse<RequestsListResponseDto>> {
    const payload = req.user;
    const userId = payload.id;
    const dto = new RequestListRequestDto(cursor, limit, userId, order);
    const data = await this.profileService.getRequests(dto);
    return new ResponseHandler(data);
  }

  /**
   * 프로필 기본 정보 조회
   * @summary 리폼러 프로필 정보(닉네임, 평점, 리뷰 수 등)를 조회합니다. owner UUID 또는 닉네임으로 조회할 수 있습니다.
   * @param ownerID owner UUID 또는 리폼러 닉네임
   * @returns 프로필 정보 (ownerId, avgStarRecent3m 포함)
   */
  @Get('{ownerId}')
  @SuccessResponse(200, '프로필 정보 조회 성공')
  @Response<ErrorResponse>(404, '프로필을 찾을 수 없습니다.', {
    resultType: 'FAIL',
    error: {
      errorCode: 'OWNER-NOT-FOUND',
      reason: '프로필을 찾을 수 없습니다.',
      data: 'Owner ID: {id}'
    },
    success: null
  })
  @Response<ErrorResponse>(500, '서버 에러', commonError.serverError)
  @Example<TsoaResponse<ProfileInfoResponse>>({
    resultType: 'SUCCESS',
    error: null,
    success: {
      ownerId: '880e8400-e29b-41d4-a716-446655440000',
      profilePhoto: 'https://example.com/profile.jpg',
      nickname: '리폼러닉네임',
      avgStar: 4.5,
      avgStarRecent3m: 4.2,
      reviewCount: 120,
      totalSaleCount: 45,
      keywords: ['리폼', '수선'],
      bio: '프로필 소개글입니다.'
    }
  })
  public async getProfileInfo(
    @Path() ownerId: string
  ): Promise<TsoaResponse<ProfileInfoResponse>> {
    const result = await this.profileService.getProfileInfo(ownerId);
    return new ResponseHandler(result);
  }

  /**
   * 프로필 피드 목록 조회 (cursor 기반)
   * @summary owner의 피드 목록을 조회합니다 (공개)
   * @param ownerId owner UUID
   * @param cursor 페이지네이션 커서 (선택)
   * @param limit 한 번에 조회할 개수 (기본 20, 최대 50)
   * @returns 피드 목록
   */
  @Get('{ownerId}/feed')
  @SuccessResponse(200, '피드 목록 조회 성공')
  @Response<ErrorResponse>(404, '프로필을 찾을 수 없습니다.', {
    resultType: 'FAIL',
    error: {
      errorCode: 'OWNER-NOT-FOUND',
      reason: '프로필을 찾을 수 없습니다.',
      data: 'Owner ID: {id}'
    },
    success: null
  })
  @Response<ErrorResponse>(500, '서버 에러', commonError.serverError)
  public async getProfileFeed(
    @Path() ownerId: string,
    @Query() cursor?: string,
    @Query() limit?: number
  ): Promise<TsoaResponse<FeedListResponse>> {
    const limitValue = limit && limit > 0 ? limit : 20;
    const result = await this.profileService.getProfileFeed(
      ownerId,
      cursor,
      limitValue
    );
    return new ResponseHandler(result);
  }

  /**
   * 프로필 판매 상품 목록 조회 (cursor 기반)
   * @summary owner의 판매 상품 목록을 조회합니다 (로그인 시 찜 여부 포함). id는 owner UUID 또는 닉네임입니다.
   * @param ownerId owner UUID 또는 리폼러 닉네임
   * @param cursor 페이지네이션 커서 (선택)
   * @param limit 한 번에 조회할 개수 (기본 20, 최대 50)
   * @returns 판매 상품 목록
   */
  @Get('{ownerId}/item')
  @SuccessResponse(200, '판매 상품 목록 조회 성공')
  @Response<ErrorResponse>(404, '프로필을 찾을 수 없습니다.', {
    resultType: 'FAIL',
    error: {
      errorCode: 'OWNER-NOT-FOUND',
      reason: '프로필을 찾을 수 없습니다.',
      data: 'Owner owerId: {id}'
    },
    success: null
  })
  @Response<ErrorResponse>(500, '서버 에러', commonError.serverError)
  public async getProfileItems(
    @Path() ownerId: string,
    @Request() req: ExpressRequest,
    @Query() cursor?: string,
    @Query() limit?: number
  ): Promise<TsoaResponse<MarketListResponse>> {
    const limitValue = limit && limit > 0 ? limit : 20;
    const userId = req.user?.id;
    const result = await this.profileService.getProfileItems(
      ownerId,
      cursor,
      limitValue,
      userId
    );
    return new ResponseHandler(result);
  }

  /**
   * 프로필 주문제작 목록 조회 (cursor 기반)
   * @summary owner의 주문제작 상품 목록을 조회합니다 (로그인 시 찜 여부 포함). id는 owner UUID 또는 닉네임입니다.
   * @param ownerId owner UUID 또는 리폼러 닉네임
   * @param cursor 페이지네이션 커서 (선택)
   * @param limit 한 번에 조회할 개수 (기본 20, 최대 50)
   * @returns 주문제작 목록
   */
  @Get('{ownerId}/proposal')
  @SuccessResponse(200, '주문제작 목록 조회 성공')
  @Response<ErrorResponse>(404, '프로필을 찾을 수 없습니다.', {
    resultType: 'FAIL',
    error: {
      errorCode: 'OWNER-NOT-FOUND',
      reason: '프로필을 찾을 수 없습니다.',
      data: 'Owner ID: {id}'
    },
    success: null
  })
  @Response<ErrorResponse>(500, '서버 에러', commonError.serverError)
  public async getProfileProposals(
    @Path() ownerId: string,
    @Request() req: ExpressRequest,
    @Query() cursor?: string,
    @Query() limit?: number
  ): Promise<TsoaResponse<ProposalListResponse>> {
    const limitValue = limit && limit > 0 ? limit : 20;
    const userId = req.user?.id;
    const result = await this.profileService.getProfileProposals(
      ownerId,
      cursor,
      limitValue,
      userId
    );
    return new ResponseHandler(result);
  }

  /**
   * 프로필 리뷰 목록 조회 (cursor 기반)
   * @summary owner에 대한 리뷰 목록을 조회합니다 (공개). id는 owner UUID 또는 닉네임입니다.
   * @param ownerId owner UUID 또는 리폼러 닉네임
   * @param cursor 페이지네이션 커서 (선택)
   * @param limit 한 번에 조회할 개수 (기본 20, 최대 50)
   * @param targetType 필터: ITEM|PROPOSAL|FEED|REQUEST (선택, 없으면 전체 타입)
   * @returns 리뷰 목록
   */
  @Get('{ownerId}/review')
  @SuccessResponse(200, '리뷰 목록 조회 성공')
  @Response<ErrorResponse>(404, '프로필을 찾을 수 없습니다.', {
    resultType: 'FAIL',
    error: {
      errorCode: 'OWNER-NOT-FOUND',
      reason: '프로필을 찾을 수 없습니다.',
      data: 'Owner ID: {id}'
    },
    success: null
  })
  @Response<ErrorResponse>(500, '서버 에러', commonError.serverError)
  public async getProfileReviews(
    @Path() ownerId: string,
    @Query() cursor?: string,
    @Query() limit?: number,
    @Query() targetType?: 'ITEM' | 'PROPOSAL' | 'FEED' | 'REQUEST'
  ): Promise<TsoaResponse<ReviewListResponse>> {
    const limitValue = limit && limit > 0 ? limit : 20;
    const result = await this.profileService.getProfileReviews(
      ownerId,
      cursor,
      limitValue,
      targetType
    );
    return new ResponseHandler(result);
  }
}
