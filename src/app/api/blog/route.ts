import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createAdminClient } from '@/lib/supabase';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const { analysisId } = await req.json();

  if (!analysisId) {
    return Response.json({ error: 'Missing analysisId' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: analysis } = await admin
    .from('analyses')
    .select('*, repository:repositories(*)')
    .eq('id', analysisId)
    .eq('user_id', userId)
    .single();

  if (!analysis || !analysis.ai_result) {
    return Response.json({ error: 'Analysis not found or not completed' }, { status: 404 });
  }

  const result = analysis.ai_result;
  const repoName = (analysis.repository as any)?.full_name ?? 'unknown repo';

  const prompt = `
당신은 전문적인 기술 블로그 작가입니다. 사용자가 최근에 완료한 코드 커밋을 바탕으로 개발 블로그 포스트 초안을 작성하려고 합니다.
다음은 해당 커밋에 대한 AI 분석 결과입니다:
- 저장소: ${repoName}
- 제목: ${result.title}
- 배경: ${result.background}
- 주요 변경 사항: ${result.changes.join(', ')}
- 기술 스택: ${result.techStack?.join(', ')}
- 상세 기술 통찰: ${result.deepDive}

위 정보를 바탕으로 전문적이면서도 독자의 흥미를 유발할 수 있는 **기술 블로그 포스트**를 한국어로 작성하세요.
마크다운(Markdown) 형식을 사용하며, 다음 구조를 포함해야 합니다:
1. 독자의 시선을 사로잡는 제목 (H1)
2. 서론 (문제 상황이나 구현 배경)
3. 핵심 변경 사항 및 구현 내용
4. 기술적 깊이 / 배운 점 (상세 분석 내용 활용)
5. 결론 및 마무리

개발자가 직접 작성한 것처럼 자연스러운 문체를 사용하고, 적절한 이모지를 활용하세요. 오직 마크다운 텍스트만 응답하십시오.
`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is missing');
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const markdown = response.text;
    return Response.json({ markdown });
  } catch (error) {
    console.error('Blog generation failed:', error);
    return Response.json({ error: 'Failed to generate blog draft' }, { status: 500 });
  }
}
