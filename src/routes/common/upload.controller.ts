import {
  Body,
  Controller,
  Delete,
  Example,
  Post,
  Response,
  Route,
  SuccessResponse,
  Tags,
  UploadedFile,
  UploadedFiles
} from 'tsoa';
import { UploadService } from './upload.service.js';
import { ResponseHandler, TsoaResponse } from '../../config/tsoaResponse.js';
import { ImageUrl, ImageUrls } from './upload.dto.js';

@Route('/upload')
@Tags('Upload Router')
export class UploadController extends Controller {
  private uploadService: UploadService;
  constructor() {
    super();
    this.uploadService = new UploadService();
  }

  @Post('/')
  @SuccessResponse(200, '업로드 성공')
  async upload(
    @UploadedFile() image: Express.Multer.File
  ): Promise<TsoaResponse<ImageUrl>> {
    const url = await this.uploadService.uploadSingle(image);
    return new ResponseHandler(url);
  }

  @Post('/many')
  @SuccessResponse(200, '업로드 성공')
  async uploadMany(
    @UploadedFiles() images: Express.Multer.File[]
  ): Promise<TsoaResponse<ImageUrls>> {
    const url = await this.uploadService.uploadMany(images);
    return new ResponseHandler(url);
  }

  @Delete('/')
  @SuccessResponse(200, '제거 성공')
  async deleteImage(@Body() urls: ImageUrls) {
    await this.uploadService.deleteImage(urls);
    return new ResponseHandler('제거 성공');
  }
}
