'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { isApiError } from '@/lib/api';
import { useSessionOptional } from './session';

export interface Remote<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  reload: () => void;
}

/**
 * Fetch-on-mount with loading/error state, cancellation and manual reload. A 401 that survives the
 * client's automatic refresh means the session is over: tell the session so the shell redirects.
 */
export function useRemote<T>(fetcher: () => Promise<T>, deps: unknown[]): Remote<T> {
  const session = useSessionOptional();
  const [state, setState] = useState<{ data?: T; error?: unknown; loading: boolean }>({
    loading: true,
  });
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: undefined }));
    fetcherRef
      .current()
      .then((data) => !cancelled && setState({ data, loading: false }))
      .catch((error) => {
        if (cancelled) return;
        if (isApiError(error) && error.isUnauthorized) session?.expire();
        setState((s) => ({ data: s.data, error, loading: false }));
      });
    return () => {
      cancelled = true;
    };
    // deps are supplied by the caller (react-hooks lint is not enabled in this repo)
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data: state.data, error: state.error, loading: state.loading, reload };
}
