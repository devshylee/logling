import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createAdminClient, upsertRepository } from '@/lib/supabase';
import { fetchUserRepositories } from '@/features/analysis/githubFetcher';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const accessToken = session.accessToken;

  if (!accessToken) {
    return Response.json({ error: 'GitHub access token not available' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const forceSync = searchParams.get('force') === 'true';

  try {
    const admin = createAdminClient();

    // Cache Guard: Check if a sync happened in the last 10 minutes (skip if forceSync is true)
    const { data: recentSync, error: syncError } = !forceSync ? await admin
      .from('repositories')
      .select('last_synced_at, full_name, github_repo_id, description, language, private')
      .eq('user_id', userId)
      .gt('last_synced_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .limit(1) : { data: null, error: null };

    if (!forceSync && recentSync && recentSync.length > 0) {
      // Fetch all from DB instead of GitHub if cached
      const { data: dbRepos } = await admin
        .from('repositories')
        .select('github_repo_id, full_name, description, language, private')
        .eq('user_id', userId);

      // Map to GitHub API format for frontend compat (id -> id)
      const mappedRepos = (dbRepos || []).map(r => ({ ...r, id: r.github_repo_id }));
      return Response.json({ repos: mappedRepos, cached: true });
    }

    const githubRepos = await fetchUserRepositories(accessToken);

    // Sync repos to Supabase
    await Promise.all(
      githubRepos.map((repo) =>
        upsertRepository(admin, {
          user_id: userId,
          github_repo_id: repo.id,
          full_name: repo.full_name,
          description: repo.description,
          language: repo.language,
          private: repo.private,
          last_synced_at: new Date().toISOString(),
        })
      )
    );

    return Response.json({ repos: githubRepos, cached: false });
  } catch (error: unknown) {
    console.error('[/api/repositories] Error:', error);
    return Response.json({ error: 'Failed to fetch repositories' }, { status: 500 });
  }
}
