"use client";

import React from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { motion } from 'motion/react';
import { Download, Edit, Github, RefreshCw, Trash2, History, ShieldCheck, Cpu, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar activeId="settings" />
      
      <main className="flex-1 ml-64">
        <TopBar />
        
        <div className="p-10 max-w-7xl mx-auto space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h2 className="font-headline text-5xl font-bold tracking-tighter text-[#e5e2e1] mb-2 uppercase">System Config</h2>
              <p className="text-outline font-body text-lg">Manage your identity, neural interface, and data sovereignty.</p>
            </div>
            <div className="flex gap-4">
              <button className="px-6 py-2.5 bg-surface-high text-[#e5e2e1] border border-outline-variant/20 rounded-xl hover:bg-surface-bright transition-all font-medium flex items-center gap-2">
                <Download size={16} />
                Export Data
              </button>
              <button className="px-6 py-2.5 bg-primary-container text-white rounded-xl hover:shadow-[0_0_20px_rgba(0,112,243,0.3)] transition-all font-bold">
                Save Changes
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Profile Settings */}
            <section className="md:col-span-8 bg-surface-low rounded-3xl p-8 border border-outline-variant/10 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-6 mb-8">
                  <div className="relative group">
                    <img 
                      alt="User avatar" 
                      className="w-24 h-24 rounded-2xl border-2 border-primary-container shadow-2xl" 
                      src="https://picsum.photos/seed/architect/200/200"
                      referrerPolicy="no-referrer"
                    />
                    <button className="absolute -bottom-2 -right-2 bg-surface-bright p-2 rounded-lg border border-outline-variant/20 shadow-lg text-primary-container hover:text-white transition-colors">
                      <Edit size={14} />
                    </button>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-headline text-2xl font-bold text-[#e5e2e1] uppercase tracking-tight">System Architect</h3>
                      <span className="font-mono text-xs text-[#79ff5b] bg-[#79ff5b]/10 px-3 py-1 rounded-full uppercase">Lvl 25</span>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-[10px] font-mono text-outline uppercase">
                        <span>XP Progress</span>
                        <span>8,450 / 10,000 XP</span>
                      </div>
                      <div className="h-2 bg-surface-highest rounded-full overflow-hidden">
                        <div className="h-full bg-[#2ff801] relative w-[84%]">
                          <div className="absolute right-0 top-0 h-full w-4 bg-white/40 blur-sm"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-mono text-outline uppercase tracking-wider ml-1">Nickname</label>
                    <input 
                      className="w-full bg-surface-high border-none rounded-xl py-3 px-4 focus:ring-1 focus:ring-primary-container text-[#e5e2e1] font-medium" 
                      type="text" 
                      defaultValue="System Architect"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-mono text-outline uppercase tracking-wider ml-1">Email Hash</label>
                    <input 
                      className="w-full bg-surface-high border-none rounded-xl py-3 px-4 text-outline font-mono italic opacity-60" 
                      disabled 
                      type="text" 
                      defaultValue="arch_0x82f...91"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* GitHub Integration */}
            <section className="md:col-span-4 bg-surface-high rounded-3xl p-8 border border-outline-variant/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                    <Github size={24} className="text-black" />
                  </div>
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-[#2ff801]/10 text-[#2ff801] rounded-full text-[10px] font-bold uppercase tracking-tight">
                    <span className="w-1.5 h-1.5 bg-[#2ff801] rounded-full animate-pulse"></span>
                    Connected
                  </span>
                </div>
                <h3 className="font-headline text-xl font-bold mb-2">GitHub Forge</h3>
                <p className="text-outline text-sm leading-relaxed mb-4">Linked account: <span className="text-primary-container font-mono">@architect_prime</span></p>
                <div className="bg-[#131313] p-3 rounded-xl border border-outline-variant/5">
                  <p className="text-[11px] text-outline italic">Logling strictly adheres to <strong className="text-[#e5e2e1]">read-only access</strong> for your safety.</p>
                </div>
              </div>
              <button className="w-full mt-6 py-3 bg-[#131313] border border-outline-variant/20 text-[#e5e2e1] rounded-xl hover:bg-surface-bright transition-all font-mono text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                <RefreshCw size={14} />
                Refresh Token
              </button>
            </section>

            {/* Mascot Personality */}
            <section className="md:col-span-5 bg-surface-low rounded-3xl p-8 border border-outline-variant/10 space-y-6">
              <div className="flex items-center gap-3">
                <Cpu size={24} className="text-tertiary" />
                <h3 className="font-headline text-xl font-bold uppercase tracking-tight">Mascot Personality</h3>
              </div>
              <div className="space-y-8 py-4">
                <div className="relative">
                  <input 
                    className="w-full h-2 bg-surface-highest rounded-lg appearance-none cursor-pointer accent-primary-container" 
                    max="3" min="1" step="1" type="range" defaultValue="2"
                  />
                  <div className="flex justify-between mt-4">
                    <div className="text-center w-1/3">
                      <p className="text-[10px] font-mono text-outline uppercase">Witty</p>
                    </div>
                    <div className="text-center w-1/3">
                      <p className="text-[10px] font-mono text-primary-container uppercase font-bold">Professional</p>
                    </div>
                    <div className="text-center w-1/3">
                      <p className="text-[10px] font-mono text-outline uppercase">Aggressive</p>
                    </div>
                  </div>
                </div>
                <div className="bg-surface-high p-4 rounded-2xl flex items-start gap-3">
                  <MessageSquare size={18} className="text-tertiary" />
                  <p className="text-sm italic text-outline leading-relaxed">
                    &quot;Systems optimal, architect. Your code coverage is currently at 89%. Shall we aim for perfection today?&quot;
                  </p>
                </div>
              </div>
            </section>

            {/* Privacy & Sovereignty */}
            <section className="md:col-span-7 bg-surface-low rounded-3xl p-8 border border-outline-variant/10">
              <div className="flex items-center gap-3 mb-8">
                <ShieldCheck size={24} className="text-[#79ff5b]" />
                <h3 className="font-headline text-xl font-bold uppercase tracking-tight">Privacy & Sovereignty</h3>
              </div>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-surface-high rounded-2xl">
                  <div>
                    <p className="font-bold text-[#e5e2e1]">Public Profile</p>
                    <p className="text-xs text-outline">Allow others to see your level and achievements.</p>
                  </div>
                  <button className="w-12 h-6 bg-primary-container rounded-full relative transition-all">
                    <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></span>
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-surface-high rounded-2xl">
                  <div>
                    <p className="font-bold text-[#e5e2e1]">Telemetry Sharing</p>
                    <p className="text-xs text-outline">Anonymous data used to improve Logling units.</p>
                  </div>
                  <button className="w-12 h-6 bg-surface-highest rounded-full relative transition-all">
                    <span className="absolute left-1 top-1 w-4 h-4 bg-outline rounded-full"></span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-8">
                  <button className="py-3 px-4 bg-surface-highest/30 border border-outline-variant/20 text-[#e5e2e1] rounded-xl hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 transition-all font-bold text-sm flex items-center justify-center gap-2">
                    <Trash2 size={18} />
                    Delete Account
                  </button>
                  <button className="py-3 px-4 bg-surface-highest text-[#e5e2e1] rounded-xl hover:bg-surface-bright transition-all font-bold text-sm flex items-center justify-center gap-2">
                    <History size={18} />
                    Audit Logs
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
