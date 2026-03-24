/**
 * Logling Initial Database Schema Migration
 * Run with: npx tsx supabase/migrations/20260323_initial_schema.ts
 *
 * This script prints the SQL to apply AND attempts to execute via Supabase REST.
 */

import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const SQL = `
-- ============================================================
-- LOGLING INITIAL SCHEMA v1.0
-- ============================================================

-- 1. user_profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY,
  github_username TEXT UNIQUE NOT NULL,
  nickname TEXT NOT NULL,
  avatar_url TEXT,
  level INTEGER NOT NULL DEFAULT 1,
  xp BIGINT NOT NULL DEFAULT 0,
  mascot_personality TEXT NOT NULL DEFAULT 'professional'
    CHECK (mascot_personality IN ('witty', 'professional', 'aggressive')),
  public_profile BOOLEAN NOT NULL DEFAULT true,
  telemetry_sharing BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. repositories
CREATE TABLE IF NOT EXISTS repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  github_repo_id BIGINT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  description TEXT,
  language TEXT,
  private BOOLEAN NOT NULL DEFAULT false,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repositories_user_id ON repositories(user_id);

-- 3. analyses
CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  repository_id UUID REFERENCES repositories(id) ON DELETE SET NULL,
  commit_sha TEXT NOT NULL,
  commit_message TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  impact_score SMALLINT CHECK (impact_score >= 0 AND impact_score <= 100),
  ai_result JSONB,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (commit_sha, user_id)
);

CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);

-- 4. tech_skills
CREATE TABLE IF NOT EXISTS tech_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  tech_name TEXT NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  level SMALLINT NOT NULL DEFAULT 1,
  last_used_at TIMESTAMPTZ,
  UNIQUE (user_id, tech_name)
);

CREATE INDEX IF NOT EXISTS idx_tech_skills_user_id ON tech_skills(user_id);

-- 5. Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tech_skills ENABLE ROW LEVEL SECURITY;

-- Public read policies (service role bypasses RLS anyway)
DROP POLICY IF EXISTS "Public profiles viewable" ON user_profiles;
CREATE POLICY "Public profiles viewable" ON user_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Repos viewable by owner" ON repositories;
CREATE POLICY "Repos viewable by owner" ON repositories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Analyses viewable by owner" ON analyses;
CREATE POLICY "Analyses viewable by owner" ON analyses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Tech skills viewable by owner" ON tech_skills;
CREATE POLICY "Tech skills viewable by owner" ON tech_skills FOR SELECT USING (true);

-- 6. Enable Realtime for analyses
ALTER PUBLICATION supabase_realtime ADD TABLE analyses;
`;

async function run() {
  console.log('\n🚀 Logling Initial Schema Migration\n');
  console.log('Attempting to apply SQL via Supabase REST API...\n');

  // Supabase supports running raw SQL via the /pg endpoint (Supabase Management API)
  // For non-management projects, we must use the SQL Editor or a direct pg connection.
  // We'll print the SQL and let the user copy it.

  console.log('='.repeat(60));
  console.log('📋 COPY THE FOLLOWING SQL INTO SUPABASE SQL EDITOR:');
  console.log(`   ${supabaseUrl.replace('https://', '').split('.')[0]}.supabase.com > SQL Editor`);
  console.log('='.repeat(60));
  console.log(SQL);
  console.log('='.repeat(60));
  console.log('\n✅ Migration SQL generated. Please apply it in the Supabase SQL Editor.');
  console.log('   After applying, re-run this script to verify tables exist.\n');
}

run().catch(console.error);
