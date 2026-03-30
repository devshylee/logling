# 📑 요구사항 정의서 (v0.1)

## 1. 프로젝트 개요

- **서비스명:** Logling (로그링)
- **한 줄 정의:** GitHub 활동 데이터를 분석하여 기술 스택 RPG 성장 시스템과 AI 블로그 초안을 제공하는 서비스.
- **핵심 가치:** 시각적 성취감(RPG), 기록의 자동화(AI 요약), 데이터 기반 객관적 성장 증명.

---

## 2. 사용자 스토리

1. **로그인:** 사용자는 GitHub 계정으로 간편하게 로그인하고 본인의 레포지토리를 연동할 수 있다.
2. **데이터 분석:** 사용자는 특정 레포지토리를 선택해 최근 커밋 내역을 분석하고 기술 스택 점수(EXP)를 획득할 수 있다.
3. **성취 확인:** 사용자는 메인 화면에서 마스코트의 피드백을 듣고, 자신의 '기술 스킬 트리'가 성장하는 것을 시각적으로 확인한다.
4. **콘텐츠 생성:** 사용자는 분석된 커밋 데이터를 바탕으로 한 편의 기술 블로그 초안을 생성하고 수정할 수 있다.

## 3. 비기능적 요구사항

### 1. 성능 및 확장성

- **API Rate Limit:** GitHub API 호출 제한을 준수하기 위해 캐싱(Redis) 및 ETag를 필수적으로 활용한다.
- **비동기 처리:** AI 분석 및 데이터 수집은 응답 지연을 방지하기 위해 백그라운드 작업(Task Queue)으로 처리한다.

### 2. 보안

- **토큰 관리:** 사용자의 GitHub Access Token은 암호화하여 DB에 저장한다.
- **개인정보 보호:** 코드 내의 민감 정보(API Key 등)가 LLM으로 전송되기 전 마스킹 처리한다.

## 🏗️ [Logling] 시스템 아키텍처 설계서 (v0.2)

## 1. 시스템 아키텍처 다이어그램

### **데이터 처리 흐름**

1. **Request:** 사용자가 특정 범위(예: 오늘)의 분석을 요청함.
2. **Job Produce:** API 서버는 즉시 `Job ID`를 발급하고 요청을 **Redis(BullMQ)** 큐에 삽입함. (사용자에게는 "분석 시작" 알림 전송)
3. **Caching Check:** 워커(Worker)가 작업을 가져와서 해당 범위의 데이터가 이미 **Redis**나 **DB**에 캐싱 되어 있는지 확인함.
4. **Fetch & Filter:** 캐시가 없다면 **GitHub API**를 호출하여 `diff` 데이터를 가져오고, 불필요한 파일(lock, md 등)을 제거하는 전처리를 수행함.
5. 5. **AI Analysis:** 정제된 데이터를 **Gemini API**에 전달하여 기술 스택 추출 및 블로그 초안 생성.
6. **Store & Sync:** 결과를 **Supabase(PostgreSQL)**에 저장하고, 사용자의 경험치($EXP$)를 업데이트함.
7. 7. **Real-time Notify:** **Supabase Realtime** 혹은 웹소켓을 통해 프론트엔드에 "분석 완료" 상태와 함께 데이터를 전송함.

## 2. 상세 기술 스택

- **Framework(FE+BE):** Next.js 14 (App Router)
- **Auth:** Auth.js (GitHub Provider)
- **Database/Backend-as-a-Service:** Supabase
- **AI:** Google AI SDK (Gemini 1.5 Flash)
- **Styling:** Tailwind CSS + Framer Motion (RPG 연출용)

## 3. 엔지니어링 핵심 포인트

### ① 비동기 작업 처리

사용자가 브라우저를 닫아도 분석은 서버에서 계속 진행돼. 작업이 완료되면 다음 접속 때 마스코트가 "자고 있을 때 분석해뒀어요!"라고 말할 수 있는 구조지.

### ② 분산 환경 고려

API 서버와 분석 워커(Worker)를 분리했기 때문에, 나중에 사용자가 많아지면 분석 서버만 여러 대 늘리는(Scale-out) 것이 가능해.

### ③ 캐싱 전략

동일한 커밋에 대해 다시 분석을 요청할 경우, AI를 다시 부르지 않고 Redis에 저장된 결과를 즉시 반환하여 **비용(Token)을 0원**으로 만들어.

---

## 4. 보안 및 제약 사항

- **OAuth Security:** GitHub Access Token은 DB 저장 시 반드시 암호화(`AES-256`) 처리.
- **Rate Limit:** 무료 유저의 무분별한 호출을 막기 위해 **Throttling** 로직을 Redis 기반으로 구현.
- **Data Masking:** `diff` 내에 포함된 환경 변수(.env)나 API Key 패턴을 AI에게 보내기 전 마스킹 처리.








CUBECORE@DESKTOP-KMF95ML MINGW64 /e/git/logling (qa)
$ npx tsx supabase/migrations/20260326_get_repos_with_stats.ts
[dotenv@17.3.1] injecting env (9) from .env -- tip: ⚙️  suppre
ss all logs with { quiet: true 
}

🚀 Logling RPC Migration: get_repositories_with_stats

============================================================  
📋 COPY THE FOLLOWING SQL INTO 
SUPABASE SQL EDITOR:
============================================================  

-- ============================================================
-- RPC: get_repositories_with_stats
-- Returns repositories with aggregated analysis stats for a user
-- ============================================================

CREATE OR REPLACE FUNCTION get_repositories_with_stats(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    github_repo_id BIGINT,     
    full_name TEXT,
    description TEXT,
    language TEXT,
    private BOOLEAN,
    last_synced_at TIMESTAMPTZ,    created_at TIMESTAMPTZ,    
    analysis_count BIGINT,     
    total_xp BIGINT,
    latest_analysis JSONB      
) LANGUAGE plpgsql AS $$       
BEGIN
    RETURN QUERY
    WITH repo_stats AS (       
        SELECT
            repository_id,     
            COUNT(*) as analysis_count,
            SUM(xp_awarded) as 
total_xp,
            (
                SELECT row_to_json(a)::jsonb
                FROM analyses a
                WHERE a.repository_id = r.id AND a.status = 'completed'
                ORDER BY a.created_at DESC
                LIMIT 1        
            ) as latest_analysis
        FROM analyses a        
        JOIN repositories r ON 
a.repository_id = r.id
        WHERE a.user_id = p_user_id AND a.status = 'completed'        GROUP BY repository_id, r.id
    )
    SELECT
        r.id,
        r.github_repo_id,      
        r.full_name,
        r.description,
        r.language,
        r.private,
        r.last_synced_at,      
        r.created_at,
        COALESCE(rs.analysis_count, 0)::BIGINT as analysis_count,
        COALESCE(rs.total_xp, 0)::BIGINT as total_xp,
        rs.latest_analysis     
    FROM repositories r        
    LEFT JOIN repo_stats rs ON 
r.id = rs.repository_id        
    WHERE r.user_id = p_user_id    ORDER BY r.created_at DESC;END;
$$;

============================================================  

✅ RPC Definition generated. App
ly it in Supabase SQL Editor.  

CUBECORE@DESKTOP-KMF95ML MINGW64 /e/git/logling (qa)
$ cd 'e:\git\logling'

CUBECORE@DESKTOP-KMF95ML MINGW64 /e/git/logling (qa)
$ npx tsx supabase/migrations/20260326_get_repos_with_stats.ts
[dotenv@17.3.1] injecting env (9) from .env -- tip: 🔐 encrypt with Dotenvx: https://dotenvx.com

🚀 Logling RPC Migration: get_repositories_with_stats

============================================================  
📋 COPY THE FOLLOWING SQL INTO 
SUPABASE SQL EDITOR:
============================================================  

-- ============================================================

DROP FUNCTION IF EXISTS get_repositories_with_stats(UUID);    

CREATE OR REPLACE FUNCTION get_repositories_with_stats(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    github_repo_id BIGINT,     
    full_name TEXT,
    description TEXT,
    language TEXT,
    private BOOLEAN,
    last_synced_at TIMESTAMPTZ,    created_at TIMESTAMPTZ,    
    analysis_count BIGINT,     
    total_xp BIGINT,
    latest_analysis JSONB      
) LANGUAGE plpgsql AS $$       
BEGIN
    RETURN QUERY
    WITH repo_stats AS (       
        SELECT
            repository_id,     
            COUNT(*) as analysis_count,
            SUM(xp_awarded) as 
total_xp,
            (
                SELECT row_to_json(a)::jsonb
                FROM analyses a
                WHERE a.repository_id = r.id AND a.status = 'completed'
                ORDER BY a.created_at DESC
                LIMIT 1        
            ) as latest_analysis
        FROM analyses a        
        JOIN repositories r ON 
a.repository_id = r.id
        WHERE a.user_id = p_user_id AND a.status = 'completed'        GROUP BY repository_id, r.id
    )
    SELECT
        r.id,
        r.github_repo_id,      
        r.full_name,
        r.description,
        r.language,
        r.private,
        r.last_synced_at,      
        r.created_at,
        COALESCE(rs.analysis_count, 0)::BIGINT as analysis_count,
        COALESCE(rs.total_xp, 0)::BIGINT as total_xp,
        rs.latest_analysis     
    FROM repositories r        
    LEFT JOIN repo_stats rs ON 
r.id = rs.repository_id        
    WHERE r.user_id = p_user_id    ORDER BY r.created_at DESC;END;
$$;

============================================================  

✅ RPC Definition generated. App
ly it in Supabase SQL Editor.  

CUBECORE@DESKTOP-KMF95ML MINGW64 /e/git/logling (qa)
$ cd 'e:\\git\\logling'

CUBECORE@DESKTOP-KMF95ML MINGW64 /e/git/logling (dev/issue-10)$ npx tsx supabase/migrations/20260327_add_generation_rate_limit.ts
[dotenv@17.3.1] injecting env (9) from .env -- tip: 🛠️  run a 
nywhere with `dotenvx run -- yourcommand`

🚀 Logling Rate Limiting Migration

============================================================  
📋 COPY THE FOLLOWING SQL INTO 
SUPABASE SQL EDITOR:
   xkarizzeljadicahgbng.supabase.com > SQL Editor
============================================================  

-- ============================================================
-- LOGLING RATE LIMITING SCHEMA-- ============================================================

-- 1. Add 'plan' column to user_profiles for future subscription BM
--    Possible values: 'free' | 'pro' | 'enterprise'
--    Daily generation limits per plan:
--      free       → 3  / day  
--      pro        → 20 / day  
--      enterprise → unlimited 
(-1)
ALTER TABLE user_profiles      
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free'  
    CHECK (plan IN ('free', 'pro', 'enterprise'));

-- 2. Create daily_generation_logs table
--    Tracks how many times each user generated a blog post on a given UTC date.
CREATE TABLE IF NOT EXISTS daily_generation_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT 
NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  log_date     DATE        NOT 
NULL DEFAULT CURRENT_DATE,  -- 
UTC date
  count        INTEGER     NOT 
NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT 
NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT 
NULL DEFAULT NOW(),
  UNIQUE (user_id, log_date)   
);

CREATE INDEX IF NOT EXISTS idx_daily_gen_logs_user_date       
  ON daily_generation_logs(user_id, log_date DESC);

DROP TRIGGER IF EXISTS update_daily_gen_logs_updated_at ON daily_generation_logs;
CREATE TRIGGER update_daily_gen_logs_updated_at
  BEFORE UPDATE ON daily_generation_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();   

-- 3. Row Level Security       
ALTER TABLE daily_generation_logs ENABLE ROW LEVEL SECURITY;  

DROP POLICY IF EXISTS "Users can view own logs" ON daily_generation_logs;
CREATE POLICY "Users can view own logs" ON daily_generation_logs
  FOR SELECT USING (true);     

-- Service role bypasses RLS for writes.
-- ============================================================
-- ROLLBACK (manual):
--   DROP TABLE IF EXISTS daily_generation_logs;
--   ALTER TABLE user_profiles 
DROP COLUMN IF EXISTS plan;    
-- ============================================================

============================================================  

✅ Migration SQL generated. Ple✅ Migration SQL generated. Please apply it in the Supabase SQL Editor.E  After applying, re-run this script to verify.
ditor.
   After applying, re-run this script to verify.

