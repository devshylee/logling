"use client";

import React from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { motion } from 'motion/react';
import { Github, ShieldCheck, Code2, Search, Terminal } from 'lucide-react';

export default function RepositoriesPage() {
  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar activeId="repos" />
      
      <main className="flex-1 ml-64 flex flex-col">
        <TopBar />
        
        <div className="flex-1 flex items-center justify-center p-10 bg-[#0e0e0e]">
          <div className="max-w-4xl w-full flex flex-col items-center text-center">
            {/* Mascot Visualization */}
            <div className="relative mb-12">
              <div className="absolute inset-0 bg-primary-container/10 blur-[100px] rounded-full"></div>
              <motion.div 
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10 w-64 h-64 flex items-center justify-center"
              >
                <div className="w-48 h-48 bg-tertiary/20 backdrop-blur-xl border-4 border-tertiary rounded-[3rem] shadow-[0_0_60px_rgba(205,189,255,0.2)] flex items-center justify-center">
                  <Terminal size={80} className="text-tertiary fill-current" />
                  
                  <div className="absolute -top-4 -right-4 w-12 h-12 bg-[#2ff801] rounded-full flex items-center justify-center border-4 border-[#0e0e0e] animate-pulse">
                    <Code2 size={20} className="text-black" />
                  </div>
                  <div className="absolute -bottom-2 -left-6 w-10 h-10 bg-primary-container rounded-full flex items-center justify-center border-4 border-[#0e0e0e]">
                    <Search size={18} className="text-white" />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Typography */}
            <div className="space-y-4 mb-10">
              <h1 className="font-headline text-5xl font-black tracking-tighter text-[#e5e2e1]">No repositories connected yet!</h1>
              <p className="font-body text-xl text-outline max-w-lg mx-auto">
                Let&apos;s find your first treasure (code) on GitHub. Your Logling Unit is ready to start architecting.
              </p>
            </div>

            {/* Action Cluster */}
            <div className="flex flex-col items-center gap-6">
              <button className="px-10 py-5 bg-primary-container text-white rounded-2xl font-headline text-lg font-bold uppercase tracking-tight flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-[0_20px_40px_rgba(0,112,243,0.3)] group">
                <Github className="group-hover:rotate-12 transition-transform" />
                Connect GitHub
              </button>
              
              <div className="flex items-center gap-2 px-4 py-2 bg-surface-high/50 border border-outline-variant/20 rounded-full backdrop-blur-md">
                <ShieldCheck size={14} className="text-[#79ff5b] fill-current" />
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#79ff5b]">Read-only Access Guaranteed</span>
              </div>
            </div>

            {/* Technical Metadata */}
            <div className="mt-20 flex gap-8 opacity-20 pointer-events-none select-none">
              <div className="font-mono text-[10px] text-outline flex flex-col items-start gap-1">
                <span className="text-tertiary">{"// ARCHITECTURE_STATUS"}</span>
                <span>PENDING_INITIAL_COMMIT</span>
              </div>
              <div className="font-mono text-[10px] text-outline flex flex-col items-start gap-1 border-l border-outline-variant/30 pl-8">
                <span className="text-[#79ff5b]">{"// DATA_INTEGRITY"}</span>
                <span>OAUTH_SCOPES:REPO_READ_ONLY</span>
              </div>
              <div className="font-mono text-[10px] text-outline flex flex-col items-start gap-1 border-l border-outline-variant/30 pl-8">
                <span className="text-primary-container">{"// UNIT_STATE"}</span>
                <span>READY_FOR_DEPLOYMENT</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
