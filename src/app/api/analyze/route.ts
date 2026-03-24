import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createAdminClient, getUserProfile, createAnalysisJob } from '@/lib/supabase';
import { fetchCommitDiff } from '@/features/analysis/githubFetcher';
import { getAnalysisProvider } from '@/features/analysis/analysisProvider';
import { processAnalysisJob } from '@/features/leveling/xpCalculator';

// Rate limit: max 50 analyses per day per user
const DAILY_LIMIT = 50;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    repoFullName: string;
    commitSha: string;
    commitMessage: string;
    repositoryId: string;
    accessToken: string;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const accessToken = (session as any).accessToken as string;
  if (!accessToken) {
    return Response.json({ error: 'GitHub access token not available' }, { status: 403 });
  }

  const { repoFullName, commitSha, commitMessage, repositoryId } = body;

  if (!repoFullName || !commitSha) {
    return Response.json({ error: 'Missing repoFullName or commitSha' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Resolve user ID from email
  const { data: profileData } = await admin
    .from('user_profiles')
    .select('id, xp, level, mascot_personality')
    .eq('github_username', session.user.email) // Note: email might not equal GH username — we match via 'id' from token.sub
    .single();

  // Better: look up by session user id stored in token
  // For now we use email as fallback; the NextAuth route stores id as token.sub
  const userId = (session.user as any).id as string;
  if (!userId) {
    return Response.json({ error: 'User ID not found in session' }, { status: 401 });
  }

  const userProfile = await getUserProfile(userId);
  if (!userProfile) {
    return Response.json({ error: 'User profile not found. Please sign in again.' }, { status: 404 });
  }

  // Check daily rate limit
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count } = await admin
    .from('analyses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', today.toISOString());

  if ((count ?? 0) >= DAILY_LIMIT) {
    return Response.json(
      { error: `Daily analysis limit (${DAILY_LIMIT}) reached. Try again tomorrow!` },
      { status: 429 }
    );
  }

  // Create the analysis job (returns existing if duplicate commit SHA)
  const analysisJob = await createAnalysisJob(admin, {
    user_id: userId,
    repository_id: repositoryId,
    commit_sha: commitSha,
    commit_message: commitMessage,
  });

  if (!analysisJob) {
    return Response.json({ error: 'Failed to create analysis job' }, { status: 500 });
  }

  // If already completed, return the existing result
  if (analysisJob.status === 'completed') {
    return Response.json({ jobId: analysisJob.id, status: 'completed', result: analysisJob.ai_result });
  }

  // Fire background processing — don't await
  // This returns immediately to the client with 'pending'
  setImmediate(async () => {
    try {
      const diff = await fetchCommitDiff(accessToken, repoFullName, commitSha);
      const analyzer = getAnalysisProvider();
      await processAnalysisJob({
        analysisId: analysisJob.id,
        userId,
        userProfile,
        diff,
        commitMessage,
        analyzeCommit: (d, m) => analyzer.analyze(d, m),
      });
    } catch (error) {
      console.error('[analyze/route] Background job failed:', error);
    }
  });

  return Response.json({
    jobId: analysisJob.id,
    status: 'pending',
    message: '🔍 Logling이 분석을 시작했어요! 잠시 후 결과가 나타납니다.',
  });
}
