import type { UserProfile } from '@/types';
import { getLevelFromXP, getXpForImpact } from '@/types';
import { updateAnalysis, upsertTechSkill, createAdminClient } from '@/lib/supabase';

/**
 * Awards XP to a user for a completed analysis.
 * Updates: user_profiles (xp, level), tech_skills for each detected tech.
 */
export async function awardXP(
  userId: string,
  profile: UserProfile,
  impactScore: number,
  techStack: string[]
): Promise<{ newXP: number; newLevel: number; leveledUp: boolean }> {
  const admin = createAdminClient();
  const xpEarned = getXpForImpact(impactScore);
  const newXP = profile.xp + xpEarned;
  const oldLevel = profile.level;
  const newLevel = getLevelFromXP(newXP);
  const leveledUp = newLevel > oldLevel;

  // Update user profile
  await admin
    .from('user_profiles')
    .update({ xp: newXP, level: newLevel })
    .eq('id', userId);

  // Award tech-specific XP (split evenly across detected techs)
  if (techStack.length > 0) {
    const xpPerTech = Math.round(xpEarned / techStack.length);
    await Promise.all(
      techStack.map((tech) => upsertTechSkill(admin, userId, tech, xpPerTech))
    );
  }

  return { newXP, newLevel, leveledUp };
}

/**
 * Processes an analysis job in the background (fire-and-update pattern):
 * 1. Update status to 'processing'
 * 2. Run AI analysis
 * 3. Award XP
 * 4. Update analysis record with results
 */
export async function processAnalysisJob(params: {
  analysisId: string;
  userId: string;
  userProfile: UserProfile;
  diff: string;
  commitMessage: string;
  analyzeCommit: (diff: string, msg: string) => Promise<import('@/types').AIResult>;
}): Promise<void> {
  const { analysisId, userId, userProfile, diff, commitMessage, analyzeCommit } = params;
  const admin = createAdminClient();

  // Mark as processing
  await updateAnalysis(admin, analysisId, { status: 'processing' });

  try {
    const result = await analyzeCommit(diff, commitMessage);

    if (result.errorCode) {
      // It's a failure (e.g. GEMINI_ERROR or EMPTY_DIFF)
      await updateAnalysis(admin, analysisId, {
        status: 'failed',
        error_message: result.errorCode,
        ai_result: result as any, // Save the fallback message for transparency
        xp_awarded: 0,
      });
      return;
    }

    const xpAwarded = getXpForImpact(result.impactScore);

    // Award XP (in background, non-blocking for the DB update)
    await awardXP(userId, userProfile, result.impactScore, result.techStack ?? []);

    // Mark as completed
    await updateAnalysis(admin, analysisId, {
      status: 'completed',
      impact_score: result.impactScore,
      ai_result: result as any,
      xp_awarded: xpAwarded,
      completed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[processAnalysisJob] Failed:', error);
    await updateAnalysis(admin, analysisId, {
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
