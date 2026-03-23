"use client";

import React from 'react';
import { Shield, Medal, Zap } from 'lucide-react';

export default function TopBar() {
  return (
    <header className="flex justify-between items-center w-full px-8 py-4 sticky top-0 z-50 bg-[#1c1b1b]/80 backdrop-blur-xl shadow-[0_0_40px_rgba(0,112,243,0.08)]">
      <div className="flex items-center gap-8">
        <h1 className="text-2xl font-black tracking-tighter text-[#e5e2e1] font-headline uppercase">Logling</h1>
        <nav className="hidden md:flex gap-6 items-center font-headline font-bold tracking-tight text-sm uppercase">
          <a className="text-[#8b90a0] hover:text-[#e5e2e1] transition-colors" href="#">Home</a>
          <a className="text-[#8b90a0] hover:text-[#e5e2e1] transition-colors" href="#">Repositories</a>
          <a className="text-[#8b90a0] hover:text-[#e5e2e1] transition-colors" href="#">Archive</a>
          <a className="text-[#0070f3] border-b-2 border-[#0070f3] pb-1" href="#">Settings</a>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-low rounded-full border border-outline-variant/10">
          <Shield size={14} className="text-[#d7ffc5] fill-current" />
          <span className="text-[10px] font-mono text-outline uppercase tracking-wider">AES-256 Encrypted</span>
        </div>
        <div className="flex gap-2">
          <button className="p-2 text-outline hover:bg-[#2a2a2a] rounded-lg transition-all">
            <Medal size={20} />
          </button>
          <button className="p-2 text-outline hover:bg-[#2a2a2a] rounded-lg transition-all">
            <Zap size={20} />
          </button>
        </div>
        <div className="w-10 h-10 rounded-full border-2 border-primary-container p-0.5">
          <img 
            alt="User avatar" 
            className="w-full h-full rounded-full" 
            src="https://picsum.photos/seed/architect/100/100"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </header>
  );
}
