import { InputValidationError, InvalidDescriptionLengthError, InvalidBusinessNumberError, InvalidPhotoNumberError } from '../routes/auth/auth.error.js';

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

export const validateTermsAgreement = (over14YearsOld: boolean, termsOfService: boolean): void => {
  // 14세 이상 조건에 동의하지 않았으면 예외 발생
  if (!over14YearsOld || !termsOfService){
    throw new InputValidationError('필수 약관에 모두 동의하지 않았습니다.');
  }
}

export const validateEmail = (email: string): void => {
  const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)){
    throw new InputValidationError(`유효하지 않은 이메일 형식입니다. 입력받은 이메일 : ${email}`);
  }
}

export const validateNickname = (
  nickname: string
): void => {
  // 닉네임 규칙 : 영문, 한글, 숫자만 허용 띄어쓰기 특수문자 비허용, 2자 이상 10자 이하
  const nicknameRegex = /^[a-zA-Z0-9가-힣]{2,10}$/;
  if (!nicknameRegex.test(nickname)){
    throw new InputValidationError(`유효하지 않은 닉네임 형식입니다. 입력받은 닉네임 : ${nickname}`);
  }
}

export const validatePassword = (password: string): void => {
  // 영문, 숫자, 특수문자가 들어간 8자 이상 32자 이하 조합
  const passwordRegex = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,32}$/;
  if (!passwordRegex.test(password)){
    throw new InputValidationError(`유효하지 않은 비밀번호 형식입니다. 입력받은 비밀번호 : ${password}`);
  }
}

export const validateRegistrationType = (
  registration_type: 'LOCAL' | 'KAKAO',
  oauthId?: string,
  password?: string
): void => {
  if (registration_type === 'LOCAL') {
    if (oauthId) {
      throw new InputValidationError('로컬 회원가입 시 oauthId가 필요없습니다.');
    }
    if (!password) {
      throw new InputValidationError('로컬 회원가입 시 비밀번호가 필요합니다.');
    }
  } else {
    if (!oauthId) {
      throw new InputValidationError('OAuth 회원가입 시 oauthId가 필요합니다.');
    }
  }
};

export const validateBusinessNumber = (businessNumber: string): void => {
  if (!/^[0-9]{3}-[0-9]{2}-[0-9]{5}$/.test(businessNumber)){
    throw new InvalidBusinessNumberError(`${businessNumber} 는 올바른 사업자 번호 형식이 아닙니다.`);
  }
}

export const validateDescription = (description: string): void => {
  if (!description || description.length < 1 || description.length > 500){
    throw new InvalidDescriptionLengthError('자기 소개의 길이가 적절하지 않습니다. 1자 이상 500자 이하로 입력해주세요.');
  }
}

export const validatePortfolioPhotos = (portfolioPhotos: Express.Multer.File[]): void => {
  if (portfolioPhotos.length === 0 || portfolioPhotos.length > 9){
    throw new InvalidPhotoNumberError('입력한 사진의 개수가 올바르지 않습니다. 1장 이상 9장 이하로 업로드해주세요.');
  }
}