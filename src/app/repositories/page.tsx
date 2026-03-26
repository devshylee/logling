'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { motion, AnimatePresence } from 'motion/react';
import {
  Github, ShieldCheck, Code2, Search, Loader2, RefreshCw,
  BookOpen, Zap, Eye, ChevronRight, Archive, Wand2
} from 'lucide-react';
import type { Repository, Analysis, UserProfile, AIResult } from '@/types';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

type RepoWithStats = Repository & {
  analysisCount: number;
  totalXp: number;
  latestAnalysis: Analysis | null;
};

function ImpactColor(score: number) {
  if (score >= 80) return 'text-[#2ff801]';
  if (score >= 50) return 'text-primary-container';
  return 'text-outline';
}

export default function RepositoriesPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [repos, setRepos] = useState<RepoWithStats[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const [selectedRepo, setSelectedRepo] = useState<RepoWithStats | null>(null);
  const [repoAnalyses, setRepoAnalyses] = useState<Analysis[]>([]);
  const [loadingAnalyses, setLoadingAnalyses] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const userId = session?.user?.id;

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') router.push('/login');
  }, [sessionStatus, router]);

  // Fetch synced repos from Logling DB (with analysis stats aggregated client-side)
  const fetchRepos = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // 1) GitHub 저장소 동기화 (기존 API 재사용)
      await fetch('/api/repositories');

      // 2) DB에 저장된 저장소 목록 가져오기
      const { data: dbRepos } = await supabase
        .from('repositories')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!dbRepos) return;

      // 3) 각 저장소의 분석 통계 집계
      const reposWithStats: RepoWithStats[] = await Promise.all(
        dbRepos.map(async (repo) => {
          const { data: analyses } = await supabase
            .from('analyses')
            .select('id, xp_awarded, impact_score, ai_result, created_at, commit_sha, commit_message, status, completed_at, error_message, repository_id, user_id')
            .eq('repository_id', repo.id)
            .eq('status', 'completed')
            .order('created_at', { ascending: false });

          const totalXp = (analyses ?? []).reduce((sum, a) => sum + (a.xp_awarded ?? 0), 0);
          return {
            ...repo,
            analysisCount: analyses?.length ?? 0,
            totalXp,
            latestAnalysis: analyses?.[0] ?? null,
          };
        })
      );

      setRepos(reposWithStats);
    } catch (e) {
      console.error('Failed to fetch repos', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchRepos();
      supabase.from('user_profiles').select('*').eq('id', userId).single().then(({ data }) => {
        if (data) setProfile(data as UserProfile);
      });
    }
  }, [userId, fetchRepos]);

  const handleSelectRepo = async (repo: RepoWithStats) => {
    if (selectedRepo?.id === repo.id) {
      setSelectedRepo(null);
      setRepoAnalyses([]);
      setExpandedId(null);
      return;
    }
    setSelectedRepo(repo);
    setExpandedId(null);
    setLoadingAnalyses(true);
    setRepoAnalyses([]);

    const { data } = await supabase
      .from('analyses')
      .select('*, repository:repositories(*)')
      .eq('repository_id', repo.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(30);

    setRepoAnalyses((data ?? []) as Analysis[]);
    setLoadingAnalyses(false);
  };

  const filtered = repos.filter((r) =>
    r.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.language ?? '').toLowerCase().includes(search.toLowerCase())
  );

  if (sessionStatus === 'loading') {
    return (
      <div className="flex min-h-screen bg-surface items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary-container" />
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (repos.length === 0 && !loading) {
    return (
      <div className="flex min-h-screen bg-surface">
        <Sidebar activeId="repos" profile={profile} />
        <main className="flex-1 ml-64 flex flex-col">
          <TopBar />
          <div className="flex-1 flex items-center justify-center p-10 bg-[#0e0e0e]">
            <div className="max-w-4xl w-full flex flex-col items-center text-center">
              <div className="relative mb-12">
                <div className="absolute inset-0 bg-primary-container/10 blur-[100px] rounded-full" />
                <motion.div
                  animate={{ y: [0, -15, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative z-10 w-64 h-64 flex items-center justify-center"
                >
                  <div className="w-48 h-48 bg-tertiary/20 backdrop-blur-xl border-4 border-tertiary rounded-[3rem] shadow-[0_0_60px_rgba(205,189,255,0.2)] flex items-center justify-center">
                    <Code2 size={80} className="text-tertiary" />
                  </div>
                </motion.div>
              </div>
              <h1 className="font-headline text-5xl font-black tracking-tighter text-[#e5e2e1] mb-4">연결된 저장소가 없어요!</h1>
              <p className="text-outline text-xl mb-8">GitHub에서 프로젝트를 불러와주세요. 로그링 요원이 분석 준비를 마쳤습니다.</p>
              <button
                onClick={fetchRepos}
                disabled={loading}
                className="px-10 py-5 bg-primary-container text-white rounded-2xl font-headline text-lg font-bold uppercase tracking-tight flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-[0_20px_40px_rgba(0,112,243,0.3)] disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Github />}
                GitHub 저장소 불러오기
              </button>
              <div className="flex items-center gap-2 mt-4">
                <ShieldCheck size={14} className="text-[#79ff5b]" />
                <span className="text-[10px] font-mono text-[#79ff5b] uppercase tracking-widest">읽기 전용 보안 액세스 활성화됨</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Main layout: Left repo list + Right analysis panel ───────────────────
  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <Sidebar activeId="repos" profile={profile} />

      <main className="flex-1 ml-64 flex flex-col h-screen overflow-hidden">
        <TopBar />

        <div className="flex-1 overflow-hidden flex">

          {/* ── Left: Repository List ── */}
          <div className="w-[380px] flex-shrink-0 flex flex-col border-r border-outline-variant/10 overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="font-headline text-2xl font-black tracking-tighter text-[#e5e2e1]">내 저장소</h1>
                  <p className="text-outline text-xs mt-0.5">총 {repos.length}개 동기화됨</p>
                </div>
                <button
                  onClick={fetchRepos}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-high border border-outline-variant/20 rounded-lg text-outline hover:text-[#e5e2e1] transition-colors text-xs font-bold disabled:opacity-50"
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                  동기화
                </button>
              </div>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={14} />
                <input
                  className="w-full bg-surface-low border border-outline-variant/20 rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-2 focus:ring-primary-container transition-all placeholder:text-outline/50 text-[#e5e2e1]"
                  placeholder="프로젝트명 또는 언어 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Repo List */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
              {filtered.map((repo) => {
                const isSelected = selectedRepo?.id === repo.id;
                return (
                  <motion.button
                    key={repo.id}
                    whileHover={{ x: 2 }}
                    onClick={() => handleSelectRepo(repo)}
                    className={cn(
                      'w-full text-left p-4 rounded-xl border transition-all',
                      isSelected
                        ? 'bg-primary-container/10 border-primary-container/40 shadow-[0_0_20px_rgba(0,112,243,0.1)]'
                        : 'bg-surface-low border-outline-variant/10 hover:border-outline-variant/30'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-headline font-bold text-sm text-[#e5e2e1] truncate">{repo.full_name.split('/')[1]}</p>
                        <p className="text-outline text-[10px] font-mono truncate">{repo.full_name}</p>
                      </div>
                      <ChevronRight size={14} className={cn('text-outline flex-shrink-0 mt-0.5 transition-transform', isSelected && 'text-primary-container rotate-90')} />
                    </div>

                    {repo.description && (
                      <p className="text-outline text-[11px] line-clamp-1 mb-2">{repo.description}</p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {repo.language && (
                          <span className="px-1.5 py-0.5 bg-surface-highest rounded text-[10px] font-mono text-tertiary">{repo.language}</span>
                        )}
                      </div>
                      {/* Analysis count badge */}
                      <span className={cn(
                        'flex items-center gap-1 text-[10px] font-bold',
                        repo.analysisCount > 0 ? 'text-[#2ff801]' : 'text-outline'
                      )}>
                        <BookOpen size={10} />
                        {repo.analysisCount}건
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* ── Right: Analysis Panel ── */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!selectedRepo ? (
              /* Empty state */
              <div className="flex-1 flex items-center justify-center opacity-20">
                <div className="text-center">
                  <Archive size={72} className="text-outline mx-auto mb-4" />
                  <p className="font-headline font-bold text-xl text-outline">저장소를 선택하세요</p>
                  <p className="text-outline text-sm mt-1">선택한 저장소의 분석 기록을 확인할 수 있습니다</p>
                </div>
              </div>
            ) : (
              <>
                {/* Panel Header */}
                <div className="px-8 pt-6 pb-4 flex-shrink-0 border-b border-outline-variant/10">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="font-headline font-black text-xl text-[#e5e2e1] tracking-tight">
                        {selectedRepo.full_name.split('/')[1]}
                      </h2>
                      <p className="text-outline text-xs font-mono mt-0.5">{selectedRepo.full_name}</p>
                    </div>
                    {/* Stats pills */}
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <span className="px-3 py-1.5 bg-[#2ff801]/10 border border-[#2ff801]/20 rounded-full text-[11px] font-bold text-[#2ff801] flex items-center gap-1.5">
                        <Zap size={11} />
                        +{selectedRepo.totalXp.toLocaleString()} XP 획득
                      </span>
                      <span className="px-3 py-1.5 bg-primary-container/10 border border-primary-container/20 rounded-full text-[11px] font-bold text-primary-container flex items-center gap-1.5">
                        <BookOpen size={11} />
                        {selectedRepo.analysisCount}건 분석 완료
                      </span>
                      <a
                        href={`/?repo=${encodeURIComponent(selectedRepo.full_name)}`}
                        className="px-3 py-1.5 bg-primary-container text-white rounded-full text-[11px] font-bold flex items-center gap-1.5 hover:shadow-[0_0_15px_rgba(0,112,243,0.4)] transition-all"
                      >
                        <Wand2 size={11} />
                        이 저장소 분석하기
                      </a>
                    </div>
                  </div>
                </div>

                {/* Analysis List */}
                <div className="flex-1 overflow-y-auto px-8 py-4 space-y-3">
                  {loadingAnalyses ? (
                    <div className="flex items-center gap-3 text-outline text-sm pt-8 justify-center">
                      <Loader2 className="animate-spin" size={18} />
                      분석 기록을 불러오는 중...
                    </div>
                  ) : repoAnalyses.length === 0 ? (
                    <div className="text-center pt-16 opacity-40">
                      <BookOpen size={48} className="text-outline mx-auto mb-3" />
                      <p className="text-outline font-headline font-bold">이 저장소의 분석 기록이 없습니다</p>
                      <p className="text-outline text-sm mt-1">홈에서 커밋을 분석하면 여기에 기록됩니다</p>
                    </div>
                  ) : (
                    repoAnalyses.map((item) => {
                      const score = item.impact_score ?? 0;
                      const result = item.ai_result as AIResult | null;
                      const isExpanded = expandedId === item.id;

                      return (
                        <motion.div
                          key={item.id}
                          layout
                          className="bg-surface-low rounded-2xl border border-outline-variant/10 overflow-hidden hover:border-outline-variant/25 transition-all"
                        >
                          {/* Row */}
                          <div className="p-4 flex items-center gap-4">
                            {/* Impact score ring */}
                            <div className="relative w-10 h-10 flex-shrink-0">
                              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                <circle className="stroke-surface-highest" cx="18" cy="18" fill="none" r="15" strokeWidth="3" />
                                <circle
                                  className={cn('transition-all', ImpactColor(score).replace('text-', 'stroke-'))}
                                  cx="18" cy="18" fill="none" r="15"
                                  strokeWidth="3"
                                  strokeDasharray={`${score} 100`}
                                  strokeLinecap="round"
                                />
                              </svg>
                              <span className={cn('absolute inset-0 flex items-center justify-center font-mono text-[9px] font-black', ImpactColor(score))}>
                                {score}
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-[#e5e2e1] line-clamp-1">
                                {result?.title ?? item.commit_message ?? '(제목 없음)'}
                              </p>
                              <p className="text-[10px] text-outline font-mono mt-0.5">
                                {item.commit_sha.slice(0, 8)} · {new Date(item.created_at).toLocaleDateString()} · +{item.xp_awarded} XP
                              </p>
                            </div>

                            <button
                              onClick={() => setExpandedId(isExpanded ? null : item.id)}
                              className="text-outline hover:text-primary-container transition-colors flex-shrink-0"
                            >
                              <Eye size={16} />
                            </button>
                          </div>

                          {/* Expanded detail */}
                          <AnimatePresence>
                            {isExpanded && result && (
                              <motion.div
                                key="detail"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="border-t border-outline-variant/10 bg-[#0e0e0e] px-4 overflow-hidden"
                              >
                                <div className="py-4 space-y-3">
                                  {result.background && (
                                    <p className="text-sm text-[#e5e2e1]/80 leading-relaxed">{result.background}</p>
                                  )}
                                  {result.changes?.length > 0 && (
                                    <ul className="space-y-1">
                                      {result.changes.map((c, i) => (
                                        <li key={i} className="text-xs text-[#e5e2e1] flex gap-2">
                                          <span className="text-[#2ff801] flex-shrink-0">▸</span>
                                          {c}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                  {result.techStack?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 pt-1">
                                      {result.techStack.map((t, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-surface-highest text-[10px] font-mono text-outline rounded">
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {result.mascotNote && (
                                    <div className="bg-surface-low p-3 rounded-lg border-l-2 border-tertiary">
                                      <p className="text-xs text-tertiary italic">&quot;{result.mascotNote}&quot;</p>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
