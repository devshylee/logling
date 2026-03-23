"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { 
  Home, 
  Database, 
  Archive, 
  Settings, 
  ShieldCheck, 
  HelpCircle,
  PlusCircle,
  Terminal
} from 'lucide-react';
import { motion } from 'motion/react';

const navItems = [
  { icon: Home, label: 'Home', href: '/', id: 'home' },
  { icon: Database, label: 'Repositories', href: '/repositories', id: 'repos' },
  { icon: Archive, label: 'Archive', href: '/archive', id: 'archive' },
  { icon: Settings, label: 'Settings', href: '/settings', id: 'settings' },
];

export default function Sidebar({ activeId }: { activeId: string }) {
  return (
    <aside className="fixed left-0 top-0 h-full flex flex-col z-40 bg-[#131313] w-64 border-r border-[#414754]/15 font-headline text-xs font-medium">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center shadow-[0_0_20px_rgba(0,112,243,0.3)]">
            <Terminal size={20} className="text-white fill-current" />
          </div>
          <div>
            <h2 className="text-[#e5e2e1] font-bold text-lg leading-none">Logling Unit</h2>
            <p className="text-outline text-[10px] uppercase tracking-widest mt-1">Level 25 Architect</p>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = item.id === activeId;
            return (
              <a
                key={item.id}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 pl-4 py-3 transition-all rounded-lg group",
                  isActive 
                    ? "bg-[#2a2a2a] text-[#0070f3] rounded-r-full mr-4 shadow-[inset_4px_0_0_#0070f3]" 
                    : "text-[#8b90a0] hover:text-[#e5e2e1] hover:bg-[#1c1b1b]"
                )}
              >
                <item.icon size={18} className={cn(isActive && "fill-current")} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        <button className="w-full mt-8 py-3 bg-primary-container text-white rounded-xl font-bold uppercase tracking-tighter hover:shadow-[0_0_15px_rgba(0,112,243,0.4)] transition-all flex items-center justify-center gap-2 active:scale-95">
          <PlusCircle size={16} />
          New Quest
        </button>
      </div>

      <div className="mt-auto p-6 space-y-1">
        <a className="flex items-center gap-3 text-[#8b90a0] pl-4 py-3 hover:text-[#e5e2e1] transition-all" href="#">
          <ShieldCheck size={18} />
          <span>Security</span>
        </a>
        <a className="flex items-center gap-3 text-[#8b90a0] pl-4 py-3 hover:text-[#e5e2e1] transition-all" href="#">
          <HelpCircle size={18} />
          <span>Support</span>
        </a>
      </div>
    </aside>
  );
}
