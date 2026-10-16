'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '@/lib/api-client';

/**
 * Loads a `handleApiRoute` GET endpoint and reloads whenever `url` changes; responses for an
 * outdated `url` are ignored. Pass `null` to skip loading (e.g. while filters are invalid).
 */
export function useApiData<T>(url: string | null, emptyData: T) {
  const [data, setData] = useState<T>(emptyData);
  const [isLoading, setIsLoading] = useState(Boolean(url));
  const [error, setError] = useState<string | null>(null);
  const emptyDataRef = useRef(emptyData);
  const latestRequest = useRef(0);

  const reload = useCallback(async () => {
    const requestId = ++latestRequest.current;
    if (!url) {
      setData(emptyDataRef.current);
      setError(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiRequest<T>(url);
      if (requestId === latestRequest.current) setData(result);
    } catch (err) {
      if (requestId !== latestRequest.current) return;
      setError((err as Error).message);
      setData(emptyDataRef.current);
    } finally {
      if (requestId === latestRequest.current) setIsLoading(false);
    }
  }, [url]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, isLoading, error, reload };
}
