'use client';

import React, { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { motion, AnimatePresence } from 'motion/react';
import { Github, Upload, Wand2, Loader2, FileText, Settings2, Copy, Check, Calendar, History, GitBranch } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { useGithubIntegration } from '@/features/analysis/hooks/useGithubIntegration';
import { useAnalysis, GENERATION_STEPS } from '@/features/analysis/hooks/useAnalysis';

export default function Home() {
  const { data: session } = useSession();
  const [sourceType, setSourceType] = useState<'github' | 'manual'>('github');
  const [selectionMode, setSelectionMode] = useState<'commit' | 'range'>('commit');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rawDiff, setRawDiff] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [promptInstruction, setPromptInstruction] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom Hooks for logic separation
  const {
    repos, branches, commits,
    selectedRepo, selectedBranch, selectedCommit,
    loadingRepos, loadingBranches, loadingCommits,
    errorMsg: githubError,
    setSelectedCommit,
    handleRepoChange, handleBranchChange, fetchRepos
  } = useGithubIntegration();

  const {
    generating,
    generationStepIndex,
    generatedMarkdown,
    errorMsg: analysisError,
    handleGenerate
  } = useAnalysis();

  const errorMsg = githubError || analysisError;

  const onGenerate = () => {
    handleGenerate({
      sourceType,
      selectedRepo,
      selectedBranch,
      selectedCommit,
      selectionMode,
      startDate,
      endDate,
      rawDiff,
      commitMessage,
      promptInstruction,
      temperature
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setRawDiff((event.target?.result as string) ?? '');
    };
    reader.readAsText(file);
  };

  const copyToClipboard = () => {
    if (!generatedMarkdown) return;
    navigator.clipboard.writeText(generatedMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadMarkdown = () => {
    if (!generatedMarkdown) return;
    const blob = new Blob([generatedMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = `blog_${new Date().toISOString().split('T')[0]}.md`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isReady = sourceType === 'github'
    ? (selectedRepo && selectedBranch && (selectionMode === 'commit' ? selectedCommit : (startDate && endDate)))
    : (rawDiff.trim().length > 10);

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <Sidebar activeId="home" />

      <main className="flex-1 ml-64 flex flex-col h-screen overflow-hidden">
        <TopBar />

        <div className="flex-1 overflow-y-auto p-8 flex flex-col xl:flex-row gap-8">

          {/* Left Panel: Configuration */}
          <div className="w-full xl:w-[450px] flex-shrink-0 flex flex-col gap-6">
            <div>
              <h1 className="text-3xl font-black font-headline text-[#e5e2e1] tracking-tighter mb-2">
                Logling ✍️
              </h1>
              <p className="text-outline text-sm">코드를 넣으면 전문가 수준의 기술 블로그가 뚝딱!</p>
            </div>

            {/* Input Source Toggle */}
            <div className="bg-surface-high p-1 rounded-xl flex gap-1 border border-outline-variant/10">
              <button
                onClick={() => setSourceType('github')}
                className={cn('flex-1 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-2 transition-all', sourceType === 'github' ? 'bg-primary-container text-white shadow-lg' : 'text-outline hover:text-[#e5e2e1]')}
              >
                <Github size={14} /> GitHub 연동
              </button>
              <button
                onClick={() => setSourceType('manual')}
                className={cn('flex-1 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-2 transition-all', sourceType === 'manual' ? 'bg-[#2ff801] text-[#0a0a0a] shadow-lg' : 'text-outline hover:text-[#e5e2e1]')}
              >
                <FileText size={14} /> 직접 입력
              </button>
            </div>

            {/* Config Card */}
            <div className="bg-surface-low rounded-2xl p-5 border border-outline-variant/10 flex flex-col gap-4">
              {sourceType === 'github' ? (
                <>
                  {!session ? (
                    <div className="text-center py-6">
                      <p className="text-outline text-sm mb-3">GitHub 로그인이 필요합니다.</p>
                      <a href="/login" className="inline-block px-4 py-2 bg-primary-container text-white rounded-lg text-sm font-bold">로그인 하기</a>
                    </div>
                  ) : (
                    <>
                      {/* Step 1: Repo Select */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-[10px] font-bold text-outline uppercase tracking-widest block">1. 저장소 선택</label>
                          <button 
                            onClick={() => fetchRepos(true)}
                            disabled={loadingRepos}
                            className="text-[10px] font-bold text-primary-container hover:text-white transition-colors flex items-center gap-1 disabled:opacity-50"
                          >
                            <History size={10} className={cn(loadingRepos && "animate-spin")} /> 동기화
                          </button>
                        </div>
                        <div className="relative">
                          <select
                            className="w-full bg-[#131313] border border-outline-variant/20 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-primary-container text-[#e5e2e1]"
                            onChange={(e) => handleRepoChange(e.target.value)}
                            value={selectedRepo?.id.toString() || ''}
                            disabled={loadingRepos}
                          >
                            <option value="">저장소를 선택하세요</option>
                            {repos.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
                          </select>
                          {loadingRepos && (
                            <div className="absolute right-8 top-1/2 -translate-y-1/2">
                              <Loader2 size={12} className="animate-spin text-primary" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Step 2: Branch Select */}
                      <AnimatePresence>
                        {selectedRepo && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                            <label className="text-[10px] font-bold text-outline uppercase tracking-widest mb-2 block">2. 브랜치 선택</label>
                            <div className="relative">
                              <select
                                className="w-full bg-[#131313] border border-outline-variant/20 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:ring-2 focus:ring-primary-container text-[#e5e2e1] appearance-none"
                                onChange={(e) => handleBranchChange(e.target.value)}
                                value={selectedBranch || ''}
                                disabled={loadingBranches}
                              >
                                <option value="">브랜치를 선택하세요</option>
                                {branches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                              </select>
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-outline">
                                {loadingBranches ? <Loader2 size={14} className="animate-spin" /> : <GitBranch size={14} />}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Step 3: Mode & Detail Select */}
                      {selectedBranch && (
                        <div className="pt-2 flex flex-col gap-4">
                          <div>
                            <label className="text-[10px] font-bold text-outline uppercase tracking-widest mb-2 block">3. 분석 범위 설정</label>
                            <div className="bg-[#0a0a0a] p-1 rounded-lg flex gap-1 border border-outline-variant/5">
                              <button
                                onClick={() => setSelectionMode('commit')}
                                className={cn('flex-1 py-1.5 rounded-md text-[10px] font-bold flex items-center justify-center gap-1 transition-all', selectionMode === 'commit' ? 'bg-surface-highest text-white' : 'text-outline')}
                              >
                                <History size={12} /> 단일 커밋
                              </button>
                              <button
                                onClick={() => setSelectionMode('range')}
                                className={cn('flex-1 py-1.5 rounded-md text-[10px] font-bold flex items-center justify-center gap-1 transition-all', selectionMode === 'range' ? 'bg-surface-highest text-white' : 'text-outline')}
                              >
                                <Calendar size={12} /> 기간 설정
                              </button>
                            </div>
                          </div>

                          {selectionMode === 'commit' ? (
                            <div>
                              <select
                                className="w-full bg-[#131313] border border-outline-variant/20 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-primary-container text-[#e5e2e1]"
                                disabled={loadingCommits}
                                onChange={(e) => {
                                  const c = commits.find(c => c.sha === e.target.value);
                                  setSelectedCommit(c || null);
                                }}
                                value={selectedCommit?.sha || ''}
                              >
                                <option value="">분석할 커밋을 선택하세요</option>
                                {commits.map(c => <option key={c.sha} value={c.sha}>{c.commit.message.split('\n')[0]} ({c.sha.slice(0, 7)})</option>)}
                              </select>
                              {loadingCommits && <p className="text-[10px] text-primary-container mt-1 ml-1 flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> 커밋 목록 로딩 중...</p>}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <div className="flex gap-2">
                                <input
                                  type="date"
                                  className="flex-1 bg-[#131313] border border-outline-variant/20 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary-container text-[#e5e2e1]"
                                  value={startDate}
                                  onChange={(e) => setStartDate(e.target.value)}
                                />
                                <span className="text-outline flex items-center">~</span>
                                <input
                                  type="date"
                                  className="flex-1 bg-[#131313] border border-outline-variant/20 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary-container text-[#e5e2e1]"
                                  value={endDate}
                                  onChange={(e) => setEndDate(e.target.value)}
                                />
                              </div>
                              <p className="text-[10px] text-outline text-center">※ 최대 7일 이내의 변경 사항 분석 권장</p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-outline uppercase tracking-widest mb-2 flex justify-between">
                      Git Diff 텍스트
                      <button onClick={() => fileInputRef.current?.click()} className="text-primary-container hover:underline flex items-center gap-1">
                        <Upload size={12} /> 파일 업로드
                      </button>
                      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                    </label>
                    <textarea
                      className="w-full h-32 bg-[#131313] border border-outline-variant/20 rounded-xl p-4 text-xs font-mono focus:ring-2 focus:ring-[#2ff801] text-tertiary placeholder:text-outline/40 resize-none"
                      placeholder="이곳에 git diff 내용을 붙여넣으세요..."
                      value={rawDiff}
                      onChange={(e) => setRawDiff(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-outline uppercase tracking-widest mb-2 block">커밋 메시지 / 변경 배경 (선택)</label>
                    <input
                      className="w-full bg-[#131313] border border-outline-variant/20 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-[#2ff801] text-[#e5e2e1]"
                      placeholder="어떤 변경이었는지 짧게 설명해주세요"
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            {/* AI Customization Panel */}
            <div className="bg-surface-low rounded-2xl p-5 border border-outline-variant/10 flex flex-col gap-5 mt-auto">
              <div className="flex items-center gap-2 mb-1">
                <Settings2 size={16} className="text-tertiary" />
                <h3 className="font-headline font-bold text-sm text-[#e5e2e1]">스타일 및 커스텀 프롬프트</h3>
              </div>

              <div>
                <label className="text-[10px] font-bold text-outline uppercase tracking-widest mb-2 block">추가 지시사항</label>
                <textarea
                  className="w-full h-20 bg-[#131313] border border-outline-variant/20 rounded-xl p-3 text-xs focus:ring-2 focus:ring-tertiary text-[#e5e2e1] placeholder:text-outline/40 resize-none"
                  placeholder="예: '임베디드 개발자 톤으로 작성해줘', '코드의 결함보다는 혁신적인 점을 강조해줘'"
                  value={promptInstruction}
                  onChange={(e) => setPromptInstruction(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-outline uppercase tracking-widest mb-2 flex justify-between">
                  창의성 계수 <span>{temperature.toFixed(1)}</span>
                </label>
                <input
                  type="range" min="0" max="1" step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-tertiary"
                />
              </div>

              <button
                onClick={onGenerate}
                disabled={!isReady || generating}
                className="w-full mt-2 py-4 bg-gradient-to-r from-primary-container to-[#005bb5] text-white rounded-xl font-headline font-bold uppercase tracking-widest hover:shadow-[0_0_20px_rgba(0,112,243,0.4)] transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {generating ? <><Loader2 className="animate-spin" size={18} /> {GENERATION_STEPS[generationStepIndex]}</> : <><Wand2 size={18} /> 블로그 글 생성하기</>}
              </button>
            </div>
          </div>

          {/* Right Panel: Output Preview */}
          <div className="flex-1 bg-surface-high border border-outline-variant/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl relative">

            {/* Toolbar */}
            <div className="bg-[#1c1b1b] border-b border-outline-variant/10 px-6 py-4 flex justify-between items-center z-10">
              <div className="flex items-center gap-2 text-primary-container font-headline font-bold text-sm uppercase tracking-widest">
                <FileText size={16} /> Preview
              </div>

              {generatedMarkdown && (
                <div className="flex gap-2">
                  <button
                    onClick={downloadMarkdown}
                    className="flex items-center gap-2 px-3 py-1.5 bg-surface-lowest hover:bg-surface-low border border-outline-variant/20 rounded-lg text-xs font-bold text-[#e5e2e1] transition-all"
                  >
                    <Upload size={14} className="rotate-180" /> MD 다운로드
                  </button>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-2 px-3 py-1.5 bg-surface-lowest hover:bg-surface-low border border-outline-variant/20 rounded-lg text-xs font-bold text-[#e5e2e1] transition-all"
                  >
                    {copied ? <><Check size={14} className="text-[#2ff801]" /> 복사 완료!</> : <><Copy size={14} /> 복사</>}
                  </button>
                </div>
              )}
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-[#0a0a0a] overflow-y-auto p-8 relative">
              {errorMsg && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl mb-6 text-sm flex items-center gap-2">
                  <Loader2 size={16} className="rotate-45" /> {errorMsg}
                </div>
              )}

              {generating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a]/90 backdrop-blur-sm z-20">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    className="mb-8"
                  >
                    <Wand2 size={64} className="text-primary-container opacity-50" />
                  </motion.div>
                  <p className="text-[#e5e2e1] font-headline font-bold text-xl mb-8">AI 마법사가 코드를 읽고 있습니다</p>
                  
                  <div className="flex flex-col gap-4 w-72 bg-surface-low p-6 rounded-2xl border border-outline-variant/10">
                    {GENERATION_STEPS.map((step, idx) => {
                      const isActive = idx === generationStepIndex;
                      const isPast = idx < generationStepIndex;
                      return (
                        <div key={idx} className={cn("flex items-center gap-3 text-sm font-bold transition-all duration-300", isActive ? "text-primary-container" : isPast ? "text-[#e5e2e1]" : "text-outline/40")}>
                          {isPast ? <Check size={16} className="text-[#2ff801]" /> : isActive ? <Loader2 size={16} className="animate-spin" /> : <div className="w-4 h-4 rounded-full border-2 border-outline/20" />}
                          <span className={cn(isActive && "animate-pulse")}>{step}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-outline text-[10px] mt-6 tracking-widest uppercase">작업량이 많을 경우 최대 1분이 소요될 수 있습니다</p>
                </div>
              ) : generatedMarkdown ? (
                <div className="prose prose-invert prose-p:text-[#e5e2e1] prose-headings:text-[#e5e2e1] prose-a:text-primary-container prose-pre:bg-[#131313] prose-pre:border prose-pre:border-outline-variant/10 prose-th:text-[#e5e2e1] prose-td:text-[#e5e2e1] prose-table:border-collapse prose-th:border prose-th:border-outline-variant/20 prose-td:border prose-td:border-outline-variant/20 prose-th:p-2 prose-td:p-2 max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedMarkdown}</ReactMarkdown>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                  <div className="text-center flex flex-col items-center">
                    <History size={80} className="text-outline mb-6" />
                    <p className="text-outline text-xl font-headline font-bold">대기 중인 임무가 없습니다</p>
                    <p className="text-outline text-sm mt-2">왼쪽 패널에서 코드를 입력하고 생성을 시작하세요</p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
