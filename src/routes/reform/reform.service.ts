import { S3 } from '../../config/s3.js';
import { RequestFilterDto } from './dto/reform.req.dto.js';
import {
  ProposalItemDto,
  ReformHomeResponse,
  RequestItemDto
} from './dto/reform.res.dto.js';
import {
  OrderQuoteDto,
  ProposalDetailDto,
  ReformRequestDto,
  RequestDetailDto
} from './reform.dto.js';
import { ReformError } from './reform.error.js';
import { ReformModel } from './reform.model.js';

export class ReformService {
  private refromModel: ReformModel;
  private s3: S3;
  constructor() {
    this.refromModel = new ReformModel();
    this.s3 = new S3();
  }

  async selectHomeReform(): Promise<ReformHomeResponse> {
    try {
      const [requestData, proposalData] = await Promise.all([
        this.refromModel.selectRequestLatest(),
        this.refromModel.selectProposalLatest()
      ]);
      const requests = requestData.map((req) => new RequestItemDto(req));
      const proposals = proposalData.map((prop) => new ProposalItemDto(prop));

      return { requests, proposals };
    } catch (err: any) {
      throw new ReformError(err);
    }
  }

  async getRequest(filter: RequestFilterDto) {
    const categoryId = await this.refromModel.getCategoryIds(filter.category);
    if (filter.sortBy === 'RECENT') {
      const ans = await this.refromModel.getRequestByRecent(filter, categoryId);
      const dto = ans.map((props) => new RequestItemDto(props));
      return dto;
    }
  }

  async addRequest(dto: ReformRequestDto, images: Express.Multer.File[]) {
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
      await this.refromModel.addRequest(dto);
    } catch (err: any) {
      throw new ReformError(err);
    }
  }

  async findDetailRequest(id: string): Promise<RequestDetailDto> {
    try {
      const ans = await this.refromModel.findDetailRequest(id);
      const dto = new RequestDetailDto(ans.body, ans.images);
      return dto;
    } catch (err: any) {
      throw new ReformError(err);
    }
  }
  async findDetailProposal(id: string): Promise<ProposalDetailDto> {
    try {
      const ans = await this.refromModel.findDetailProposal(id);
      const dto = new ProposalDetailDto(ans.body, ans.images);
      return dto;
    } catch (err: any) {
      console.error(err);
      throw new ReformError(err);
    }
  }

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
