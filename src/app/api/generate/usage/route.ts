/**
 * GET /api/generate/usage
 * Returns the current user's daily generation quota info.
 * Used by the frontend to display remaining quota.
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getGenerationUsage } from '@/features/analysis/services/generationRateLimiter';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return Response.json(
      { error: '로그인이 필요합니다.' },
      { status: 401 }
    );
  }

  const usage = await getGenerationUsage(session.user.id);
  return Response.json(usage);
}
