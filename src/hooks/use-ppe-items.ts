'use client';

import { useApiData } from '@/hooks/use-api-data';
import type { PPEItemWithUsage } from '@/types/database';

export function usePPEItems() {
  const { data: items, isLoading, error, reload } = useApiData<PPEItemWithUsage[]>('/api/ppe/items', []);
  return { items, isLoading, error, reload };
}
