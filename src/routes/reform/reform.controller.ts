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
  ProposalDetail,
  ProposalDetailDto,
  ReformRequest,
  ReformRequestDto,
  RequestDetail,
  RequestDetailDto
} from './reform.dto.js';
import { ResponseHandler, TsoaResponse } from '../../config/tsoaResponse.js';
import RequestHandler from 'express';

@Tags('Reform Router')
@Route('/api/v1/reform')
export class ReformController extends Controller {
  private reformService: ReformService;
  constructor() {
    super();
    this.reformService = new ReformService();
  }

  @Get('/')
  public async findAll() {}

  /**
   *
   * {"title":"청바지 기장 수선 요청합니다","contents":"너무 길어서 기장을 5cm 정도 줄이고 싶습니다. 밑단은 원단 그대로 살려서 작업해주시면 감사하겠습니다.","minBudget":15000,"maxBudget":30000,"dueDate":"2026-01-20T00:00:00.000Z","category":{"major":"의류","sub":"하의"}}
   * @param body JSOP stringfy된 입력 body
   * @param images 예시 사진
   */
  @Post('/request')
  @SuccessResponse(200, '생성 성공')
  public async addRequest(
    @FormField() body: string,
    @UploadedFiles() images: Express.Multer.File[]
  ): Promise<TsoaResponse<string>> {
    const userId = '80f80aec-a750-4159-8e17-398a9dc6f14c';
    const dto = JSON.parse(body) as ReformRequest;
    const reformDto = new ReformRequestDto(dto);
    reformDto.userId = userId;
    await this.reformService.addRequest(reformDto, images);
    return new ResponseHandler('생성 성공');
  }

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

  @Patch('/request/:id')
  public async modifyRequest() {}

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

  @Patch('/proposal/:id')
  public async modifyProposal() {}

  @Post('/order')
  public async addOrder() {}
}
