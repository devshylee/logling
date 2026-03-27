/**
 * generationRateLimiter.ts
 *
 * Server-side utility for enforcing daily blog generation limits per user plan.
 *
 * Plan limits (can be extended for future subscription BM):
 *   free       → DAILY_LIMITS.free       (3  / day)
 *   pro        → DAILY_LIMITS.pro        (20 / day)
 *   enterprise → DAILY_LIMITS.enterprise (-1 = unlimited)
 *
 * Uses `daily_generation_logs` table in Supabase.
 * Must be called with the Supabase service-role client (bypasses RLS).
 */

import { createClient } from '@supabase/supabase-js';

// --------------------------------------------------------------------------
// Plan configuration — central place to change limits per tier
// --------------------------------------------------------------------------
export const DAILY_LIMITS: Record<string, number> = {
  free: 3,
  pro: 20,
  enterprise: -1, // -1 means unlimited
};

// --------------------------------------------------------------------------
// Rate Limit Check Result
// --------------------------------------------------------------------------
export type RateLimitResult =
  | { allowed: true; remaining: number; limit: number }
  | { allowed: false; remaining: 0; limit: number; resetAt: string };

// --------------------------------------------------------------------------
// Core function
// --------------------------------------------------------------------------

/**
 * Checks and increments the daily generation counter for a user.
 *
 * @param userId   - UUID from user_profiles (NextAuth user id)
 * @returns RateLimitResult — whether the request is allowed, and remaining quota
 */
export async function checkAndIncrementGenerationLimit(
  userId: string
): Promise<RateLimitResult> {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Fetch user plan
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .select('plan')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    console.error('[RateLimit] Failed to fetch user profile:', profileError?.message);
    // Fail open conservatively: treat as free plan
  }

  const plan: string = profile?.plan ?? 'free';
  const dailyLimit: number = DAILY_LIMITS[plan] ?? DAILY_LIMITS.free;

  // Unlimited plan — skip all checks
  if (dailyLimit === -1) {
    return { allowed: true, remaining: -1, limit: -1 };
  }

  // 2. Get today's log (UTC date)
  const todayUtc = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"

  const { data: log, error: logError } = await supabaseAdmin
    .from('daily_generation_logs')
    .select('id, count')
    .eq('user_id', userId)
    .eq('log_date', todayUtc)
    .maybeSingle();

  if (logError) {
    console.error('[RateLimit] Failed to fetch daily log:', logError.message);
    // Fail open to avoid blocking on DB errors
    return { allowed: true, remaining: dailyLimit, limit: dailyLimit };
  }

  const currentCount = log?.count ?? 0;

  // 3. Check limit
  if (currentCount >= dailyLimit) {
    // Calculate UTC midnight reset time
    const resetAt = new Date(`${todayUtc}T00:00:00Z`);
    resetAt.setUTCDate(resetAt.getUTCDate() + 1);

    return {
      allowed: false,
      remaining: 0,
      limit: dailyLimit,
      resetAt: resetAt.toISOString(),
    };
  }

  // 4. Increment counter (upsert)
  const { error: upsertError } = await supabaseAdmin
    .from('daily_generation_logs')
    .upsert(
      {
        user_id: userId,
        log_date: todayUtc,
        count: currentCount + 1,
      },
      { onConflict: 'user_id,log_date' }
    );

  if (upsertError) {
    console.error('[RateLimit] Failed to increment daily log:', upsertError.message);
    // Fail open — don't block the user on write errors
  }

  return {
    allowed: true,
    remaining: dailyLimit - (currentCount + 1),
    limit: dailyLimit,
  };
}

/**
 * Returns the current usage info for a user (read-only, no increment).
 * Useful for displaying remaining quota on the frontend.
 */
export async function getGenerationUsage(userId: string): Promise<{
  plan: string;
  limit: number;
  used: number;
  remaining: number;
  resetAt: string;
}> {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const todayUtc = new Date().toISOString().split('T')[0];

  try {
    const [{ data: profile, error: profileError }, { data: log, error: logError }] = await Promise.all([
      supabaseAdmin.from('user_profiles').select('plan').eq('id', userId).single(),
      supabaseAdmin
        .from('daily_generation_logs')
        .select('count')
        .eq('user_id', userId)
        .eq('log_date', todayUtc)
        .maybeSingle(),
    ]);

    if (profileError) console.warn('[Quota] Profile fetch error:', profileError.message);
    if (logError) console.warn('[Quota] Logs fetch error:', logError.message);

    const plan = profile?.plan ?? 'free';
    const limit = DAILY_LIMITS[plan] ?? DAILY_LIMITS.free;
    const used = log?.count ?? 0;
    const remaining = limit === -1 ? -1 : Math.max(0, limit - used);

    const resetAt = new Date(`${todayUtc}T00:00:00Z`);
    resetAt.setUTCDate(resetAt.getUTCDate() + 1);

    return { plan, limit, used, remaining, resetAt: resetAt.toISOString() };
  } catch (err) {
    console.error('[Quota] Unexpected error fetching usage:', err);
    // Fallback to free plan default
    const resetAt = new Date(`${todayUtc}T00:00:00Z`);
    resetAt.setUTCDate(resetAt.getUTCDate() + 1);
    return {
      plan: 'free',
      limit: DAILY_LIMITS.free,
      used: 0,
      remaining: DAILY_LIMITS.free,
      resetAt: resetAt.toISOString()
    };
  }
}
