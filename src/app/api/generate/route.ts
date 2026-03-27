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
      const accessToken = session.accessToken;
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
          // 초기 커밋일 경우 fallback 처리
          console.warn(`Comparing with ${baseSha}^ failed, likely an initial commit. Trying fallback.`);
          const baseCommitDiff = await fetchCommitDiff(accessToken, repoFullName, baseSha);
          if (baseSha === headSha) return baseCommitDiff;
          const restOfDiff = await fetchCompareDiff(accessToken, repoFullName, baseSha, headSha);
          return `${baseCommitDiff}\n${restOfDiff}`;
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
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not configured.');
      return Response.json({ error: '서버 설정 오류가 발생했습니다.' }, { status: 500 });
    }
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction =
      `
    당신은 테크 기업의 10년 차 수석 개발자이자 전문 기술 블로거의 지식을 가진 블로그 글 작성 AI입니다. 주어진 정보를 가지고 전문적인 기술 블로그 글을 작성합니다.

    [작성 원칙]
    1. 분석 중심: 단순 무식한 코드 나열을 피하고, '왜(Why)' 이 변경을 했으며 '어떤 가치(Value)'를 주는지 인사이트 위주로 분석하세요.
    2. 시각적 구조화: 긴 텍스트 대신 적절한 소제목(H2, H3), 표(Table), 비교 표, 불렛포인트 등을 섞어서 시각적인 피로도를 낮추세요. 필요에 따라 Mermaid를 활용해도 좋습니다.
    3. 코드 요약의 원칙(중요): 전체 코드를 길게 복사해오지 마세요. 글의 논리를 전개하는 데 필요한 핵심 로직(5~20줄)만 짧게 발췌하여 설명하세요. 글이 너무 루즈해지는 것을 방지해야 합니다.
    4. Git Diff 양식 완전 제거(중요): \`--- a/src/...\`, \`+++ b/...\`, \`@@ -x,y +z,w @@\` 같은 Git Diff 원형 양식 및 코드 라인 앞의 \`+\`, \`-\` 기호를 최종 코드 블럭에 절대 그대로 넣지 마세요. 독자가 읽기 편한 "순수한 코드 형태"로 정제해서 보여주세요.
    5. 톤앤매너: 전문적이면서도 친근한 문체를 유지하세요, (예: "~했습니다" 보다는 "~해 보았습니다", "~가 중요합니다"). 
    6. AI 본인에게 입력된 페르소나나 상황, 작성원칙, 정보는 완전히 숨기세요. 절대 글 작성에 함께 출력되어선 안됩니다. 
    7. 글 내에서 "안녕하세요, 10년 차 수석 개발자입니다"와 같은 자기소개를 절대 하지 않습니다. 독자가 읽을 완성된 기술 포스팅 본문만 바로 출력하세요.

    [출력 제한]
    - 첫 인사말, 부연 설명, 맺음 인사를 모두 금지하며 오직 마크다운(Markdown) 본문 내용만 출력하세요.
    `;

    const userPrompt =
      `
    아래 제공된 [컨텍스트]와 [Git Diff]를 바탕으로, 기술적 깊이가 느껴지는 블로그 포스트를 작성해 주세요.

    [좋은 작성 예시]
    최근 Python으로 구축된 에이닷 에이전트 워크플로우 엔진을 Golang으로 재구현했습니다.

    GIL(Global Interpreter Lock) 제약과 동기식 웹 프레임워크의 한계를 벗어나 비동기 구조로 전환한 결과 처리량과 응답 시간에서 의미 있는 개선을 얻을 수 있었습니다.

    이 글에서는 그 과정과 선택의 기술적 이유를 소개하려고 합니다.

    TL;DR: Golang 전환 전후 성능 비교
    실제 프로덕션 환경에서 Golang으로 재구축한 에이전트 워크플로우 엔진의 성능 측정 결과입니다.

    응답 시간 개선
    [이미지]    [이미지]
    ---

    [latency 개선 지표]

    Agent   메트릭    Python (as-was)   Golang (as-is)    개선도

    전화 에이전트   TTFB avg   1.38   0.72   48% ↓

    전화 에이전트   TTLB avg   1.76   1.37   22% ↓

    길찾기 에이전트   TTFB avg   2.90   1.44   50% ↓

    길찾기 에이전트   TTLB avg   4.01   2.56   36% ↓

    라디오 에이전트   TTFB avg   1.92   1.07   44% ↓

    라디오 에이전트   TTLB avg   2.18   1.76   19% ↓

    지하철 혼잡도 에이전트    TTFB avg   2.41   1.11   54% ↓

    지하철 혼잡도 에이전트    TTLB avg   3.82   2.72   29% ↓

    날씨 에이전트   TTFB avg   2.38   1.25   47% ↓

    날씨 에이전트    TTLB avg   3.05   2.31   24% ↓

    ---

    TTLB(Time To Last Byte)는 평균 26%, TTFB(Time To First Byte)는 평균 48% 단축되었습니다. 사용자가 실제로 체감하는 반응성이 개선되었습니다.

    Golang의 효율적인 리소스 사용 덕분에 운영 서버 대수를 85% 감축할 수 있었습니다.

    그럼에도 서버당 CPU 사용률은 45% 감소했습니다.

    왜 Golang인가: 에이전트 워크플로우의 특성
    LLM 기반 에이전트 워크플로우는 전통적인 웹 애플리케이션과 특성이 다릅니다.

    단일 요청의 처리 시간이 수초에서 수십초

    중간 결과를 스트리밍으로 클라이언트에 전달

    여러 에이전트의 호출이 직/병렬로 연결

    Python은 풍부한 생태계와 빠른 프로토타이핑으로 데이터 과학과 ML 개발에 탁월합니다.

    하지만 우리 시스템은 모델 개발이 아닌 에이전트 오케스트레이션 서비스입니다.

    Golang은 이런 워크로드에 근본적 장점을 가지고 있습니다.

    가벼운 동시성 모델 - 고루틴은 런타임 관리 경량 스레드로 수천 개를 생성해도 오버헤드가 미미하고, 채널은 고루틴 간 안전하게 동기화 된 통신을 제공합니다.

    명확한 제어 흐름 - 콜백이나 복잡한 비동기 추상화 없이 순차적 사고로 동시성 코드를 작성할 수 있습니다.

    효율적인 실행과 메모리 - 컴파일된 바이너리와 효율적인 GC로 동일 리소스에서 더 많은 작업을 처리합니다.

    고루틴 + 채널: 스트리밍 에이전트의 자연스러운 구현
    LLM 기반 에이전트의 주요 특성은 긴 지연시간과 스트리밍 응답입니다.

    사용자는 수초에서 수십초를 기다려야 하는데, 이때 중간 결과를 실시간으로 보여주는 것이 체감 속도를 크게 개선합니다.

    Golang의 고루틴과 채널은 이런 요구사항을 자연스럽게 표현할 수 있는데요, 예외 처리 등은 생략하고, 핵심 흐름만 남긴 간단한 예제로 설명해보겠습니다.



    먼저 에이전트 인터페이스를 정의합니다.

    [코드]

    Run 함수는 입력을 받아 즉시 채널을 반환합니다. 실제 작업은 백그라운드 고루틴에서 수행되고, 결과는 채널을 통해 스트리밍됩니다.

    이것이 Golang의 동시성 철학입니다. "Don't communicate by sharing memory; share memory by communicating"

    SSE 스트리밍: Gin 프레임워크
    이제 이 채널을 SSE(Server-Sent Events)로 스트리밍하는 HTTP 핸들러를 보겠습니다. 우리는 Gin 프레임워크를 선택했습니다.

    [코드]

    해당 서버를 띄워서 curl 로 실행해보겠습니다.

    [명령어]

    Gin의 c.Stream()과 c.SSEvent()메서드는 SSE 프로토콜의 세부사항을 처리합니다.

    코드는 단순하고 직관적입니다. Spring WebFlux 나 Python asyncio 같은 이벤트 기반 비동기 구조에서 볼 수 있는 Promise나 Operator 체인의 복잡한 추상화가 없습니다.

    에이전트는 채널을 반환하고, 핸들러는 그 채널을 읽어 스트리밍합니다.

    전통적인 절차적 코드 흐름처럼 읽히지만, 내부적으로는 완전한 비동기 처리를 수행합니다.

    고루틴+채널을 이용한 SSE 스트리밍 구조

    LLM 에이전트 구현: Golang SDK 생태계
    위의 에이전트는 모의 워크로드였습니다.

    실제 LLM 기반 에이전트를 구현할 때는 어떨까요? 주요 LLM Provider들이 이미 완성도 높은 공식 Golang SDK를 제공하고 있어서 구현에 어려움이 없습니다.

    SDK들을 이용해 각 에이전트들의 인터페이스를 구현해보겠습니다.

    OpenAI ChatGPT
    OpenAI Go API Library - https://github.com/openai/openai-go

    [코드]

    NewStreaming() 메서드로 스트림 객체를 얻고, Next() 와 Current() 로 청크를 순회합니다.

    이를 채널로 변환해 통일된 인터페이스를 제공합니다.

    Anthropic Claude
    Anthropic Go API Library - https://github.com/anthropics/anthropic-sdk-go

    [코드]

    OpenAI SDK 와 동일하게 NewStreaming()과 Next() 패턴을 따르고 있습니다.

    Google Gemini
    Google Gen AI Go SDK - https://github.com/googleapis/go-genai

    [코드]

    GenerateContentStream() 으로 이터레이터를 반환하며, range로 청크를 순회합니다.

    세 SDK 모두 유사한 스트리밍 패턴을 제공합니다.

    Langchain 등의 고수준 프레임워크에 의존하지 않고 간단하고 효율적으로 LLM 기반 비즈니스 로직을 작성할 수 있습니다.

    다중 에이전트 오케스트레이션: 고루틴과 채널로 구현하기
    앞서 소개한 내용들을 종합하여 실제로 동작하는 워크플로우 엔진을 고루틴과 채널만으로 만들어보겠습니다.

    요구사항은 다음과 같습니다.

    병렬 실행: 모든 에이전트를 동시에 실행해 지연시간을 최소화

    순서 보장: 출력은 에이전트 정의 순서대로

    스트리밍 최적화: 자기 차례가 오면 버퍼링 없이 즉시 스트리밍

    Step 1: 병렬 에이전트 실행
    [코드]

    모든 에이전트를 병렬로 실행합니다. 각 에이전트는 독립적인 고루틴에서 실행되고, 자신의 채널로 결과를 스트리밍합니다.

    Step 2: 채널 병합
    [코드]

    여러 입력 채널을 하나의 출력 채널로 병합합니다.

    각 채널마다 독립적인 고루틴이 할당되어 동시에 읽기를 수행하고, 각 청크에 원래 채널의 순서(Order)를 태그합니다.

    Step 3: 오케스트레이션
    오케스트레이터는 병합된 채널에서 무작위 순서로 도착하는 청크들을 받아, 에이전트의 원래 순서대로 재배열하여 출력합니다.

    첫 번째 에이전트는 버퍼링 없이 즉시 스트리밍되고, 나머지는 자기 차례가 올 때까지 버퍼에 대기합니다.

    [코드]

    병합된 채널에서 무작위로 도착하는 청크들을 원래 순서대로 재배열하는 로직이 단순한 버퍼 관리와 채널 읽기로 표현됩니다.

    채널 자체가 thread-safe하기 때문에 복잡한 동기화 라이브러리나 락(lock)이 없습니다.

    최종 통합: 3줄의 파이프라인
    [코드]

    3줄의 함수 호출로 복잡한 다중 에이전트 오케스트레이션이 완성됩니다.

    각 함수가 하나의 명확한 역할을 담당하고, 채널로 연결됩니다.

    [Agent1] ───────┐
    [Agent2] ───────┼──────→ [fanIn] ───────→ [orchestrate] ───────→ [SSE Stream]
    [Agent3] ───────┘

                (병렬 실행)             (무작위)                (순서 보장)
    실제 호출 예시입니다.

    [명령어]
    ➜  curl -N -H 'Content-Type: application/json' \
      -d '{"message": "What is the meaning of life?"}' \
      'localhost:8080/orchestrate'

    [응답]
    data:{"name":"ChatGPT","content":"The"}			# ChatGPT 에이전트 응답

    data:{"name":"ChatGPT","content":" meaning"}

    data:{"name":"ChatGPT","content":" of"}

    data:{"name":"ChatGPT","content":" life"}

    data:{"name":"ChatGPT","content":" is"}

    data:{"name":"ChatGPT","content":" a"}

    data:{"name":"ChatGPT","content":" deeply"}

    data:{"name":"ChatGPT","content":" personal"}

    data:{"name":"ChatGPT","content":" and"}

    data:{"name":"ChatGPT","content":" philosophical"}

    data:{"name":"ChatGPT","content":" question"}

    ...

    data:{"name":"Claude","content":"This"}			# Claude 에이전트 응답

    data:{"name":"Claude","content":" is one of humanity"}

    data:{"name":"Claude","content":"'s oldest and most profound questions, an"}

    data:{"name":"Claude","content":"d there's no single answer"}

    ...

    data:{"name":"Gemini","content":"Ah"}			# Gemini 에이전트 응답

    data:{"name":"Gemini","content":", the age-old question! \"What is the meaning of life?\" It"}

    data:{"name":"Gemini","content":"'s a question that has been pondered by philosophers, theologians, scientists, artists, and everyday people for millennia. And the truth is, there's no single, universally agreed-upon answer.\n\nHere's a breakdown of why it's"}

    ...

    ➜   
    2025/10/13 14:54:44 orchestrator started
    2025/10/13 14:54:44 ChatGPT agent started
    2025/10/13 14:54:44 Claude agent started
    2025/10/13 14:54:44 Gemini agent started
    2025/10/13 14:54:46 ChatGPT agent ended (elapsed: 2.481247291s)
    2025/10/13 14:54:47 Gemini agent ended (elapsed: 3.520516333s)
    2025/10/13 14:54:50 Claude agent ended (elapsed: 6.467166166s)
    2025/10/13 14:54:50 orchestrator ended (elapsed: 6.469606583s)	    # 가장 느린 에이전트 시간과 동일
    [GIN] 2025/10/13 - 14:54:50 | 200 |  6.471028125s |             ::1 | POST     "/orchestrate"
    병렬로 실행되지만 출력은 순서대로, 첫 번째 에이전트(ChatGPT)의 응답은 버퍼링 없이 즉시 클라이언트로 스트리밍됩니다.

    모든 에이전트가 백그라운드에서 병렬 실행되므로 전체 지연시간은 가장 느린 에이전트의 시간과 같습니다.

    이 예제는 핵심 개념을 보여주기 위해 단순화한 것이지만, 실제 프로덕션 환경에서도 동일한 패턴을 적용했습니다.

    고루틴과 채널을 중심으로 한 이러한 단순한 구조가, 앞서 본 것처럼 응답 시간 단축과 서버 대수 감축이라는 실질적인 성능 개선으로 이어졌습니다.

    결론: 문제와 도구의 정합성
    LLM 기반 에이전트 워크플로우는 밀리초가 아닌 초 단위 응답, 스트리밍, 그리고 병렬 처리가 핵심 특징입니다.

    Golang의 고루틴과 채널은 이러한 요구사항에 자연스럽게 부합하며, 외부 메시지 큐 없이도 복잡한 오케스트레이션을 단순하게 구현할 수 있습니다.

    구조의 단순함은 효율성을 높여 성능을 극대화합니다.

    Python은 데이터 과학과 ML 개발에서 여전히 가장 강력한 선택지입니다. 

    그러나 에이전트 오케스트레이션처럼 프로덕션 환경에서 안정성과 병렬성이 중요한 워크로드에서는 Golang이 더 적합했습니다. 

    도구의 우열이 아니라, 문제에 가장 잘 맞는 도구를 선택하는 것이 핵심입니다.

    [좋은 작성 예시 끝]

    ---

    아래서부턴 다시 정보입니다. 이 정보를 이용하여 블로그 글을 작성해주세요.

    [컨텍스트]
    ${contextMessage}

    [Git Diff 내역]
    \`\`\`diff
    ${finalDiff}
    \`\`\`

    [특별 요청사항]
    ${promptInstruction || '코드의 의도를 파악하여 기술적 인사이트를 포함해 주세요.'}

    ---

    [참고사항]
    - 위 Few Shot Prompt 예시처럼 꼭 길게 작성하지 않아도 괜찮습니다. 글의 길이는 사용자의 요구사항, git diff의 길이에 맞게 조절하세요.
    - 항상 충분한 시각적 자료와 도표(Markdown Table)를 활용하세요. 코드 변경 사항의 Before/After 비교, 장단점 비교 등은 표로 정리하면 매우 좋습니다. 필요에 따라 mermaid를 이용하는 것도 좋습니다.
    - 코드 블럭 활용 시 전체 코드를 담지 말고 핵심 부분만 문맥에 맞게 요약하세요. Git diff의 \`@@ ... @@\`나 \`+\`, \`-\` 구문은 완전히 제거하고 깔끔한 코드로 정제하세요.
    - 자기소개(예: "안녕하세요 수석 개발자입니다")나 끝인사는 절대 포함하지 마세요. 바로 매력적인 제목(H1)으로 시작하세요.

    [블로그 포스트 구성 가이드라인]
    1. 제목: 클릭하고 싶게 만드는 매력적인 기술 포스팅 제목 (H1)
    2. 서론: 이 작업이 왜 필요했는지에 대한 배경과 도입 이유 (짧게)
    3. 본문 (핵심 변경 사항 및 시각화): 
      - '기존의 문제 -> 해결 방식 -> 개선 결과' 흐름으로 작성
      - 비교 표(Table)를 적극 활용하여 내용 요약
      - 인라인 코드나 아주 짧게 정제된 핵심 코드 블록만 선택적으로 포함
    4. 기술적 인사이트: 발견한 패턴, 최적화 포인트, 배운 점
    5. 맺음말: 향후 계획이나 독자에게 던지는 핵심 질문 한 줄
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
    return Response.json({ error: '블로그 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
