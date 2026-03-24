'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { motion } from 'motion/react';
import { Terminal, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Analysis, UserProfile } from '@/types';
import { getLevelProgress, getLevelFromXP, XP_PER_LEVEL } from '@/types';

function ImpactColor(score: number) {
  if (score >= 80) return 'text-[#2ff801]';
  if (score >= 50) return 'text-primary-container';
  if (score >= 20) return 'text-tertiary';
  return 'text-outline';
}

function StatusBadge({ status }: { status: Analysis['status'] }) {
  const map = {
    pending: <span className="flex items-center gap-1 text-outline text-[10px] font-mono"><Loader2 size={12} className="animate-spin" /> Pending</span>,
    processing: <span className="flex items-center gap-1 text-primary-container text-[10px] font-mono"><Loader2 size={12} className="animate-spin" /> Analyzing...</span>,
    completed: <span className="flex items-center gap-1 text-[#2ff801] text-[10px] font-mono"><CheckCircle2 size={12} /> Done</span>,
    failed: <span className="flex items-center gap-1 text-red-400 text-[10px] font-mono"><AlertCircle size={12} /> Failed</span>,
  };
  return map[status] ?? null;
}

export default function DashboardPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = (session?.user as any)?.id as string | undefined;

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') router.push('/login');
  }, [sessionStatus, router]);

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [profileRes, analysesRes] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('id', userId).single(),
      supabase
        .from('analyses')
        .select('*, repository:repositories(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);
    if (profileRes.data) setProfile(profileRes.data as UserProfile);
    if (analysesRes.data) setAnalyses(analysesRes.data as Analysis[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Supabase Realtime: watch for analysis status updates
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('dashboard-analyses')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'analyses', filter: `user_id=eq.${userId}` },
        (payload) => {
          setAnalyses((prev) =>
            prev.map((a) => (a.id === payload.new.id ? { ...a, ...(payload.new as Analysis) } : a))
          );
          // Refresh profile to get updated XP
          if (payload.new.status === 'completed') {
            supabase.from('user_profiles').select('*').eq('id', userId).single().then(({ data }) => {
              if (data) setProfile(data as UserProfile);
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const currentLevel = profile ? getLevelFromXP(profile.xp) : 1;
  const progressPct = profile ? getLevelProgress(profile.xp) * 100 : 0;
  const currentXP = profile ? profile.xp % XP_PER_LEVEL : 0;
  const pendingCount = analyses.filter((a) => a.status === 'pending' || a.status === 'processing').length;

  if (sessionStatus === 'loading' || (sessionStatus === 'authenticated' && loading)) {
    return (
      <div className="flex min-h-screen bg-surface items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary-container" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar activeId="home" profile={profile} />

      <main className="flex-1 ml-64">
        <TopBar />

        <div className="p-10 max-w-7xl mx-auto space-y-10">
          {/* Level Bar Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface-low rounded-2xl p-8 border border-outline-variant/5 overflow-hidden relative group"
          >
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-container/10 blur-[100px] rounded-full" />
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
              <div className="flex-1">
                <div className="flex items-baseline gap-4 mb-4">
                  <h1 className="font-headline text-5xl font-black text-[#e5e2e1] tracking-tighter">
                    Level {currentLevel}
                  </h1>
                  <span className="font-headline text-xs font-bold text-[#79ff5b] uppercase tracking-[0.2em]">
                    {profile?.nickname ?? 'Developer'}
                  </span>
                </div>

                <div className="w-full h-4 bg-surface-highest rounded-full overflow-hidden flex items-center p-[2px]">
                  <motion.div
                    className="h-full bg-[#2ff801] rounded-full relative overflow-visible shadow-[0_0_15px_#2ff801]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  >
                    <div className="absolute right-0 top-0 h-full w-4 bg-white/40 blur-sm" />
                  </motion.div>
                </div>

                <div className="flex justify-between mt-3">
                  <span className="font-mono text-[10px] text-outline uppercase tracking-widest">
                    {currentXP.toLocaleString()} XP / {XP_PER_LEVEL.toLocaleString()} XP
                  </span>
                  <span className="font-mono text-[10px] text-[#2ff801] font-bold uppercase tracking-widest">
                    Next Level: {currentLevel + 1}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 md:w-64">
                <div className="bg-surface-high p-4 rounded-xl border border-outline-variant/10">
                  <p className="text-[10px] text-outline uppercase font-headline tracking-widest mb-1">Total XP</p>
                  <p className="font-mono text-lg font-bold text-[#e5e2e1]">{(profile?.xp ?? 0).toLocaleString()}</p>
                </div>
                <div className="bg-surface-high p-4 rounded-xl border border-outline-variant/10">
                  <p className="text-[10px] text-outline uppercase font-headline tracking-widest mb-1">Analyzing</p>
                  <p className={cn('font-mono text-lg font-bold', pendingCount > 0 ? 'text-primary-container' : 'text-outline')}>
                    {pendingCount > 0 ? `${pendingCount} jobs` : 'Idle'}
                  </p>
                </div>
              </div>
            </div>
          </motion.section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Mascot Interaction */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center min-h-[400px] relative">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-surface-high/60 backdrop-blur-xl border border-outline-variant/20 p-6 rounded-3xl shadow-2xl relative mb-12 max-w-sm"
              >
                <p className="text-[#e5e2e1] text-lg font-headline font-medium leading-relaxed">
                  {pendingCount > 0
                    ? `🔍 ${pendingCount}개의 커밋을 분석 중이에요!`
                    : analyses.length === 0
                    ? '저장소를 연결하고 첫 번째 커밋을 분석해봐요! 🚀'
                    : `총 ${analyses.length}개의 분석 완료! 오늘도 멋진 코드네요 💪`}
                </p>
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-surface-high/60 border-r border-b border-outline-variant/20 rotate-45" />
              </motion.div>

              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="w-64 h-64 relative"
              >
                <div className="absolute inset-0 bg-tertiary/20 blur-[60px] rounded-full" />
                <div className="relative w-full h-full flex items-center justify-center">
                  <div className="w-48 h-48 bg-surface-high rounded-[40px] border-4 border-surface-highest shadow-inner flex flex-col items-center justify-center gap-4">
                    <div className="flex gap-4">
                      <div className={cn('w-10 h-3 rounded-full shadow-[0_0_15px_#2ff801]', pendingCount > 0 ? 'bg-primary-container' : 'bg-[#2ff801]')} />
                      <div className={cn('w-10 h-3 rounded-full shadow-[0_0_15px_#2ff801]', pendingCount > 0 ? 'bg-primary-container animate-pulse' : 'bg-[#2ff801]')} />
                    </div>
                    <div className="w-24 h-1 bg-outline-variant/30 rounded-full" />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Recent Analysis */}
            <div className="lg:col-span-5 space-y-6">
              <div className="flex items-center justify-between mb-2 px-2">
                <h2 className="font-headline font-bold text-xl tracking-tight">Recent Analysis</h2>
                <a href="/archive" className="text-xs font-headline font-bold uppercase tracking-widest text-outline hover:text-[#e5e2e1] transition-colors">
                  View All
                </a>
              </div>

              {analyses.length === 0 ? (
                <div className="bg-surface-high rounded-2xl p-8 border border-outline-variant/10 text-center">
                  <p className="text-outline text-sm">아직 분석 결과가 없어요.</p>
                  <a href="/repositories" className="mt-3 inline-block text-primary-container text-sm font-bold hover:underline">
                    저장소 연결하기 →
                  </a>
                </div>
              ) : (
                <div className="space-y-4">
                  {analyses.slice(0, 5).map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * i }}
                      className="bg-surface-high rounded-2xl p-5 border border-outline-variant/10 hover:border-primary-container/30 transition-all group"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#131313] flex items-center justify-center text-primary-container border border-outline-variant/10">
                            <Terminal size={18} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-[#e5e2e1] line-clamp-1">
                              {item.ai_result?.title ?? item.commit_message ?? 'Analyzing...'}
                            </h4>
                            <p className="font-mono text-[10px] text-outline tracking-tighter">
                              {(item.repository as any)?.full_name ?? 'unknown'} • {new Date(item.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {item.status === 'completed' ? (
                            <>
                              <p className="text-[10px] text-outline uppercase font-headline font-bold tracking-widest">Impact</p>
                              <p className={cn('text-lg font-black font-headline', ImpactColor(item.impact_score ?? 0))}>
                                {item.impact_score ?? 0}
                              </p>
                            </>
                          ) : (
                            <StatusBadge status={item.status} />
                          )}
                        </div>
                      </div>
                      {item.status === 'completed' && (
                        <div className="flex gap-3">
                          <a
                            href={`/archive`}
                            className="flex-1 py-2 bg-surface-low text-[#e5e2e1] text-[10px] font-bold uppercase tracking-widest rounded-lg border border-outline-variant/10 hover:bg-surface-highest transition-colors text-center"
                          >
                            View Details
                          </a>
                          <button className="flex-1 py-2 bg-primary-container/10 text-primary-container text-[10px] font-bold uppercase tracking-widest rounded-lg border border-primary-container/20 hover:bg-primary-container hover:text-white transition-all">
                            Generate Blog
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
