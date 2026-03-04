import { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient, WeatherReadiness, WeatherFieldStatus } from '@/lib/api';

const POLL_INTERVAL_MS = 3000;

interface UseWeatherReadinessResult {
  fields: Record<string, WeatherFieldStatus>;
  allReady: boolean;
  prefetchRunning: boolean;
  isChecking: boolean;
}

export function useWeatherReadiness(): UseWeatherReadinessResult {
  const [fields, setFields] = useState<Record<string, WeatherFieldStatus>>({});
  const [allReady, setAllReady] = useState(false);
  const [prefetchRunning, setPrefetchRunning] = useState(true);
  const [isChecking, setIsChecking] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppedRef = useRef(false);

  const poll = useCallback(async () => {
    try {
      const data: WeatherReadiness = await apiClient.getWeatherReadiness();
      setFields(data.fields);
      setAllReady(data.all_ready);
      setPrefetchRunning(data.prefetch_running);
      setIsChecking(false);

      // Stop polling once prefetch is done (regardless of readiness)
      if (!data.prefetch_running) {
        stoppedRef.current = true;
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    } catch {
      // Backend not yet reachable — keep polling
    }
  }, []);

  useEffect(() => {
    poll();
    timerRef.current = setInterval(() => {
      if (!stoppedRef.current) poll();
    }, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [poll]);

  return { fields, allReady, prefetchRunning, isChecking };
}
