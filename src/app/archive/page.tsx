'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { motion } from 'motion/react';
import { Search, Filter, Eye, Loader2, Terminal, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Analysis, UserProfile } from '@/types';

function ImpactColor(score: number) {
  if (score >= 80) return 'text-[#2ff801] stroke-[#2ff801]';
  if (score >= 50) return 'text-primary-container stroke-primary-container';
  return 'text-outline stroke-outline';
}

export default function ArchivePage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const userId = (session?.user as any)?.id as string | undefined;

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') router.push('/login');
  }, [sessionStatus, router]);

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [{ data: profileData }, { data: analysesData }] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('id', userId).single(),
      supabase
        .from('analyses')
        .select('*, repository:repositories(*)')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(50),
    ]);
    if (profileData) setProfile(profileData as UserProfile);
    if (analysesData) setAnalyses(analysesData as Analysis[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = analyses.filter((a) =>
    (a.ai_result?.title ?? a.commit_message ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (a.repository as any)?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="flex min-h-screen bg-surface items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary-container" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar activeId="archive" profile={profile} />
      <main className="flex-1 ml-64">
        <TopBar />
        <div className="p-10 max-w-7xl mx-auto space-y-8">

          {/* Mascot Header */}
          <section className="flex items-start gap-6 max-w-4xl">
            <div className="relative group flex-shrink-0">
              <div className="absolute inset-0 bg-tertiary blur-2xl opacity-20" />
              <div className="relative w-20 h-20 rounded-3xl bg-surface-highest border border-outline-variant/30 flex items-center justify-center">
                <Terminal size={32} className="text-tertiary" />
              </div>
            </div>
            <div className="bg-surface-high/60 backdrop-blur-md border border-outline-variant/20 p-5 rounded-2xl relative">
              <div className="absolute -left-2 top-8 w-4 h-4 bg-surface-high/60 border-l border-b border-outline-variant/20 rotate-45" />
              <h2 className="font-headline font-bold text-lg text-primary-container mb-1">Logling Archive</h2>
              <p className="text-[#e5e2e1] leading-relaxed">
                &quot;You&apos;ve conquered{' '}
                <span className="text-[#79ff5b] font-mono font-bold">{analyses.length} commits</span> so far! Which masterpiece shall we revisit?&quot;
              </p>
            </div>
          </section>

          {/* Filter Bar */}
          <section className="bg-surface-low p-4 rounded-2xl flex flex-wrap items-center gap-4 border border-outline-variant/10">
            <div className="flex-1 min-w-[280px] relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" size={18} />
              <input
                className="w-full bg-[#131313] border-none rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary-container transition-all placeholder:text-outline/50"
                placeholder="업적 제목, 커밋 메시지 또는 저장소 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-surface-highest rounded-xl text-outline text-xs font-mono">
              <Filter size={14} />
              <span>{filtered.length}개의 기록 발견</span>
            </div>
          </section>

          {/* Achievement Grid or empty */}
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <Zap size={48} className="text-outline mx-auto mb-4 opacity-30" />
              <p className="text-outline text-lg">No analyses yet.</p>
              <a href="/repositories" className="mt-2 inline-block text-primary-container font-bold hover:underline">
                Analyze your first commit →
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map((item) => {
                const score = item.impact_score ?? 0;
                const colorCls = ImpactColor(score);
                const result = item.ai_result;
                const isExpanded = expandedId === item.id;

                return (
                  <motion.div key={item.id} whileHover={{ y: -4 }} className="group relative">
                    <div className={cn(
                      'absolute -inset-[1px] bg-gradient-to-r from-primary-container via-tertiary to-[#2ff801] opacity-0 group-hover:opacity-30 transition-opacity rounded-2xl blur-[1px]'
                    )} />
                    <div className="relative bg-surface-high p-6 rounded-2xl shadow-2xl">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-12 rounded-full border-2 border-primary-container p-1 relative">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                              <circle className="stroke-surface-highest" cx="18" cy="18" fill="none" r="16" strokeWidth="3" />
                              <circle
                                className={colorCls}
                                cx="18" cy="18" fill="none" r="16"
                                strokeWidth="3"
                                strokeDasharray={`${score} 100`}
                              />
                            </svg>
                            <span className={cn('absolute inset-0 flex items-center justify-center font-mono text-[10px] font-bold', colorCls.split(' ')[0])}>
                              {score}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-headline font-black uppercase text-outline tracking-widest block">Impact Score</span>
                            <span className="text-xs font-bold text-[#e5e2e1]">
                              {score >= 80 ? 'Major' : score >= 50 ? 'Moderate' : score >= 20 ? 'Minor' : 'Trivial'}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          className="text-outline hover:text-primary-container transition-colors"
                        >
                          <Eye size={18} />
                        </button>
                      </div>

                      <h3 className="text-lg font-headline font-bold mb-2 group-hover:text-primary-container transition-colors line-clamp-2">
                        {result?.title ?? item.commit_message}
                      </h3>
                      <p className="font-mono text-xs text-outline leading-relaxed mb-4 bg-[#131313] p-3 rounded-lg border-l-4 border-primary-container line-clamp-2">
                        {result?.background ?? item.commit_message}
                      </p>

                      {isExpanded && result && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-3 mb-4"
                        >
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
                          {result.mascotNote && (
                            <div className="bg-surface-low p-3 rounded-lg border-l-2 border-tertiary">
                              <p className="text-xs text-tertiary italic">&quot;{result.mascotNote}&quot;</p>
                            </div>
                          )}
                          {result.techStack?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {result.techStack.map((t, i) => (
                                <span key={i} className="px-2 py-0.5 bg-surface-highest text-[10px] font-mono text-outline rounded">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}

                      <div className="flex items-center justify-between border-t border-outline-variant/15 pt-4">
                        <span className="font-mono text-[10px] text-outline">
                          +{item.xp_awarded} XP
                        </span>
                        <span className="font-mono text-[10px] text-outline">
                          {new Date(item.created_at).toLocaleDateString()} · {(item.repository as any)?.full_name?.split('/')[1] ?? 'unknown'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
