import { ItemDto } from './profile.dto.js';
import { ProfileModel } from './profile.model.js';
import { S3 } from '../../config/s3.js';
import { ItemAddError } from './profile.error.js';
export class ProfileService {
  private profileModel: ProfileModel;
  private s3: S3;
  constructor() {
    this.profileModel = new ProfileModel();
    this.s3 = new S3();
  }

  async addItem(itemDto: ItemDto, images: Express.Multer.File[]) {
    try {
      const imageStr: string[] = [];
      for (const img of images) {
        const ans = await this.s3.uploadToS3(img);
        imageStr.push(ans);
      }
      itemDto.images = imageStr;
      await this.profileModel.addItem(itemDto);
    } catch (err: any) {
      throw new ItemAddError(err);
    }
  }
}
