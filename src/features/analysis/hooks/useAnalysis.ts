'use client';

import { useState } from 'react';
import type { GitHubRepo, GitHubCommit } from '@/types';

interface GenerationBody {
  sourceType: 'github' | 'manual';
  selectedRepo: GitHubRepo | null;
  selectedBranch: string;
  selectedCommit: GitHubCommit | null;
  selectionMode: 'commit' | 'range';
  startDate: string;
  endDate: string;
  rawDiff: string;
  commitMessage: string;
  promptInstruction: string;
  temperature: number;
}

export function useAnalysis() {
  const [generating, setGenerating] = useState(false);
  const [generatedMarkdown, setGeneratedMarkdown] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleGenerate = async (body: GenerationBody) => {
    setErrorMsg('');
    setGeneratedMarkdown('');

    const { sourceType, selectionMode, startDate, endDate, selectedRepo, selectedBranch, selectedCommit, rawDiff, commitMessage, promptInstruction, temperature } = body;

    if (sourceType === 'github' && selectionMode === 'range') {
      if (!startDate || !endDate) {
        setErrorMsg('시작 날짜와 종료 날짜를 모두 입력해주세요.');
        return;
      }
      const s = new Date(startDate);
      const e = new Date(endDate);
      const diffDays = Math.ceil(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 7) {
        setErrorMsg('분석 기간은 최대 7일까지 가능합니다.');
        return;
      }
    }

    setGenerating(true);
    try {
      const payload = {
        sourceType,
        repoFullName: selectedRepo?.full_name,
        branch: selectedBranch,
        commitSha: selectionMode === 'commit' ? selectedCommit?.sha : undefined,
        startDate: selectionMode === 'range' ? startDate : undefined,
        endDate: selectionMode === 'range' ? endDate : undefined,
        rawDiff,
        commitMessage: sourceType === 'github' && selectionMode === 'commit' ? selectedCommit?.commit.message : commitMessage,
        promptInstruction,
        temperature
      };

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.markdown) {
        setGeneratedMarkdown(data.markdown);
      } else {
        setErrorMsg(data.error || '생성 중 오류가 발생했습니다.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '네트워크 오류가 발생했습니다.';
      setErrorMsg(message);
    } finally {
      setGenerating(false);
    }
  };

  return {
    generating,
    generatedMarkdown,
    setGeneratedMarkdown,
    errorMsg,
    setErrorMsg,
    handleGenerate
  };
}
