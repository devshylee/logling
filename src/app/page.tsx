"use client";

import React from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { motion } from 'motion/react';
import { Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar activeId="home" />
      
      <main className="flex-1 ml-64">
        <TopBar />
        
        <div className="p-10 max-w-7xl mx-auto space-y-10">
          {/* Level Bar Section */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface-low rounded-2xl p-8 border border-outline-variant/5 overflow-hidden relative group"
          >
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-container/10 blur-[100px] rounded-full"></div>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
              <div className="flex-1">
                <div className="flex items-baseline gap-4 mb-4">
                  <h1 className="font-headline text-5xl font-black text-[#e5e2e1] tracking-tighter">Level 25</h1>
                  <span className="font-headline text-xs font-bold text-[#79ff5b] uppercase tracking-[0.2em]">Architect Class</span>
                </div>
                
                <div className="w-full h-4 bg-surface-highest rounded-full overflow-hidden flex items-center p-[2px]">
                  <div className="h-full w-[72%] bg-[#2ff801] rounded-full relative overflow-visible shadow-[0_0_15px_#2ff801]">
                    <div className="absolute right-0 top-0 h-full w-4 bg-white/40 blur-sm"></div>
                  </div>
                </div>
                
                <div className="flex justify-between mt-3">
                  <span className="font-mono text-[10px] text-outline uppercase tracking-widest">7,240 XP / 10,000 XP</span>
                  <span className="font-mono text-[10px] text-[#2ff801] font-bold uppercase tracking-widest">Next Level: 26</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 md:w-64">
                <div className="bg-surface-high p-4 rounded-xl border border-outline-variant/10">
                  <p className="text-[10px] text-outline uppercase font-headline tracking-widest mb-1">Total EXP</p>
                  <p className="font-mono text-lg font-bold text-[#e5e2e1]">62,500</p>
                </div>
                <div className="bg-surface-high p-4 rounded-xl border border-outline-variant/10">
                  <p className="text-[10px] text-outline uppercase font-headline tracking-widest mb-1">Dailies</p>
                  <p className="font-mono text-lg font-bold text-primary-container">5/5</p>
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
                  Welcome back! You have <span className="text-primary-container font-bold">5 unanalyzed commits</span> today!
                </p>
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-surface-high/60 border-r border-b border-outline-variant/20 rotate-45"></div>
              </motion.div>

              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="w-64 h-64 relative"
              >
                <div className="absolute inset-0 bg-tertiary/20 blur-[60px] rounded-full"></div>
                <div className="relative w-full h-full flex items-center justify-center">
                  <div className="w-48 h-48 bg-surface-high rounded-[40px] border-4 border-surface-highest shadow-inner flex flex-col items-center justify-center gap-4">
                    <div className="flex gap-4">
                      <div className="w-10 h-3 bg-[#2ff801] rounded-full shadow-[0_0_15px_#2ff801]"></div>
                      <div className="w-10 h-3 bg-[#2ff801] rounded-full shadow-[0_0_15px_#2ff801]"></div>
                    </div>
                    <div className="w-24 h-1 bg-outline-variant/30 rounded-full"></div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Recent Analysis */}
            <div className="lg:col-span-5 space-y-6">
              <div className="flex items-center justify-between mb-2 px-2">
                <h2 className="font-headline font-bold text-xl tracking-tight">Recent Analysis</h2>
                <button className="text-xs font-headline font-bold uppercase tracking-widest text-outline hover:text-[#e5e2e1] transition-colors">View All</button>
              </div>

              <div className="space-y-4">
                {[
                  { title: "feat: optimize shader pipeline", repo: "logling-core", time: "2h ago", impact: 84, color: "text-[#2ff801]" },
                  { title: "fix: solve memory leak", repo: "logling-auth", time: "5h ago", impact: 92, color: "text-[#2ff801]" },
                  { title: "chore: update dependencies", repo: "logling-core", time: "Yesterday", impact: 12, color: "text-outline" },
                ].map((item, i) => (
                  <motion.div 
                    key={i}
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
                          <h4 className="text-sm font-bold text-[#e5e2e1] line-clamp-1">{item.title}</h4>
                          <p className="font-mono text-[10px] text-outline tracking-tighter">{item.repo} • {item.time}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-outline uppercase font-headline font-bold tracking-widest">Impact</p>
                        <p className={cn("text-lg font-black font-headline", item.color)}>{item.impact}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button className="flex-1 py-2 bg-surface-low text-[#e5e2e1] text-[10px] font-bold uppercase tracking-widest rounded-lg border border-outline-variant/10 hover:bg-surface-highest transition-colors">
                        View Diff
                      </button>
                      <button className="flex-1 py-2 bg-primary-container/10 text-primary-container text-[10px] font-bold uppercase tracking-widest rounded-lg border border-primary-container/20 hover:bg-primary-container hover:text-white transition-all">
                        Generate Blog
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
