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
You are a technical content writer. The user wants to write a dev blog post about a recent code commit they made.
Here is the AI analysis of their commit:
- Repository: ${repoName}
- Title: ${result.title}
- Background: ${result.background}
- Changes: ${result.changes.join(', ')}
- Tech Stack: ${result.techStack?.join(', ')}
- Deep Dive Insight: ${result.deepDive}

Please generate a professional, engaging Markdown formatted technical blog post draft. 
Structure it with:
1. A catchy title (H1)
2. Introduction (Context of the problem/feature)
3. What was changed (The core implementation)
4. Deep Dive / Learnings (Technical insights)
5. Conclusion

Make it sound natural, as if the developer wrote it themselves. Use emojis appropriately. Return ONLY the markdown text.
`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is missing');
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
    });

    const markdown = response.text;
    return Response.json({ markdown });
  } catch (error) {
    console.error('Blog generation failed:', error);
    return Response.json({ error: 'Failed to generate blog draft' }, { status: 500 });
  }
}
