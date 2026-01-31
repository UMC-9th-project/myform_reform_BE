import {
  Controller,
  Get,
  Security,
  SuccessResponse,
  Route,
  Tags,
  Request,
  Query,
  Response,
  Post,
  Body,
  Delete,
  Path,
} from 'tsoa';
import { AddressesService } from './addresses.service.js';
import { ErrorResponse, ResponseHandler, TsoaResponse } from '../../config/tsoaResponse.js';
import { Request as ExRequest } from 'express';
import { AddressesCreateRequestDto, AddressesGetRequestDto } from './dto/addresses.req.dto.js';
import { ForbiddenError } from '../auth/auth.error.js';
import { AddressesResponseDto } from './dto/addresses.res.dto.js';

@Route('addresses')
@Tags('Addresses Router')
export class AddressesController extends Controller {
  private addressesService: AddressesService;
  constructor() {
    super();
    this.addressesService = new AddressesService();
  }

  /**
   * @summary 사용자의 주소록을 불러옵니다.
   * @description 사용자의 주소를 조회합니다. 기본 주소가 첫번째 순서로 조회됩니다.
   * @returns 주소 조회 결과
   */
  @Security('jwt', ['user'])
  @Get('/')
  @SuccessResponse(200, '주소 조회 성공')
  @Response<ErrorResponse>('400', '주소 조회 오류')
  @Response<ErrorResponse>('500', '서버 내부 오류')
  public async getAddresses(
    @Query() page: number = 1,
    @Query() limit: number = 15,
    @Query() createdAtOrder: 'asc' | 'desc' = 'asc',
    @Request() req: ExRequest
  ): Promise<TsoaResponse<AddressesResponseDto[]>> {
    const payload = (req as any).user;
    if (payload.role !== 'user') {
      throw new ForbiddenError('사용자만 주소를 조회할 수 있습니다.');
    }
    const userId = payload.id;
    const dto = new AddressesGetRequestDto(page, limit, userId, createdAtOrder);
    const addresses = await this.addressesService.getAddresses(dto);
    return new ResponseHandler<AddressesResponseDto[]>(addresses);
  }

  /**
   * @summary 주소록에 주소를 추가합니다.
   * @description 주소록에 주소를 추가합니다.
   * @returns 주소 추가 결과
   */
  @Security('jwt', ['user'])
  @Post('/')
  @SuccessResponse(200, '주소 추가 성공')
  @Response<ErrorResponse>('400', '주소 추가 오류')
  @Response<ErrorResponse>('500', '서버 내부 오류')
  public async createAddress(
    @Body() requestBody: AddressesCreateRequestDto, @Request() req: ExRequest
  ): Promise<TsoaResponse<AddressesResponseDto>> {
    const payload = (req as any).user;
    if (payload.role !== 'user') {
      throw new ForbiddenError('사용자만 주소를 추가할 수 있습니다.');
    }
    const userId = payload.id;
    const address = await this.addressesService.createAddress(userId, requestBody);
    return new ResponseHandler<AddressesResponseDto>(address);
  }

  /**
   * @summary 주소록에 주소를 삭제합니다.
   * @description 주소록에 주소를 삭제합니다.
   * @returns 주소 삭제 결과
   */

  @Security('jwt', ['user'])
  @Delete('/{addressId}')
  @SuccessResponse(200, '주소 삭제 성공')
  @Response<ErrorResponse>('400', '주소 삭제 오류')
  @Response<ErrorResponse>('500', '서버 내부 오류')
  public async deleteAddress(
    @Path() addressId: string, @Request() req: ExRequest
  ): Promise<TsoaResponse<string>> {
    const payload = (req as any).user;
    if (payload.role !== 'user') {
      throw new ForbiddenError('사용자만 주소를 삭제할 수 있습니다.');
    }
    const userId = payload.id;
    const result = await this.addressesService.deleteAddress(userId, addressId);
    return new ResponseHandler<string>(result);
  }
}