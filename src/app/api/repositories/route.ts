import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createAdminClient } from '@/lib/supabase';
import { syncRepositories } from '@/features/analysis/services/repositorySyncer';

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
    const result = await syncRepositories(admin, userId, accessToken, forceSync);

    return Response.json(result);
  } catch (error: unknown) {
    console.error('[/api/repositories] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch repositories';
    return Response.json({ error: message }, { status: 500 });
  }
}
