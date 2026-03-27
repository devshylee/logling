'use client';

import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToastProps {
  message: string;
  ok: boolean;
}

export function Toast({ message, ok }: ToastProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      className={cn(
        'fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl border text-sm font-semibold shadow-2xl backdrop-blur-xl',
        ok
          ? 'bg-[#0e4429]/90 border-[#2ff801]/30 text-[#2ff801]'
          : 'bg-red-950/90 border-red-500/30 text-red-400'
      )}
    >
      {ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      {message}
    </motion.div>
  );
}
