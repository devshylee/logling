'use client';

import React, { useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Github, ShieldCheck, Zap, Code2, BarChart3 } from 'lucide-react';

const FEATURES = [
  { icon: Code2, title: 'Git Diff Analysis', desc: 'Every commit analyzed by Gemini AI for impact and tech stack.' },
  { icon: BarChart3, title: 'XP & Leveling', desc: 'Earn experience points and level up your skill tree with each push.' },
  { icon: Zap, title: 'Blog Auto-Draft', desc: 'Turn your commits into polished technical blog posts automatically.' },
];

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/');
    }
  }, [status, router]);

  return (
    <div className="min-h-screen bg-[#0e0e0e] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary-container/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-tertiary/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-16 flex flex-col items-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-primary-container flex items-center justify-center shadow-[0_0_40px_rgba(0,112,243,0.4)] mb-4">
          <Code2 size={32} className="text-white" />
        </div>
        <h1 className="font-headline text-5xl font-black tracking-tighter text-[#e5e2e1] uppercase">Logling</h1>
        <p className="font-mono text-sm text-outline tracking-widest uppercase mt-2">Tactical Developer RPG</p>
      </motion.div>

      {/* Hero CTA card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-md bg-surface-low border border-outline-variant/20 rounded-3xl p-10 text-center shadow-2xl backdrop-blur-sm"
      >
        <h2 className="font-headline text-2xl font-bold text-[#e5e2e1] mb-2">
          Level Up Your Dev Career
        </h2>
        <p className="text-outline mb-8 leading-relaxed">
          Connect your GitHub account and let AI analyze your commits, grow your skill tree, and auto-generate technical blog drafts.
        </p>

        <button
          onClick={() => signIn('github')}
          disabled={status === 'loading'}
          className="w-full py-4 bg-[#e5e2e1] text-[#131313] rounded-xl font-headline font-bold text-lg uppercase tracking-tight flex items-center justify-center gap-3 hover:bg-white hover:shadow-[0_0_30px_rgba(229,226,225,0.2)] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          id="github-sign-in-btn"
        >
          <Github size={22} />
          {status === 'loading' ? 'Connecting...' : 'Continue with GitHub'}
        </button>

        <div className="flex items-center justify-center gap-2 mt-4">
          <ShieldCheck size={14} className="text-[#79ff5b]" />
          <p className="text-[11px] text-outline font-mono">Read-only access • AES-256 encrypted • No code stored</p>
        </div>
      </motion.div>

      {/* Feature grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10 w-full max-w-2xl"
      >
        {FEATURES.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="bg-surface-low/60 border border-outline-variant/10 rounded-2xl p-5 text-left"
          >
            <f.icon size={20} className="text-primary-container mb-3" />
            <h3 className="font-headline font-bold text-sm text-[#e5e2e1] mb-1">{f.title}</h3>
            <p className="text-[11px] text-outline leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
