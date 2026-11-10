import { useCallback, useEffect, useRef, useState } from "react";

interface Polled<T> {
  data: T | null;
  error: string | null;
  refresh: () => Promise<void>;
}

/** Calls `load` now and every `everyMs`, keeping the last good value. */
export function usePolling<T>(
  load: () => Promise<T>,
  everyMs: number,
): Polled<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadRef = useRef(load);
  loadRef.current = load;

  const refresh = useCallback(async () => {
    try {
      setData(await loadRef.current());
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), everyMs);
    return () => window.clearInterval(id);
  }, [refresh, everyMs]);

  return { data, error, refresh };
}
