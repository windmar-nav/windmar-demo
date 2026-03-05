import { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient, WeatherReadiness, WeatherFieldStatus, AreaReadiness, ADRSAreaInfo } from '@/lib/api';

const POLL_INTERVAL_MS = 3000;

interface UseWeatherReadinessResult {
  globalFields: Record<string, WeatherFieldStatus>;
  areas: Record<string, AreaReadiness>;
  allReady: boolean;
  prefetchRunning: boolean;
  resyncActive: string | null;
  resyncProgress: Record<string, string>;
  selectedAreas: string[];
  availableAreas: ADRSAreaInfo[];
  isChecking: boolean;
  restartPolling: () => void;
}

export function useWeatherReadiness(): UseWeatherReadinessResult {
  const [globalFields, setGlobalFields] = useState<Record<string, WeatherFieldStatus>>({});
  const [areas, setAreas] = useState<Record<string, AreaReadiness>>({});
  const [allReady, setAllReady] = useState(false);
  const [prefetchRunning, setPrefetchRunning] = useState(true);
  const [resyncActive, setResyncActive] = useState<string | null>(null);
  const [resyncProgress, setResyncProgress] = useState<Record<string, string>>({});
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [availableAreas, setAvailableAreas] = useState<ADRSAreaInfo[]>([]);
  const [isChecking, setIsChecking] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppedRef = useRef(false);

  const poll = useCallback(async () => {
    try {
      const data: WeatherReadiness = await apiClient.getWeatherReadiness();
      setGlobalFields(data.global_fields);
      setAreas(data.areas);
      setAllReady(data.all_ready);
      setPrefetchRunning(data.prefetch_running);
      setResyncActive(data.resync_active);
      setResyncProgress(data.resync_progress ?? {});
      setSelectedAreas(data.selected_areas);
      setAvailableAreas(data.available_areas);
      setIsChecking(false);

      // Stop polling once prefetch is done and no resync active
      if (!data.prefetch_running && !data.resync_active) {
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

  const restartPolling = useCallback(() => {
    stoppedRef.current = false;
    // Immediate poll
    poll();
    // Start interval if not already running
    if (!timerRef.current) {
      timerRef.current = setInterval(() => {
        if (!stoppedRef.current) poll();
      }, POLL_INTERVAL_MS);
    }
  }, [poll]);

  useEffect(() => {
    poll();
    timerRef.current = setInterval(() => {
      if (!stoppedRef.current) poll();
    }, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [poll]);

  return { globalFields, areas, allReady, prefetchRunning, resyncActive, resyncProgress, selectedAreas, availableAreas, isChecking, restartPolling };
}
