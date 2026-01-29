import { BasicError } from "../../middleware/error.js";

export class AddressesGetError extends BasicError {
    constructor(description: string) {
        super(400, 'Addresses_100', '주소 조회 오류', description);
    }
}