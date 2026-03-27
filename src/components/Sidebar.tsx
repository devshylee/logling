'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Home,
  Database,
  CalendarDays,
  Settings,
  ShieldCheck,
  HelpCircle,
  PlusCircle,
  Terminal
} from 'lucide-react';
import { motion } from 'motion/react';
import type { UserProfile } from '@/types';
import { getLevelFromXP } from '@/features/leveling/xpCalculator';

const navItems = [
  { icon: Home, label: '홈', href: '/', id: 'home' },
  { icon: Database, label: '내 저장소', href: '/repositories', id: 'repos' },
  { icon: CalendarDays, label: '성장 기록', href: '/archive', id: 'archive' },
  { icon: Settings, label: '설정', href: '/settings', id: 'settings' },
];

export default function Sidebar({ activeId, profile }: { activeId: string; profile?: UserProfile | null }) {
  const level = profile ? getLevelFromXP(profile.xp) : '—';
  const nickname = profile?.nickname ?? 'Developer';

  return (
    <aside className="fixed left-0 top-0 h-full flex flex-col z-40 bg-surface-low w-64 border-r border-outline-variant/10 font-headline text-xs font-medium">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center shadow-[0_0_20px_rgba(0,112,243,0.3)]">
            <Terminal size={20} className="text-white fill-current" />
          </div>
          <div>
            <h2 className="text-[#e5e2e1] font-bold text-lg leading-none">로그링 유닛</h2>
            <p className="text-outline text-[10px] uppercase tracking-widest mt-1">
              {profile ? `레벨 ${level} ${nickname}` : '데이터 로드 중...'}
            </p>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = item.id === activeId;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 pl-4 py-3 transition-all rounded-lg group',
                  isActive
                    ? 'bg-primary-container/10 text-primary-container rounded-r-full mr-4 shadow-[inset_4px_0_0_currentColor]'
                    : 'text-outline hover:text-[#e5e2e1] hover:bg-surface-high'
                )}
              >
                <item.icon size={18} className={cn(isActive && 'fill-current')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <Link
          href="/"
          className="w-full mt-8 py-3 bg-primary-container text-white rounded-xl font-bold uppercase tracking-tighter hover:shadow-[0_0_15px_rgba(0,112,243,0.4)] transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <PlusCircle size={16} />
          새로운 분석 시작
        </Link>
      </div>

      <div className="mt-auto p-6 space-y-1">
        <Link className="flex items-center gap-3 text-outline pl-4 py-3 hover:text-[#e5e2e1] transition-all" href="#">
          <ShieldCheck size={18} />
          <span>Security</span>
        </Link>
        <Link className="flex items-center gap-3 text-outline pl-4 py-3 hover:text-[#e5e2e1] transition-all" href="#">
          <HelpCircle size={18} />
          <span>Support</span>
        </Link>
      </div>
    </aside>
  );
}
