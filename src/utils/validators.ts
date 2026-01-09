import { InputValidationError } from "../middleware/error.js";

export const validatePhoneNumber = (phoneNumber: string): void => {
  //한국 전화번호 형식 (하이픈 포함 또는 미포함)
  const phoneNumberRegex = /^01[016789]-?\d{3,4}-?\d{4}$/;

  if(!phoneNumberRegex.test(phoneNumber)){
    throw new InputValidationError('유효하지 않은 전화번호 형식입니다. (01x 시작, 숫자 10-11자리)');
  }
};