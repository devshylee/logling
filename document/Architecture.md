# Logling 시스템 아키텍처 (System Architecture)

Logling의 전체적인 데이터 흐름과 구성 요소 간의 연결 구조입니다.

```mermaid
graph TD
    subgraph Client ["프론트엔드 (Client Side)"]
        UI["Next.js App (React + Tailwind)"]
        AuthClient["NextAuth.js Client"]
        Realtime["Supabase Realtime (구독)"]
    end

    subgraph Server ["백엔드 (Next.js API Server)"]
        API["API Routes (/api/*)"]
        NextAuth["NextAuth.js (Github OAuth)"]
        AnalysisService["Analysis Provider (내부 로직)"]
    end

    subgraph Worker ["분석 처리 엔진 (Queue & AI)"]
        Queue["BullMQ / Bull (비동기 큐)"]
        Redis[("Redis (작업 대기열/캐시)")]
        GeminiAPI["Google Gemini API (AI 분석)"]
    end

    subgraph Storage ["데이터 저장소 (Cloud Storage)"]
        DB[(Supabase PostgreSQL)]
        StorageAuth["Supabase Auth (세션 관리)"]
    end

    subgraph External ["외부 연동 API (External Services)"]
        GitHubAPI["GitHub API (코드 수집 / Repo 조회)"]
    end

    %% 연결 관계 정의
    UI <--> |HTTP / JSON| API
    UI <--> |OAuth 2.0| NextAuth
    NextAuth <--> GitHubAPI
    
    API <--> AnalysisService
    AnalysisService <--> GitHubAPI
    AnalysisService <--> GeminiAPI
    
    %% 비동기 분석 흐름
    API -.-> |분석 작업 등록| Queue
    Queue <--> Redis
    Queue -.-> AnalysisService
    
    %% DB 연동 루프
    AnalysisService <--> DB
    API <--> DB
    DB -.-> |상태 업데이트 알림| Realtime
    Realtime -.-> |UI 업데이트| UI

    %% 스타일링
    style Redis fill:#f96,stroke:#333,stroke-width:2px
    style DB fill:#3cba54,stroke:#333,stroke-width:2px
    style GeminiAPI fill:#4285f4,stroke:#333,stroke-width:2px
    style GitHubAPI fill:#000,stroke:#fff,stroke-width:1px,color:#fff
```

---

## 🛰️ 주요 서비스 통신 흐름 설명 (Data Cycle)

### 1. 사용자 인증 및 저장소 동기화
- 사용자가 GitHub 계정으로 로그인하면 **NextAuth**가 GitHub API로부터 액세스 토큰을 발급받습니다.
- **Next.js BE**는 이 토큰을 사용하여 사용자의 저장소 목록을 조회하고, **Supabase DB**에 레포지토리 정보를 캐싱합니다.

### 2. 커밋 분석 (퀘스트 수락) 요청
- 사용자가 특정 커밋에 대해 [분석] 버튼을 누르면, **Next.js BE**는 즉시 분석 ID를 생성하고 **Redis/BullMQ** 작업 대기열에 임무를 등록합니다.
- 사용자는 화면에서 '분석 대기 중' 상태를 보며 대기합니다.

### 3. 비동기 AI 분석 프로세스
- **Worker (Analysis Provider)**가 대기열에서 작업을 가져와 **GitHub API**로부터 코드 차이점(Git Diff)을 수집합니다.
- 수집된 코드는 민감 정보 마스킹 처리를 거친 후 **Gemini AI API**로 전달되어 분석 결과(JSON)를 도출합니다.
- 도출된 결과는 **Supabase DB**에 저장되며, 이때 사용자의 **경험치(XP)**가 함께 정산됩니다.

### 4. 실시간 상태 확인 및 결과 도달
- 분석이 완료되어 DB 레코드가 업데이트되면, **Supabase Realtime** 기능을 통해 프론트엔드로 즉시 알림이 전송됩니다.
- 사용자 화면이 '완료' 상태로 실시간 업데이트되며, 분석된 데이터가 화면에 출력됩니다.