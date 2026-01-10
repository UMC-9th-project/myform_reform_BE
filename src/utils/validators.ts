import { InputValidationError } from '../middleware/error.js';

export const validatePhoneNumber = (phoneNumber: string): void => {
  //한국 전화번호 형식 (하이픈 포함 또는 미포함)
  const phoneNumberRegex = /^01[016789]-?\d{3,4}-?\d{4}$/;

  if(!phoneNumberRegex.test(phoneNumber)){
    throw new InputValidationError(`유효하지 않은 전화번호 형식입니다. 입력받은 전화번호 : ${phoneNumber}`);
  }
};

export const validateCode = (code: string): void => {
  const codeRegex = /^[0-9]{6}$/;
  if(!codeRegex.test(code)){
    throw new InputValidationError(`유효하지 않은 인증 코드 형식입니다. 입력받은 인증 코드 : ${code}`);
  }
};