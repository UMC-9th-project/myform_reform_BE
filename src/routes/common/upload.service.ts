import { S3 } from '../../config/s3.js';
import { ImageUrl, ImageUrls } from './upload.dto.js';

export class UploadService {
  private s3: S3;

  constructor() {
    this.s3 = new S3();
  }
  async uploadSingle(image: Express.Multer.File) {
    const url = await this.s3.uploadToS3(image);
    return {
      url: url
    } as ImageUrl;
  }

  async uploadMany(images: Express.Multer.File[]) {
    const url = await this.s3.uploadManyToS3(images);
    return {
      url: url
    } as ImageUrls;
  }

  async deleteImage(urls: ImageUrls) {
    await Promise.all(urls.url.map((o) => this.s3.deleteFromS3(o)));
  }
}
