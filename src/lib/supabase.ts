import type { UserProfile, Repository, Analysis, TechSkill } from '@/types';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase client (anon key — read-only safe)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side admin client (service role key — only used in API routes)
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

// ──────────────────────────────────────────
// User Profile helpers
// ──────────────────────────────────────────

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data as UserProfile;
}

// ──────────────────────────────────────────
// Repository helpers
// ──────────────────────────────────────────


export async function upsertRepository(
  adminClient: ReturnType<typeof createAdminClient>,
  repo: Omit<Repository, 'id' | 'created_at'>
): Promise<Repository | null> {
  const { data, error } = await adminClient
    .from('repositories')
    .upsert(repo, { onConflict: 'github_repo_id' })
    .select()
    .single();
  if (error) {
    console.error('[upsertRepository]', error);
    return null;
  }
  return data as Repository;
}
// ──────────────────────────────────────────
// Analysis helpers
// ──────────────────────────────────────────


export async function createAnalysisJob(
  adminClient: ReturnType<typeof createAdminClient>,
  job: Pick<Analysis, 'user_id' | 'repository_id' | 'commit_sha' | 'commit_message'>
): Promise<Analysis | null> {
  const { data, error } = await adminClient
    .from('analyses')
    .insert({ ...job, status: 'pending' })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') {
      // Duplicate — commit already analyzed; return existing
      const { data: existing } = await adminClient
        .from('analyses')
        .select('*')
        .eq('commit_sha', job.commit_sha)
        .eq('user_id', job.user_id)
        .single();
      return existing as Analysis;
    }
    console.error('[createAnalysisJob]', error);
    return null;
  }
  return data as Analysis;
}

export async function updateAnalysis(
  adminClient: ReturnType<typeof createAdminClient>,
  id: string,
  updates: Partial<Analysis>
): Promise<void> {
  const { error } = await adminClient
    .from('analyses')
    .update(updates)
    .eq('id', id);
  if (error) console.error('[updateAnalysis]', error);
}
// ──────────────────────────────────────────
// Tech Skill helpers
// ──────────────────────────────────────────


export async function upsertTechSkill(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  techName: string,
  xpToAdd: number
): Promise<void> {
  // Try to increment XP if row exists, otherwise insert
  const { data: existing } = await adminClient
    .from('tech_skills')
    .select('id, xp')
    .eq('user_id', userId)
    .eq('tech_name', techName)
    .single();

  if (existing) {
    const newXP = existing.xp + xpToAdd;
    const newLevel = Math.floor(newXP / 1000) + 1;
    await adminClient
      .from('tech_skills')
      .update({ xp: newXP, level: newLevel, last_used_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    const level = Math.floor(xpToAdd / 1000) + 1;
    await adminClient
      .from('tech_skills')
      .insert({ user_id: userId, tech_name: techName, xp: xpToAdd, level, last_used_at: new Date().toISOString() });
  }
}
