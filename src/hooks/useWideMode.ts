import { useState, useEffect } from 'react';

const WIDE_QUERY = '(min-width: 72rem)';

export function useWideMode(): boolean {
  const [wide, setWide] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(WIDE_QUERY).matches : false,
  );

  useEffect(() => {
    const mql = window.matchMedia(WIDE_QUERY);
    const handler = (e: MediaQueryListEvent) => setWide(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return wide;
}
