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

---

## 커밋 컨벤션

커밋은 3가지 부분으로 이루어집니다.

```bash
<type> : <header>

<body>

<footer>
```

`<type>` : 어떤 내용의 커밋인지 선언합니다. 대문자로 시작합니다.

```bash
1. Feat : 기능추가 , 삭제 , 변경
2. Fix : 버그 수정
3. Refactor : 코드 구조 변경, 리팩토링
4. Test :  테스트코드 작성
5. Docs : 문서 작성, 변경
6. Etc : 위에 해당하지 않는 여러 사유, 제목에 상세히 명시
```

`<header>` : 커밋의 제목을 선언합니다. ~~구현, ~~수정 등, 단순하고 명확하게 작성합니다.

<body> : 실제 구현한 내용을 작성합니다. 헤더에서 충분히 설명 되었다면 생략 가능합니다.

<footer> : 참조할 레퍼런스가 있다면 작성합니다. 생략 가능합니다.

eg)

```bash
Feat : 비밀번호 암호화 추가

user.service에 비밀번호 hash로직을 추가하였습니다.

Issue#1234
```

3가지 부분은 공백으로 구분하여 작성합니다.

---

## 네이밍 컨벤션

### 1. 변수 및 함수

- camelCase를 사용합니다.

```typescript
// ✅ Good
const userName = 'John';
function getUserData() {}

// ❌ Bad
const user_name = 'John';
function GetUserData() {}
```

### 2. 클래스 및 타입

- PascalCase를 사용합니다.

```typescript
// ✅ Good
class UserService {}
type UserData = {};
interface FormData {}

// ❌ Bad
class userService {}
type userData = {};
interface formData {}
```

### 3. 함수

- 함수 이름은 camelCase를 사용합니다.

```typescript
// ✅ Good
function calculateTotal() {}
const processData = () => {};

// ❌ Bad
function CalculateTotal() {}
const ProcessData = () => {};
```

---

## 코드 품질

### 1. 변수 선언

- var 사용 금지, const 또는 let을 사용합니다.
- 가능한 경우 const를 우선합니다.

```typescript
// ✅ Good
const count = 10;
let index = 0;

// ❌ Bad
var count = 10;
```

### 2. 한 줄에 하나의 변수 선언

```typescript
// ✅ Good
const firstName = 'John';
const lastName = 'Doe';

// ❌ Bad
const firstName = 'John',
  lastName = 'Doe';
```

### 3. 미사용 변수

- 사용하지 않는 변수는 경고가 발생합니다.

```typescript
// ❌ Bad
const unusedVariable = 10;
```

### 4. 동등 비교

- 엄격한 비교 연산자(===, !==)만 사용합니다.

```typescript
// ✅ Good
if (value === 10) {
}
if (str !== '') {
}

// ❌ Bad
if (value == 10) {
}
if (str != '') {
}
```

## 라이선스

ISC
