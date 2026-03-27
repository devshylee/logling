/**
 * heatmap.ts
 * Utilities for rendering activity heatmaps and calculating streaks.
 */

export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Generate a 53-week grid of date strings (oldest → newest, Sun→Sat) */
export function buildHeatmapGrid(): string[][] {
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
export function calcStreaks(activeSet: Set<string>): { current: number; best: number } {
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

export function getIntensityClass(count: number): string {
  if (count === 0) return 'bg-surface-highest/30';
  if (count === 1) return 'bg-secondary-container/20';
  if (count === 2) return 'bg-secondary-container/40';
  if (count === 3) return 'bg-secondary-container/70';
  return 'bg-secondary-container'; // 4+
}

export function getScoreColor(score: number) {
  if (score >= 80) return { dot: 'bg-[#2ff801]', border: 'border-[#2ff801]', bg: 'bg-[#2ff801]/10', text: 'text-[#2ff801]' };
  if (score >= 50) return { dot: 'bg-primary-container', border: 'border-primary-container', bg: 'bg-primary-container/10', text: 'text-primary-container' };
  return { dot: 'bg-outline', border: 'border-outline-variant', bg: 'bg-surface-low', text: 'text-outline' };
}
