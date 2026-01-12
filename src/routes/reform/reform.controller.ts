import {
  Body,
  Controller,
  FormField,
  Get,
  Patch,
  Path,
  Post,
  Route,
  UploadedFiles
} from 'tsoa';
import { ReformService } from './reform.service.js';
import { ReformRequest, ReformRequestDto } from './reform.dto.js';

@Route('/api/v1/reform')
export class ReformController extends Controller {
  private reformService: ReformService;
  constructor() {
    super();
    this.reformService = new ReformService();
  }

  @Get('/')
  public async findAll() {}

  @Post('/request')
  public async addRequest(
    @FormField() body: string,
    @UploadedFiles() images: Express.Multer.File[]
  ) {
    const userId = '';
    const dto = JSON.parse(body) as ReformRequest;
    const reformDto = new ReformRequestDto(dto);
    reformDto.userId = userId;
    await this.reformService.addRequest(reformDto, images);
  }

  @Get('/request/:id')
  public async findDetailRequest(@Path() id: string) {}

  @Patch('/request/:id')
  public async modifyRequest() {}

  @Get('/proposal/:id')
  public async findDetailProposal(@Path() id: string) {}

  @Patch('/proposal/:id')
  public async modifyProposal() {}

  @Post('/order')
  public async addOrder() {}
}
