import { AddressesCreateInput, AddressesCreateRequestDto, AddressesGetRequestDto } from './dto/addresses.req.dto.js';
import { AddressesResponseDto } from './dto/addresses.res.dto.js';
import { AddressesRepository } from './addresses.repository.js';
import { AddressesGetError } from './addresses.error.js';
import { runInTransaction } from '../../config/prisma.config.js';
import { validatePhoneNumber } from '../../utils/validators.js';
import { InputValidationError } from '../auth/auth.error.js';
export class AddressesService {
  private addressesRepository: AddressesRepository;
  constructor() {
    this.addressesRepository = new AddressesRepository();
  }
  async getAddresses(dto: AddressesGetRequestDto): Promise<AddressesResponseDto[]> {   
    try {
      const addresses = await this.addressesRepository.getAddresses(dto);
      return addresses.map((address) => new AddressesResponseDto(address));
    } catch (error) {
      console.error(error);
      throw new AddressesGetError('주소 조회 중 오류가 발생했습니다.');
    }
  }

  async createAddress(userId: string, requestBody: AddressesCreateRequestDto): Promise<AddressesResponseDto> {
    return await runInTransaction(async () => {
      const input = new AddressesCreateInput(userId, requestBody);
      const address = await this.addressesRepository.createAddress(input);
      return new AddressesResponseDto(address);
    });
  }
  private validateAddress(requestBody: AddressesCreateRequestDto): void {
    const { postalCode, recipient, phone } = requestBody;
    if (postalCode.length !== 5) {
      throw new InputValidationError('유효하지 않은 우편번호 형식입니다. 입력받은 우편번호 : ${postalCode}');
    }
    if (recipient.length === 0) {
      throw new InputValidationError('수령인은 필수 입력 항목입니다.');
    }
    validatePhoneNumber(phone);
  }
}