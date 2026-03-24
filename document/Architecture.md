## 🏗️ 1. 아키텍처: 이벤트 기반 서버리스 (Event-Driven)

Next.js와 Supabase를 사용하기로 했으므로, 모든 로직을 동기(Sync)로 처리하면 AI 분석 대기 시간 때문에 UX가 망가집니다. 따라서 **비동기 처리**가 핵심입니다.

- **흐름:** 1. 사용자가 '분석' 클릭 → Next.js에서 Supabase에 `status: pending`으로 기록 (즉시 응답).
2. Supabase의 **Edge Functions** 또는 **Webhook**이 분석 요청을 감지.
3. 백그라운드에서 Gemini AI가 분석 수행 → 결과를 DB에 업데이트.
4. 프론트엔드에서는 **Supabase Realtime**을 통해 "분석 완료!" 알림을 받고 화면 갱신.
- **장점:** AI 분석이 10초 이상 걸려도 브라우저 타임아웃이 나지 않고, 사용자는 다른 페이지를 구경하며 기다릴 수 있습니다.

---

## 📁 2. 프로젝트 폴더 구조: 기능 중심 (Feature-based)

Next.js App Router를 쓸 때 `components`, `hooks` 폴더에 모든 걸 다 때려 넣으면 나중에 길을 잃습니다. **기능별로 도메인을 나누는 구조**를 추천합니다.

Plaintext

`src/
├── app/ (Routing & Layout)
│   ├── dashboard/
│   ├── repositories/
│   ├── archive/
│   └── settings/
├── features/ (Domain Logic - 핵심!)
│   ├── auth/          # 로그인, GitHub OAuth
│   ├── analysis/      # Gemini API 연동, Diff 파싱 로직
│   ├── leveling/      # 경험치 계산 공식, 레벨업 트리거
│   └── blog-gen/      # 블로그 템플릿, PDF 생성 로직(추후)
├── components/        # 공통 UI (Button, Input, Card 등)
├── lib/               # 외부 라이브러리 설정 (Supabase Client, Gemini SDK)
└── types/             # 공용 TypeScript 인터페이스`

- **장점:** `leveling` 로직을 수정하고 싶을 때 해당 폴더만 보면 됩니다. 다른 기능에 영향을 주지 않고 독립적으로 개발/테스트하기 좋습니다.

---

## 🔄 3. 개발 방법론: TDD보다는 "에러 기반 반복(Error-driven Iteration)"

AI 프로젝트는 결과값이 매번 미세하게 달라질 수 있어 완벽한 TDD(테스트 주도 개발)가 어렵습니다. 대신 다음 단계를 추천합니다.

1. **MVP First:** 가장 핵심인 `Git Diff -> AI 요약` 기능만 먼저 구현합니다.
2. **Prompt Versioning:** 프롬프트를 코드 안에 박아두지 말고, 별도의 설정 파일이나 DB에서 관리하세요. (버전 1.0, 1.1... 이렇게 관리해야 퀄리티 비교가 가능합니다.)
3. **Observability:** AI가 이상한 답변을 내뱉거나 에러가 날 때를 대비해 로그를 꼼꼼히 남기세요. (Sentry나 Supabase Log 활용)

---

## 🛠️ 4. 기술적 설계 포인트 (Senior's Secret)

- **건강한 추상화:** Gemini API를 직접 호출하지 말고, `AnalysisProvider` 같은 인터페이스를 만드세요. 나중에 모델을 Claude나 DeepSeek으로 바꿀 때 코드 한 줄만 수정하면 됩니다.
- **멱등성(Idempotency) 보장:** 동일한 커밋 SHA값에 대해 중복 분석이 일어나지 않도록 DB 제약 조건(`UNIQUE`)을 잘 설계하세요. 사용자의 토큰은 소중하니까요.