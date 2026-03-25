import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'GitHub 로그인이 필요합니다.' }, { status: 401 });

  const accessToken = (session as any).accessToken;
  if (!accessToken) return Response.json({ error: 'GitHub 액세스 토큰이 없습니다.' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const repoFullName = searchParams.get('repo');
  const sha = searchParams.get('sha');
  const perPage = searchParams.get('per_page') || '30';

  if (!repoFullName) return Response.json({ error: 'repo 파라미터가 필요합니다.' }, { status: 400 });

  const params = new URLSearchParams({ per_page: perPage });
  if (sha) params.set('sha', sha);

  const res = await fetch(`https://api.github.com/repos/${repoFullName}/commits?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' }
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}
