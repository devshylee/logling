import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createAdminClient, getUserProfile, createAnalysisJob, updateAnalysis } from '@/lib/supabase';
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

  const accessToken = session.accessToken;
  if (!accessToken) {
    return Response.json({ error: 'GitHub access token not available' }, { status: 403 });
  }

  const { repoFullName, commitSha, commitMessage, repositoryId } = body;

  if (!repoFullName || !commitSha) {
    return Response.json({ error: 'Missing repoFullName or commitSha' }, { status: 400 });
  }

  const admin = createAdminClient();

  const userId = session.user.id;
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

  // Mark as processing before returning to ensure state integrity
  await updateAnalysis(admin, analysisJob.id, { status: 'processing' });

  // Fire background processing — don't await
  // This returns immediately to the client with 'processing'
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
      await updateAnalysis(admin, analysisJob.id, { 
        status: 'failed', 
        error_message: error instanceof Error ? error.message : 'Unknown background error' 
      });
    }
  });

  return Response.json({
    jobId: analysisJob.id,
    status: 'processing',
    message: '🔍 Logling이 분석을 시작했어요! 잠시 후 결과가 나타납니다.',
  });
}
