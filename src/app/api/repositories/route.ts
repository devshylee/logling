import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createAdminClient, upsertRepository } from '@/lib/supabase';
import { fetchUserRepositories } from '@/features/analysis/githubFetcher';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const accessToken = (session as any).accessToken as string;

  if (!accessToken) {
    return Response.json({ error: 'GitHub access token not available' }, { status: 403 });
  }

  try {
    const githubRepos = await fetchUserRepositories(accessToken);
    const admin = createAdminClient();

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

    return Response.json({ repos: githubRepos });
  } catch (error: unknown) {
    console.error('[/api/repositories] Error:', error);
    return Response.json({ error: 'Failed to fetch repositories' }, { status: 500 });
  }
}
