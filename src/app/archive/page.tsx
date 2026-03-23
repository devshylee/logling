"use client";

import React from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { motion } from 'motion/react';
import { Search, Filter, Calendar, Eye, Code2, FileJson, Terminal, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const achievements = [
  {
    id: 1,
    title: "Refactored State Management Core",
    impact: 92,
    category: "Architectural Shift",
    summary: "feat(core): implement zero-copy immutable store with reactive proxies. Resolves #452 performance bottleneck.",
    repo: "logling-core",
    date: "2023-11-24",
    icons: [Code2, FileJson]
  },
  {
    id: 2,
    title: "CI/CD Pipeline Optimization",
    impact: 64,
    category: "Speed Opt",
    summary: "chore(ops): implement build caching layer; reduced deployment time from 12m to 4.5m.",
    repo: "ops-tooling",
    date: "2023-12-01",
    icons: [Terminal]
  },
  {
    id: 3,
    title: "Achievement Archive System",
    impact: 78,
    category: "Feature Launch",
    summary: "feat(ui): dynamic masonry layout for historical commits with impact scoring and filtering.",
    repo: "logling-frontend",
    date: "Today",
    icons: [Code2]
  }
];

export default function ArchivePage() {
  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar activeId="archive" />
      
      <main className="flex-1 ml-64">
        <TopBar />
        
        <div className="p-10 max-w-7xl mx-auto space-y-10">
          {/* Mascot Header */}
          <section className="flex items-start gap-6 max-w-4xl">
            <div className="relative group">
              <div className="absolute inset-0 bg-tertiary blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <div className="relative w-24 h-24 rounded-3xl bg-surface-highest border border-outline-variant/30 flex items-center justify-center p-2">
                <img 
                  alt="Logling Historian" 
                  className="w-full h-full rounded-2xl" 
                  src="https://picsum.photos/seed/historian/100/100"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            <div className="bg-surface-high/60 backdrop-blur-md border border-outline-variant/20 p-6 rounded-2xl relative">
              <div className="absolute -left-2 top-8 w-4 h-4 bg-surface-high/60 border-l border-b border-outline-variant/20 rotate-45"></div>
              <h2 className="font-headline font-bold text-xl text-primary-container mb-1">Logling Historian</h2>
              <p className="text-[#e5e2e1] text-lg leading-relaxed font-medium">
                &quot;You&apos;ve conquered <span className="text-[#79ff5b] font-mono font-bold tracking-tight">124 commits</span> so far! Which masterpiece shall we revisit?&quot;
              </p>
            </div>
          </section>

          {/* Filter Bar */}
          <section className="bg-surface-low p-4 rounded-2xl flex flex-wrap items-center gap-4 border border-outline-variant/10 shadow-xl">
            <div className="flex-1 min-w-[280px] relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" size={18} />
              <input 
                className="w-full bg-[#131313] border-none rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary-container transition-all placeholder:text-outline/50" 
                placeholder="Search achievements, commits, or repos..." 
                type="text"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <select className="appearance-none bg-surface-highest border-none rounded-xl pl-4 pr-10 py-3 text-xs font-headline font-bold uppercase tracking-wider text-[#e5e2e1] focus:ring-2 focus:ring-primary-container cursor-pointer">
                  <option>Repository</option>
                </select>
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" size={14} />
              </div>
              <div className="relative">
                <select className="appearance-none bg-surface-highest border-none rounded-xl pl-4 pr-10 py-3 text-xs font-headline font-bold uppercase tracking-wider text-[#e5e2e1] focus:ring-2 focus:ring-primary-container cursor-pointer">
                  <option>Impact Score</option>
                </select>
                <Zap className="absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" size={14} />
              </div>
              <button className="bg-surface-highest p-3 rounded-xl text-outline hover:text-primary-container hover:bg-surface-high transition-all">
                <Calendar size={18} />
              </button>
            </div>
          </section>

          {/* Achievement Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {achievements.map((item) => (
              <motion.div 
                key={item.id}
                whileHover={{ y: -4 }}
                className="group relative"
              >
                <div className="absolute -inset-[1px] bg-gradient-to-r from-primary-container via-tertiary to-[#2ff801] opacity-20 group-hover:opacity-100 transition-opacity rounded-2xl blur-[1px]"></div>
                <div className="relative bg-surface-high p-6 rounded-2xl shadow-2xl transition-all duration-300">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 rounded-full border-2 border-primary-container p-1 relative">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                          <circle className="stroke-surface-highest" cx="18" cy="18" fill="none" r="16" strokeWidth="3"></circle>
                          <circle 
                            className="stroke-primary-container" 
                            cx="18" cy="18" fill="none" r="16" 
                            strokeWidth="3" 
                            strokeDasharray={`${item.impact} 100`}
                          ></circle>
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] font-bold text-primary-container">{item.impact}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-headline font-black uppercase text-outline tracking-widest block">Impact Score</span>
                        <span className="text-xs font-bold text-[#e5e2e1]">{item.category}</span>
                      </div>
                    </div>
                    <button className="text-outline hover:text-primary-container transition-colors">
                      <Eye size={18} />
                    </button>
                  </div>
                  
                  <h3 className="text-xl font-headline font-bold mb-3 group-hover:text-primary-container transition-colors">{item.title}</h3>
                  <p className="font-mono text-sm text-outline leading-relaxed mb-6 bg-[#131313] p-3 rounded-lg border-l-4 border-primary-container">
                    {item.summary}
                  </p>
                  
                  <div className="flex items-center justify-between border-t border-outline-variant/15 pt-4">
                    <div className="flex gap-2">
                      {item.icons.map((Icon, idx) => (
                        <div key={idx} className="w-8 h-8 rounded-lg bg-[#2a2a2a] flex items-center justify-center border border-outline-variant/30">
                          <Icon size={16} className="text-outline" />
                        </div>
                      ))}
                    </div>
                    <span className="font-mono text-[10px] text-outline">{item.date} • {item.repo}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
