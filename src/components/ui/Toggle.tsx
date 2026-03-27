'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  id: string;
}

export function Toggle({ enabled, onChange, id }: ToggleProps) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={cn(
        'relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0',
        enabled ? 'bg-primary-container shadow-[0_0_12px_rgba(0,112,243,0.4)]' : 'bg-surface-highest'
      )}
    >
      <span
        className={cn(
          'absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300',
          enabled ? 'left-6' : 'left-1'
        )}
      />
    </button>
  );
}
