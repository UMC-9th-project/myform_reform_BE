# MyForm Reform

UMC 9기 내폼리폼의 백엔드 리포지토리입니다.

## 기술 스택

- **Runtime**: Node.js(v23.9.0)
- **Language**: TypeScript(tsc version 5.8.3)
- **Framework**: Express (v5.2.0)
- **API Documentation**: TSOA + Swagger UI (v11.6.4)
- **Testing**: Jest + ts-jest
- **Linting**: ESLint + Prettier
- **Logging**: Morgan

## 프로젝트 구조(DDD/ Domain Driven Design)

```text
myform_reform/
├── src/
│   ├── app.ts                 # Express 애플리케이션 진입점
│   ├── config/                # 설정 파일
│   │   ├── swagger.json       # Swagger 문서
│   │   └── tsoaResponse.ts    # TSOA 응답 설정
│   └── routes/                # API 라우트
│       ├── tsoaRoutes.ts      # TSOA 생성 라우트
│       └── user/              # 각 도메인 라우트 라우트
│           ├── user.controller.ts
│           ├── user.service.ts
│           ├── user.model.ts
│           └── user.spec.ts
├── jest.config.js             # Jest 테스트 설정
├── tsconfig.json              # TypeScript 설정
└── package.json
```

## 테스팅

```bash
npm test
```

테스트 파일은 다음 위치에 작성합니다:

- `**/__test__/*.test.ts`
- `**/src/routes/**/*.spec.ts`

## 라이선스

ISC
