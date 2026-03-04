'use client';

import { useEffect, useState } from 'react';
import {
  Ship,
  Wind,
  Waves,
  Navigation,
  Snowflake,
  Thermometer,
  Eye,
  CheckCircle2,
  Loader2,
  Minus,
} from 'lucide-react';
import { WeatherFieldStatus } from '@/lib/api';

const FIELD_META: Record<string, { label: string; icon: React.ReactNode }> = {
  wind:       { label: 'Wind',       icon: <Wind className="w-4 h-4" /> },
  waves:      { label: 'Waves',      icon: <Waves className="w-4 h-4" /> },
  currents:   { label: 'Currents',   icon: <Navigation className="w-4 h-4" /> },
  ice:        { label: 'Sea Ice',    icon: <Snowflake className="w-4 h-4" /> },
  sst:        { label: 'SST',        icon: <Thermometer className="w-4 h-4" /> },
  visibility: { label: 'Visibility', icon: <Eye className="w-4 h-4" /> },
};

interface StartupLoaderProps {
  fields: Record<string, WeatherFieldStatus>;
  allReady: boolean;
  prefetchRunning: boolean;
  isChecking: boolean;
  onMissingFields?: (count: number) => void;
}

export default function StartupLoader({
  fields,
  allReady,
  prefetchRunning,
  isChecking,
  onMissingFields,
}: StartupLoaderProps) {
  const [dismissed, setDismissed] = useState(false);

  // Auto-dismiss when prefetch is done or all ready
  useEffect(() => {
    if (isChecking) return;
    if (allReady || !prefetchRunning) {
      const timer = setTimeout(() => {
        setDismissed(true);
        // Notify parent about missing fields
        if (onMissingFields && !allReady) {
          const missing = Object.values(fields).filter(f => f.status === 'missing').length;
          if (missing > 0) onMissingFields(missing);
        }
      }, allReady ? 800 : 1500);
      return () => clearTimeout(timer);
    }
  }, [isChecking, allReady, prefetchRunning, fields, onMissingFields]);

  if (dismissed) return null;

  const fieldOrder = ['wind', 'waves', 'currents', 'ice', 'sst', 'visibility'];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-all"
      style={{ pointerEvents: 'all' }}
    >
      <div className="bg-maritime-dark/95 border border-white/10 rounded-2xl shadow-2xl p-8 w-[380px]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Ship className="w-8 h-8 text-blue-400" />
          <div>
            <h2 className="text-white text-lg font-semibold">Loading Weather Data</h2>
            <p className="text-gray-400 text-xs">Checking cache status...</p>
          </div>
        </div>

        {/* Field rows */}
        <div className="space-y-3">
          {fieldOrder.map((name) => {
            const meta = FIELD_META[name];
            if (!meta) return null;
            const field = fields[name];
            const status = field?.status;
            const prefetchDone = !prefetchRunning && !isChecking;

            return (
              <div key={name} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-gray-300">
                  <span className="text-gray-500">{meta.icon}</span>
                  <span className="text-sm">{meta.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {isChecking ? (
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  ) : status === 'ready' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : prefetchDone ? (
                    <Minus className="w-4 h-4 text-gray-500" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  )}
                  {!isChecking && field && (
                    <span className="text-xs text-gray-500 tabular-nums w-16 text-right">
                      {field.frames}/{field.expected}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer hint */}
        {!isChecking && !allReady && !prefetchRunning && (
          <p className="text-gray-500 text-xs mt-5 text-center">
            Use Resync to download missing layers
          </p>
        )}
      </div>
    </div>
  );
}
