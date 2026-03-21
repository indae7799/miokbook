# node_modules가 뭔가요?

## 1. node_modules란?

- **의존성 패키지가 들어 있는 폴더**입니다.
- `package.json`에 적힌 라이브러리(next, react, zod, typescript 등)를 설치하면, 그 코드가 `node_modules` 안에 내려받아집니다.
- 이 폴더가 있어야 `next`, `tsc`, `pnpm` 같은 **실행 파일**과 **import할 코드**를 찾을 수 있습니다.

**정리:** 설치하면 생기는 폴더고, 없으면 “모듈을 찾을 수 없음” / “tsc를 찾을 수 없음” 같은 오류가 납니다. **설치해서 생기는 것이 정상**이고, 지우면 오류가 나는 쪽입니다.

---

## 2. 이 프로젝트는 폴더가 두 군데 있습니다

| 위치 | 누가 만듦 | 용도 |
|------|-----------|------|
| **루트 `node_modules`** | `pnpm install` (루트에서 실행) | 워크스페이스 전체: packages/schemas, packages/utils, functions, 루트 스크립트. 여기 있는 `tsc` 등으로 스키마 타입체크 등 실행 |
| **apps/web/node_modules** | `npm install` (apps/web에서 실행, 또는 `pnpm run dev` 첫 실행 시 스크립트가 자동 실행) | 웹앱 전용: Next.js, React, Tailwind, PostCSS 등. **개발 서버(3000)** 는 여기만 사용 |

- **루트 설치** → 스키마/함수/타입체크/빌드 등
- **apps/web 설치** → 실제로 보는 웹 개발 서버

둘 다 있어야 하고, **서로 덮어쓰지 않습니다.** 루트에서 `pnpm install` 해도 apps/web 쪽은 그대로 둔 상태라서, **설치하면 문제 생기는 게 아니라, 없을 때 오류가 나는 구조**입니다.

---

## 3. “설치하면 문제가 생기는 건가?”

- **아닙니다.**  
  - 루트에서 `pnpm install` 하면: 스키마 타입체크, functions, 기타 워크스페이스 작업이 정상 동작합니다.  
  - apps/web은 이미 별도로 `npm install` 된 상태라서, 웹 개발 서버는 계속 `apps/web/node_modules`만 사용합니다.
- **문제가 되는 경우**는 오히려:
  - 루트 `node_modules`가 없을 때 → `tsc` 못 찾음, 스키마/패키지 관련 오류
  - apps/web `node_modules`가 없을 때 → `next` 못 찾음, 개발 서버 오류

그래서 **“이걸 설치하면 문제가 생기는지?”** → 아니요. **설치해 두는 게 맞고, 없을 때 오류가 납니다.**

---

## 4. 한 번만 해두면 되는 것

- **프로젝트 루트**에서 한 번:
  ```bash
  pnpm install
  ```
  → 루트 `node_modules` 채워짐. 스키마 타입체크, functions 등 사용 가능.

- **웹 개발 서버**는 지금처럼:
  ```bash
  pnpm run dev
  ```
  → 첫 실행 시 `apps/web`에 `node_modules` 없으면 스크립트가 그 안에서 `npm install` 한 번 돌리고, 이후엔 그대로 `npm run dev`로 3000 서버 실행.

정리하면, **node_modules는 “설치 결과물”이라서 설치해 두는 게 맞고, 루트 한 번 + 웹 첫 실행 한 번이면 이후에는 오류 없이 쓰기 좋은 상태가 됩니다.
