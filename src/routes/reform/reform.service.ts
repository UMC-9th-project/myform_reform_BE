import { S3 } from '../../config/s3.js';
import { ReformRequestDto } from './reform.dto.js';
import { ReformModel } from './reform.model.js';

export class ReformService {
  private refromModel: ReformModel;
  private s3: S3;
  constructor() {
    this.refromModel = new ReformModel();
    this.s3 = new S3();
  }

  async addRequest(dto: ReformRequestDto, images: Express.Multer.File[]) {
    try {
      const imageStr: string[] = [];
      for (const img of images) {
        const ans = await this.s3.uploadToS3(img);
        imageStr.push(ans);
      }
      dto.images = imageStr;
      await this.refromModel.addRequest(dto);
    } catch (err: any) {
      console.log(err);
    }
  }
}
