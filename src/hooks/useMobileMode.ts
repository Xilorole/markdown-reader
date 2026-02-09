import { useEffect, useState } from 'react';

const MOBILE_QUERY = '(max-width: 768px)';

export function useMobileMode(): boolean {
    const [mobile, setMobile] = useState(() =>
        typeof window !== 'undefined' ? window.matchMedia(MOBILE_QUERY).matches : false,
    );

    useEffect(() => {
        const mql = window.matchMedia(MOBILE_QUERY);
        const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, []);

    return mobile;
}
