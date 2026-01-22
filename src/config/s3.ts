/* tslint:disable */
/* eslint-disable */
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import { v4 } from 'uuid';
import { S3UploadError } from '../middleware/error.js';

dotenv.config();
export class S3 {
  private s3: S3Client;
  constructor() {
    this.s3 = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || '',
        secretAccessKey: process.env.S3_SECRET_KEY || ''
      }
    });
  }

  async uploadToS3(file: Express.Multer.File): Promise<string> {
    if (!file.mimetype.startsWith('image/')) {
      throw new S3UploadError('지원되지 않는 파일 형식입니다.');
    }
    const uniqueName = `${v4()}-${file.originalname}`;
    const command = new PutObjectCommand({
      Bucket: process.env.S3_NAME || '',
      Key: uniqueName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'private'
    });
    try {
      await this.s3.send(command);
    } catch (err) {
      new S3UploadError('사진을 올리는 중 오류가 발생했습니다');
    }
    // S3 URL 반환 (필요에 따라 public URL로 수정)
    return `https://${process.env.S3_NAME}.s3.ap-northeast-2.amazonaws.com/${uniqueName}`;
  }

  // 여러 파일을 한번에 S3에 업로드
  async uploadManyToS3(files: Express.Multer.File[]): Promise<string[]> {
    const urls: string[] = [];
    if(!files || files. length === 0) return [];
    try {
      const uploadPromises = files.map(async (file: Express.Multer.File) => this.uploadToS3(file));
      const uploadedUrls = await Promise.all(uploadPromises);
      return uploadedUrls;
    } catch (err) {
      throw new S3UploadError('사진을 올리는 중 오류가 발생했습니다');
    }
  }

  async deleteFromS3(fileUrl: string): Promise<boolean> {
    try {
      const fileKey = this.extractFileKeyFromUrl(fileUrl);
      const command = new DeleteObjectCommand({
        Bucket: process.env.S3_NAME || '',
        Key: fileKey
      });

      await this.s3.send(command);
      return true;
    } catch (err) {
      throw new S3UploadError('S3에서 파일 삭제 중 오류가 발생했습니다');
    }
  }

  extractFileKeyFromUrl(fileUrl: string): string {
    if (!fileUrl.startsWith('http')) {
      return fileUrl; // 이미 파일 키인 경우
    }

    const urlParts = fileUrl.split('/');
    return urlParts[urlParts.length - 1];
  }
}
