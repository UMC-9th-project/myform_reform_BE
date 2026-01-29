import { AddressesRequestDto } from './dto/addresses.req.dto.js';
import { AddressesResponseDto } from './dto/addresses.res.dto.js';
import { AddressesRepository } from './addresses.repository.js';
import { AddressesGetError } from './addresses.error.js';
export class AddressesService {
  private addressesRepository: AddressesRepository;
  constructor() {
    this.addressesRepository = new AddressesRepository();
  }
  async getAddresses(dto: AddressesRequestDto): Promise<AddressesResponseDto[]> {   
    try {
      const addresses = await this.addressesRepository.getAddresses(dto);
      return addresses.map((address) => new AddressesResponseDto(address));
    } catch (error) {
      console.error(error);
      throw new AddressesGetError('주소 조회 중 오류가 발생했습니다.');
    }
  }

}