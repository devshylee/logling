import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { GoogleGenAI } from '@google/genai';
import { fetchCommitDiff, fetchCompareDiff } from '@/features/analysis/githubFetcher';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  try {
    const body = await req.json();
    const { 
      sourceType, 
      repoFullName,
      branch,
      commitSha, 
      rawDiff, 
      commitMessage, 
      promptInstruction, 
      temperature,
      startDate,
      endDate 
    } = body;

    let finalDiff = '';
    let contextMessage = commitMessage || '';

    if (sourceType === 'github') {
      if (!session) return Response.json({ error: 'GitHub 로그인이 필요합니다.' }, { status: 401 });
      const accessToken = (session as any).accessToken;
      if (!accessToken) return Response.json({ error: 'GitHub 액세스 토큰이 없습니다.' }, { status: 403 });
      
      if (!repoFullName) return Response.json({ error: '저장소 이름이 필요합니다.' }, { status: 400 });

      if (commitSha) {
        // 단일 커밋 분석
        finalDiff = await fetchCommitDiff(accessToken, repoFullName, commitSha);
      } else if (startDate && endDate) {
        // 기간 분석 (최대 일주일)
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 7) {
          return Response.json({ error: '분석 기간은 최대 7일까지 설정 가능합니다.' }, { status: 400 });
        }

        // 해당 기간의 커밋 목록 조회하여 범위 특정 (since/until 사용)
        // branch가 있다면 sha 파라미터로 브랜치 명시
        const branchParam = branch ? `&sha=${branch}` : '';
        const commitsRes = await fetch(
          `https://api.github.com/repos/${repoFullName}/commits?since=${start.toISOString()}&until=${end.toISOString()}${branchParam}&per_page=100`,
          { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' } }
        );
        const commits = await commitsRes.json();

        if (!Array.isArray(commits) || commits.length === 0) {
          return Response.json({ error: `해당 기간 내('${branch || '기본 브랜치'}')에 커밋이 존재하지 않습니다.` }, { status: 404 });
        }

        // 가장 오래된 커밋(마지막 요소)의 이전 커밋과 가장 최신 커밋 비교
        const headSha = commits[0].sha;
        const baseSha = commits[commits.length - 1].sha;
        
        finalDiff = await fetchCompareDiff(accessToken, repoFullName, baseSha + '^', headSha).catch(async () => {
          return await fetchCompareDiff(accessToken, repoFullName, baseSha, headSha);
        });
        
        contextMessage = `브랜치: ${branch || '기본'}\n기간: ${startDate} ~ ${endDate}\n작업 요약: 총 ${commits.length}개의 커밋 분석`;
      } else {
        return Response.json({ error: '커밋 해시 또는 기간 설정이 필요합니다.' }, { status: 400 });
      }
    } else if (sourceType === 'manual') {
      finalDiff = rawDiff;
      if (!finalDiff || finalDiff.trim().length < 10) {
        return Response.json({ error: '유효한 Diff 텍스트를 입력해주세요.' }, { status: 400 });
      }
    } else {
      return Response.json({ error: '잘못된 소스 타입입니다.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is missing');
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `당신은 10년 차 수석 개발자이자 전문 기술 블로거입니다. 
제공된 Git Diff 와 컨텍스트를 분석하여 기술 블로그 포스트를 마크다운(Markdown) 포맷으로 작성하세요.
단일 커밋 분석인 경우 변경 사항을 꼼꼼히 리뷰하고, 기간(Range) 분석인 경우 전체적인 진행 상황과 주요 성과(Milestones) 위주로 요약하여 작성하세요.
결과는 오직 마크다운 텍스트 파트만 출력하십시오.`;

    const userPrompt = `
아래의 정보를 분석하여 기술 블로그 포스트를 작성해 주세요.

[컨텍스트]
${contextMessage}

[Git Diff 내역]
\`\`\`diff
${finalDiff}
\`\`\`

[사용자 추가 요청사항 (Custom Prompt)]
${promptInstruction || '전문적이고 가독성 높은 기술 블로그 글로 다듬어 주세요.'}

블로그 포스트에는 다음 항목이 자연스럽게 포함되어야 합니다:
1. 제목 (H1)
2. 문제 배경 혹은 이번 기간의 목표
3. 주요 성과 및 코드 기반 변경 사항 설명
4. 기술적 인사이트 및 배운 점
5. 마무리 인사
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: temperature ?? 0.7,
      },
    });

    return Response.json({ markdown: response.text });
  } catch (error: any) {
    console.error('Blog generation direct failed:', error);
    return Response.json({ error: error.message || '블로그 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
