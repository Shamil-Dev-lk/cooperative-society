import { useEffect, useRef } from 'react';

const CHECK_INTERVAL_MS = 2 * 60 * 1000; // every 2 minutes
const VERSION_URL = `${import.meta.env.BASE_URL}version.json`;

export function useAutoUpdate() {
  const currentVersion = useRef<string | null>(null);

  useEffect(() => {
    // Fetch the version once on mount to set the baseline
    const fetchVersion = async (): Promise<string | null> => {
      try {
        const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return null;
        const data = await res.json();
        return data.version ?? null;
      } catch {
        return null;
      }
    };

    const init = async () => {
      currentVersion.current = await fetchVersion();
    };

    init();

    const interval = setInterval(async () => {
      const latest = await fetchVersion();
      if (latest && currentVersion.current && latest !== currentVersion.current) {
        // New deployment detected — reload automatically
        window.location.reload();
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);
}
