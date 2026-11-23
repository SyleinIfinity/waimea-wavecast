import { useEffect, useState } from 'react';
import { getClusteringSummary } from '../../api/client';
import type { ClusteringSummary } from '../../api/types';
import { hstToday } from '../data-quality/quality';

export function useClusteringSummary(refreshKey = 0) {
  const [summary, setSummary] = useState<ClusteringSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getClusteringSummary(hstToday(), controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setSummary(result);
      setError(null);
    }).catch((reason: unknown) => {
      if (controller.signal.aborted) return;
      setError(reason instanceof Error ? reason.message : String(reason));
    });
    return () => controller.abort();
  }, [refreshKey]);

  return { summary, error };
}
