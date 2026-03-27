'use client';

import { useState, useEffect, useCallback } from 'react';

export type QuotaInfo = {
  plan: string;
  limit: number;
  used: number;
  remaining: number;
  resetAt: string;
};

/**
 * useGenerationQuota
 * Fetches and exposes the current user's daily blog generation quota from /api/generate/usage.
 * Call `refresh()` after a successful generation to re-fetch latest counts.
 */
export function useGenerationQuota() {
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/generate/usage');
      if (res.ok) {
        const data: QuotaInfo = await res.json();
        setQuota(data);
      }
    } catch {
      // Silently fail — quota display is non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { quota, loading, refresh };
}
