'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api-client';
import type { PPEItemWithUsage } from '@/types/database';

export function usePPEItems() {
  const [items, setItems] = useState<PPEItemWithUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setItems(await apiRequest<PPEItemWithUsage[]>('/api/ppe/items'));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { items, isLoading, error, reload };
}
