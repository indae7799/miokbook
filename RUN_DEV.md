# 개발 서버 실행 방법

**반드시 아래 둘 중 하나로만 실행하세요.**

## 방법 1 (권장) — 루트에서

```powershell
cd "c:\Users\jungindae\Desktop\온라인미옥"
pnpm run dev
```

- `scripts/run-next.js`가 `apps/web`에서 `npm install`(필요 시) 후 `npm run dev`를 실행합니다.
- `Ready in ...` / `Local: http://localhost:5175` 가 보이면 **http://localhost:5175** 로 접속하세요.

## 방법 2 — apps/web에서 직접

```powershell
cd "c:\Users\jungindae\Desktop\온라인미옥\apps\web"
npm install
npm run dev
```

- 루트에서 `pnpm --filter web run dev` 처럼 **pnpm으로 web만 실행하면 안 됩니다.**  
  (의존성이 `apps/web/node_modules`에 없어 `Module not found` 가 날 수 있음)

---

## Module not found (@tanstack/react-query 등) 가 나올 때

1. **실행 위치 확인**  
   위 "방법 1" 또는 "방법 2"로만 실행했는지 확인하세요.

2. **캐시 삭제 후 재실행**

```powershell
cd "c:\Users\jungindae\Desktop\온라인미옥\apps\web"
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm install
npm run dev
```

3. 그래도 안 되면 `apps\web\node_modules` 를 지운 뒤 다시 `npm install` 후 `npm run dev`.

---

- 종료: 터미널에서 `Ctrl+C`
- 포트 5175가 이미 사용 중이면 기존 프로세스를 종료한 뒤 다시 실행하세요.
