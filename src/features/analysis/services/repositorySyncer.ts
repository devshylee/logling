import { fetchUserRepositories } from '@/features/analysis/githubFetcher';
import { upsertRepository } from '@/lib/supabase';
import type { createAdminClient } from '@/lib/supabase';

/**
 * Synchronizes user's GitHub repositories with Logling database.
 */
export async function syncRepositories(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  accessToken: string,
  forceSync = false
) {
  try {
    const githubRepos = await fetchUserRepositories(accessToken);

    // Sync repos to Supabase
    const syncedRepos = await Promise.all(
      githubRepos.map((repo) =>
        upsertRepository(adminClient, {
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

    return {
      success: true,
      count: syncedRepos.filter(Boolean).length,
      repos: githubRepos
    };
  } catch (error) {
    console.error('[syncRepositories] Sync failed:', error);
    throw error;
  }
}
