'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { motion } from 'motion/react';
import { Loader2, Flame, Zap, BookOpen, TrendingUp, CalendarDays } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Analysis, UserProfile, AIResult } from '@/types';
import { cn } from '@/lib/utils';

// ── Heatmap helpers ──────────────────────────────────────────────────────────

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Generate a 53-week grid of date strings (oldest → newest, Sun→Sat) */
function buildHeatmapGrid(): string[][] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start from the Sunday 52 weeks before the start of the current week
  const dayOfWeek = today.getDay();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - dayOfWeek - 52 * 7);

  const weeks: string[][] = [];
  const cursor = new Date(startDate);

  while (cursor <= today) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      const cell = new Date(cursor);
      week.push(cell <= today ? toDateStr(cell) : '');
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  return weeks;
}

/** Compute current & best consecutive streaks from a set of active date strings */
function calcStreaks(activeSet: Set<string>): { current: number; best: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dates = Array.from({ length: 365 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    return toDateStr(d);
  });

  let current = 0;
  for (const dateStr of dates) {
    if (activeSet.has(dateStr)) {
      current++;
    } else {
      break;
    }
  }

  let best = 0;
  let run = 0;
  for (let i = dates.length - 1; i >= 0; i--) {
    if (activeSet.has(dates[i])) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }

  return { current, best };
}

function getIntensityClass(count: number): string {
  if (count === 0) return 'bg-surface-highest/30';
  if (count === 1) return 'bg-secondary-container/20';
  if (count === 2) return 'bg-secondary-container/40';
  if (count === 3) return 'bg-secondary-container/70';
  return 'bg-secondary-container'; // 4+
}

function getScoreColor(score: number) {
  if (score >= 80) return { dot: 'bg-[#2ff801]', border: 'border-[#2ff801]', bg: 'bg-[#2ff801]/10', text: 'text-[#2ff801]' };
  if (score >= 50) return { dot: 'bg-primary-container', border: 'border-primary-container', bg: 'bg-primary-container/10', text: 'text-primary-container' };
  return { dot: 'bg-outline', border: 'border-outline-variant', bg: 'bg-surface-low', text: 'text-outline' };
}

// ── Main component ───────────────────────────────────────────────────────────

export default function ArchivePage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [analysesStats, setAnalysesStats] = useState<{ id: string; created_at: string; xp_awarded: number }[]>([]);
  const [recentAnalyses, setRecentAnalyses] = useState<Analysis[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number; xp: number } | null>(null);

  const userId = session?.user?.id;

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') router.push('/login');
  }, [sessionStatus, router]);

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const [{ data: profileData }, { data: statsData }, { data: recentData }] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('id', userId).single(),
      supabase
        .from('analyses')
        .select('id, created_at, xp_awarded')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('created_at', oneYearAgo.toISOString())
        .order('created_at', { ascending: false }),
      supabase
        .from('analyses')
        .select('*') // Optimized to use all fields as specified in Analysis type
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(25),
    ]);

    if (profileData) setProfile(profileData as UserProfile);
    if (statsData) setAnalysesStats(statsData);
    if (recentData) setRecentAnalyses(recentData as Analysis[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Derived data ─────────────────────────────────────────────────────────
  const { dateCountMap, dateXpMap, activeSet, grid, streaks, totalXp, monthPositions } = useMemo(() => {
    const dateCountMap: Record<string, number> = {};
    const dateXpMap: Record<string, number> = {};

    for (const a of analysesStats) {
      const date = a.created_at.slice(0, 10);
      dateCountMap[date] = (dateCountMap[date] ?? 0) + 1;
      dateXpMap[date] = (dateXpMap[date] ?? 0) + (a.xp_awarded ?? 0);
    }

    const activeSet = new Set(Object.keys(dateCountMap));
    const grid = buildHeatmapGrid();
    const streaks = calcStreaks(activeSet);
    const totalXp = analysesStats.reduce((s, a) => s + (a.xp_awarded ?? 0), 0);

    // Find which columns to display month labels
    const monthPositions: { label: string; col: number }[] = [];
    let lastMonth = -1;
    grid.forEach((week, col) => {
      const firstDate = week.find(d => d !== '');
      if (!firstDate) return;
      // firstDate is YYYY-MM-DD, so slice(5,7) is the month (01-12)
      const month = parseInt(firstDate.slice(5, 7), 10) - 1; // getMonth() returns 0-11
      if (month !== lastMonth) {
        monthPositions.push({ label: MONTH_LABELS[month], col });
        lastMonth = month;
      }
    });

    return { dateCountMap, dateXpMap, activeSet, grid, streaks, totalXp, monthPositions };
  }, [analysesStats]);

  // ── Loading ─────────────────────────────────────────────────────────────
  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="flex min-h-screen bg-surface items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary-container" />
      </div>
    );
  }



  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <Sidebar activeId="archive" profile={profile} />

      <main className="flex-1 ml-64 overflow-y-auto">
        <TopBar />

        <div className="p-10 max-w-5xl mx-auto space-y-8">

          {/* ── Page Header ── */}
          <div>
            <h1 className="font-headline text-4xl font-black tracking-tighter text-[#e5e2e1]">성장 기록</h1>
            <p className="text-outline text-sm mt-1">지난 1년간의 AI 분석 활동 히스토리</p>
          </div>

          {/* ── Stats Row ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: '현재 연속',
                value: `${streaks.current}일`,
                icon: Flame,
                colorText: 'text-orange-400',
                colorBg: 'bg-orange-400/10 border-orange-400/20',
              },
              {
                label: '최장 연속',
                value: `${streaks.best}일`,
                icon: TrendingUp,
                colorText: 'text-[#2ff801]',
                colorBg: 'bg-[#2ff801]/10 border-[#2ff801]/20',
              },
              {
                label: '총 분석 수',
                value: `${analysesStats.length}건`,
                icon: BookOpen,
                colorText: 'text-primary-container',
                colorBg: 'bg-primary-container/10 border-primary-container/20',
              },
              {
                label: '총 획득 XP',
                value: `+${totalXp.toLocaleString()}`,
                icon: Zap,
                colorText: 'text-tertiary',
                colorBg: 'bg-tertiary/10 border-tertiary/20',
              },
            ].map(({ label, value, icon: Icon, colorText, colorBg }) => (
              <div key={label} className={cn('rounded-2xl border p-5', colorBg)}>
                <div className={cn('flex items-center gap-2 mb-2', colorText)}>
                  <Icon size={14} />
                  <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
                </div>
                <p className={cn('font-headline text-2xl font-black', colorText)}>{value}</p>
              </div>
            ))}
          </div>

          {/* ── Activity Heatmap ── */}
          <div className="bg-surface-low rounded-2xl border border-outline-variant/10 p-6">
            <div className="flex items-center gap-2 mb-5">
              <CalendarDays size={16} className="text-outline" />
              <span className="text-sm font-bold text-[#e5e2e1]">
                활동 히트맵
                <span className="text-outline font-normal ml-1">— 최근 1년</span>
              </span>
            </div>

            <div className="overflow-x-auto">
              {/* Month Labels */}
              <div className="flex pl-7 mb-1" style={{ gap: 3 }}>
                {grid.map((_, col) => {
                  const mp = monthPositions.find(m => m.col === col);
                  return (
                    <div key={col} className="text-[9px] text-outline font-mono" style={{ width: 12, minWidth: 12 }}>
                      {mp ? mp.label : ''}
                    </div>
                  );
                })}
              </div>

              {/* Grid */}
              <div className="flex" style={{ gap: 3 }}>
                {/* Day labels */}
                <div className="flex flex-col mr-1" style={{ gap: 3 }}>
                  {DAY_LABELS.map((d, i) => (
                    <div key={d} className="flex items-center justify-end text-[9px] text-outline font-mono" style={{ height: 12 }}>
                      {i % 2 === 1 ? d.slice(0, 1) : ''}
                    </div>
                  ))}
                </div>

                {/* Heatmap cells */}
                {grid.map((week, col) => (
                  <div key={col} className="flex flex-col" style={{ gap: 3 }}>
                    {week.map((date, row) => {
                      const count = date ? (dateCountMap[date] ?? 0) : 0;
                      const xp = date ? (dateXpMap[date] ?? 0) : 0;
                      return (
                        <div
                          key={`${col}-${row}`}
                          className={cn(
                            'rounded-sm cursor-pointer transition-all hover:ring-1 hover:ring-white/40',
                            date ? getIntensityClass(count) : 'bg-transparent'
                          )}
                          style={{ width: 12, height: 12 }}
                          onMouseEnter={() => date && setHoveredDay({ date, count, xp })}
                          onMouseLeave={() => setHoveredDay(null)}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Info bar: legend + hover info */}
              <div className="flex items-center justify-between mt-3">
                {/* Hover info */}
                <div className="text-xs text-outline h-4">
                  {hoveredDay && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <span className="text-[#e5e2e1] font-semibold">{hoveredDay.date}</span>
                      {' — '}
                      {hoveredDay.count > 0
                        ? <span className="text-[#2ff801]">{hoveredDay.count}건 분석 · +{hoveredDay.xp} XP 획득</span>
                        : '분석 없음'}
                    </motion.span>
                  )}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-outline">적음</span>
                  {[0, 1, 2, 3, 4].map(n => (
                    <div key={n} className={cn('rounded-sm', getIntensityClass(n))} style={{ width: 12, height: 12 }} />
                  ))}
                  <span className="text-[10px] text-outline">많음</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Recent Timeline ── */}
          <div>
            <h2 className="font-headline font-bold text-lg text-[#e5e2e1] mb-5">
              최근 분석 타임라인
            </h2>

            {recentAnalyses.length === 0 ? (
              <div className="text-center py-16 opacity-40">
                <BookOpen size={48} className="text-outline mx-auto mb-3" />
                <p className="text-outline font-headline font-bold">분석 기록이 없습니다</p>
                <p className="text-outline text-sm mt-1">
                  <a href="/" className="text-primary-container hover:underline">홈에서 첫 번째 분석을 시작</a>해보세요!
                </p>
              </div>
            ) : (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[11px] top-3 bottom-3 w-px bg-outline-variant/20" />

                <div className="space-y-3">
                  {recentAnalyses.map((item, idx) => {
                    const score = item.impact_score ?? 0;
                    const result = item.ai_result as AIResult | null;
                    const c = getScoreColor(score);

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(idx * 0.03, 0.4) }}
                        className="flex gap-4"
                      >
                        {/* Timeline dot */}
                        <div className={cn(
                          'w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-1',
                          c.border, c.bg
                        )}>
                          <div className={cn('w-2 h-2 rounded-full', c.dot)} />
                        </div>

                        {/* Card */}
                        <div className="flex-1 bg-surface-low rounded-2xl border border-outline-variant/10 p-4 hover:border-outline-variant/25 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-[#e5e2e1] line-clamp-1">
                                {result?.title ?? item.commit_message ?? '(제목 없음)'}
                              </p>
                              <p className="text-[10px] text-outline font-mono mt-0.5">
                                {new Date(item.created_at).toLocaleString('ko-KR', {
                                  month: 'short', day: 'numeric',
                                  hour: '2-digit', minute: '2-digit',
                                })}
                                {' · '}
                                {item.commit_sha.slice(0, 8)}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className={cn('font-mono text-xs font-black', c.text)}>{score}pt</span>
                              <span className="text-[10px] font-bold text-[#2ff801]">+{item.xp_awarded} XP</span>
                            </div>
                          </div>

                          {result?.techStack && result.techStack.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {result.techStack.slice(0, 6).map((t, i) => (
                                <span
                                  key={i}
                                  className="px-1.5 py-0.5 bg-surface-highest text-[10px] font-mono text-outline rounded"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}

                          {result?.mascotNote && (
                            <p className="mt-2 text-[11px] text-tertiary italic line-clamp-1">
                              &ldquo;{result.mascotNote}&rdquo;
                            </p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
