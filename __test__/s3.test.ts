import { S3 } from '../src/config/s3';
import fs from 'fs';
import path from 'path';

// 테스트 파일 상단에
jest.mock('uuid', () => ({
  v5: 'test-uuid-1234'
}));

describe('S3 파일 업로드 테스트', () => {
  let s3: S3;
  let uploadedFileUrl: string;

  beforeAll(() => {
    s3 = new S3();
  });

  test('실제 이미지 파일을 S3에 업로드', async () => {
    // test.png 파일 읽기
    const testImagePath = path.join(process.cwd(), 'test.png');
    const fileBuffer = fs.readFileSync(testImagePath);

    // Multer.File 형식으로 변환
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test.png',
      encoding: '7bit',
      mimetype: 'image/png',
      size: fileBuffer.length,
      buffer: fileBuffer,
      stream: fs.createReadStream(testImagePath),
      destination: '',
      filename: 'test.png',
      path: testImagePath
    };

    // S3에 업로드
    uploadedFileUrl = await s3.uploadToS3(mockFile);

    // 업로드 성공 확인
    expect(uploadedFileUrl).toBeDefined();
    expect(uploadedFileUrl).toContain('s3');
    expect(uploadedFileUrl).toContain('.png');

    console.log('업로드된 파일 URL:', uploadedFileUrl);
  });

  test('업로드된 파일 삭제', async () => {
    // 이전 테스트에서 업로드한 파일 삭제
    if (uploadedFileUrl) {
      const result = await s3.deleteFromS3(uploadedFileUrl);
      expect(result).toBe(true);
      console.log('파일 삭제 완료:', uploadedFileUrl);
    }
  });

  test('이미지가 아닌 파일 업로드 시 에러 발생', async () => {
    const mockTextFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test.txt',
      encoding: '7bit',
      mimetype: 'text/plain',
      size: 100,
      buffer: Buffer.from('test content'),
      stream: null as any,
      destination: '',
      filename: 'test.txt',
      path: ''
    };

    await expect(s3.uploadToS3(mockTextFile)).rejects.toThrow(
      '지원되지 않는 파일 형식입니다.'
    );
  });
});
