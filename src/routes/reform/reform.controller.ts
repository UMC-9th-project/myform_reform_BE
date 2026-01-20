import {
  Body,
  Controller,
  Example,
  FormField,
  Get,
  Patch,
  Path,
  Post,
  Response,
  Route,
  SuccessResponse,
  Tags,
  UploadedFiles
} from 'tsoa';
import { ReformService } from './reform.service.js';
import {
  Order,
  OrderQuoteDto,
  ProposalDetail,
  ProposalDetailDto,
  ReformRequestDto,
  RequestDetail,
  RequestDetailDto
} from './reform.dto.js';
import {
  ErrorResponse,
  ResponseHandler,
  TsoaResponse
} from '../../config/tsoaResponse.js';
import RequestHandler from 'express';
import { AddQuoteReq, ReformRequestReq } from './dto/reform.req.dto.js';
import { ReformHomeResponse } from './dto/reform.res.dto.js';
import { ReformDBError } from './reform.error.js';

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
  @Example<ReformHomeResponse>({
    requests: [
      {
        thumbnail: 'testurl',
        title: 'test 요청서',
        minBudget: 0,
        maxBudget: 10
      },
      {
        thumbnail: 'testurl',
        title: 'test 요청서',
        minBudget: 0,
        maxBudget: 10
      },
      {
        thumbnail: 'testurl',
        title: 'test 요청서',
        minBudget: 0,
        maxBudget: 10
      }
    ],
    proposals: [
      {
        thumbnail:
          'https://myform-reform.s3.ap-northeast-2.amazonaws.com/a8d7caeb-776a-475b-af2f-c3a3b08b9dad',
        title: '맞춤 자켓 제작',
        price: 150000,
        avgStar: 0,
        reviewCount: 0,
        ownerName: 'test'
      },
      {
        thumbnail:
          'https://myform-reform.s3.ap-northeast-2.amazonaws.com/79aa3782-69db-4d91-aed0-2a67482e1bb4',
        title: '맞춤 자켓 제작',
        price: 150000,
        avgStar: 0,
        reviewCount: 0,
        ownerName: 'test'
      },
      {
        thumbnail:
          'https://myform-reform.s3.ap-northeast-2.amazonaws.com/f7b43cdf-4512-4720-b5d8-682e0d3a5bd3',
        title: '맞춤 자켓 제작',
        price: 150000,
        avgStar: 0,
        reviewCount: 0,
        ownerName: 'test'
      }
    ]
  })
  @SuccessResponse(200, '조회 성공')
  @Response<ErrorResponse>(500, '데이터베이스 오류')
  public async findAll(): Promise<TsoaResponse<ReformHomeResponse>> {
    const ans = await this.reformService.selectHomeReform();
    return new ResponseHandler(ans);
  }

  /**
   *
   *
   * @summary 새로운 리폼요청서를 작성합니다
   * @param body JSON stringify된 객체 {"title":"청바지 기장 수선 요청합니다","contents":"너무 길어서 기장을 5cm 정도 줄이고 싶습니다.","minBudget":15000,"maxBudget":30000,"dueDate":"2026-01-20T00:00:00.000Z","category":{"major":"의류","sub":"하의"}}
   * @param images 리폼 요청에 첨부할 이미지 파일 배열
   * @returns 생성 성공 메시지
   */
  @Post('/request')
  @SuccessResponse(200, '생성 성공')
  public async addRequest(
    @FormField() body: string,
    @UploadedFiles() images: Express.Multer.File[]
  ): Promise<TsoaResponse<string>> {
    const userId = '80f80aec-a750-4159-8e17-398a9dc6f14c';
    const dto = JSON.parse(body) as ReformRequestReq;
    const reformDto = new ReformRequestDto(dto);
    reformDto.userId = userId;
    await this.reformService.addRequest(reformDto, images);
    return new ResponseHandler('생성 성공');
  }

  /**
   * @summary 특정 리폼요청서의 상세 정보를 조회합니다.
   * @param id 리폼 요청 ID (UUID)
   * @returns 리폼 요청 상세 정보
   */
  @Get('/request/:id')
  @SuccessResponse(200, '조회 성공')
  @Example<RequestDetail>({
    userId: '80f80aec-a750-4159-8e17-398a9dc6f14c',
    images: [
      {
        content: 'http://example.png',
        photo_order: 0
      }
    ],
    contents:
      '너무 길어서 기장을 5cm 정도 줄이고 싶습니다. 밑단은 원단 그대로 살려서 작업해주시면 감사하겠습니다.',
    title: '청바지 기장 수선 요청합니다',
    min_budget: 15000,
    max_budget: 30000,
    due_date: new Date(),
    created_at: new Date()
  })
  public async findDetailRequest(
    @Path() id: string
  ): Promise<TsoaResponse<RequestDetailDto>> {
    const ans = await this.reformService.findDetailRequest(id);
    console.log(ans);
    return new ResponseHandler(ans);
  }

  /**
   * @summary 특정 리폼 요청을 수정합니다.
   * @param id 리폼 요청 ID (UUID)
   * @returns 수정된 리폼 요청 정보
   */
  @Patch('/request/:id')
  public async modifyRequest() {}

  /**
   * @summary 특정 리폼제안서의 상세 정보를 조회합니다.
   * @param id 제안 ID (UUID)
   * @returns 제안 상세 정보
   */
  @Get('/proposal/:id')
  @SuccessResponse(200, '조회 성공')
  @Example<ProposalDetail>({
    ownerId: '7786f300-6e37-41b3-8bfb-2bca27846785',
    images: [
      {
        content:
          'https://myform-reform.s3.ap-northeast-2.amazonaws.com/f7b43cdf-4512-4720-b5d8-682e0d3a5bd3',
        photo_order: 1
      }
    ],
    title: '맞춤 자켓 제작',
    content: '고객님의 사이즈에 맞춰 자켓을 제작해드립니다',
    price: 150000,
    delivery: 3000,
    expected_working: 14
  })
  public async findDetailProposal(
    @Path() id: string
  ): Promise<TsoaResponse<ProposalDetailDto>> {
    const ans = await this.reformService.findDetailProposal(id);
    return new ResponseHandler(ans);
  }

  /**
   * @summary 특정 제안을 수정합니다
   * @param id 제안 ID (UUID)
   * @returns 수정된 제안 정보
   */
  @Patch('/proposal/:id')
  public async modifyProposal() {}

  /**
   * @summary 요청서를 바탕으로 새로운 견적서를 생성합니다.
   * @param body JSON stringify된 객체 {"userId":"80f80aec-a750-4159-8e17-398a9dc6f14c","reform_request_id":"03719d41-d021-4171-bdac-f26b511bb423","price":10000,"delivery":1000,"content":"상세 제안 내용 텍스트 샘플입니다","expected_working":5}
   * @param images 견적에 첨부할 이미지 파일 배열
   * @returns 생성된 견적 정보
   */
  @Post('/quote')
  @SuccessResponse(200, '생성 성공')
  public async addQuote(
    @FormField() body: string,
    @UploadedFiles() images: Express.Multer.File[]
  ) {
    const ownerId = 'a209454d-5e95-4ffb-ba6f-beeabef34b50'; // ownerId는 reformer만 보내니까 JWT로 인증하도록
    const dto = JSON.parse(body) as AddQuoteReq;
    const orderDto = new OrderQuoteDto(dto, ownerId);
    await this.reformService.addQuoteOrder(orderDto, images);
  }
}
