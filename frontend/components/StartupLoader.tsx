'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Globe,
  Wind,
  Waves,
  Navigation,
  Snowflake,
  Thermometer,
  Eye,
  CheckCircle2,
  Loader2,
  Minus,
  Download,
  ChevronRight,
  XCircle,
} from 'lucide-react';
import { WeatherFieldStatus } from '@/lib/api';

const FIELD_META: Record<string, { label: string; icon: React.ReactNode }> = {
  wind:       { label: 'Wind',       icon: <Wind className="w-4 h-4" /> },
  waves:      { label: 'Waves',      icon: <Waves className="w-4 h-4" /> },
  currents:   { label: 'Currents',   icon: <Navigation className="w-4 h-4" /> },
  sst:        { label: 'SST',        icon: <Thermometer className="w-4 h-4" /> },
  ice:        { label: 'Sea Ice',    icon: <Snowflake className="w-4 h-4" /> },
  visibility: { label: 'Visibility', icon: <Eye className="w-4 h-4" /> },
};

const FIELD_ORDER = ['wind', 'waves', 'currents', 'sst', 'ice', 'visibility'];

interface StartupLoaderProps {
  fields: Record<string, WeatherFieldStatus>;
  allReady: boolean;
  prefetchRunning: boolean;
  resyncActive: string | null;
  resyncProgress: Record<string, string>;
  isChecking: boolean;
  onResyncAll: () => void;
  onMissingFields?: (count: number) => void;
  onDismiss?: () => void;
}

function FieldStatusIcon({ status, prefetchDone, isChecking, downloadStatus }: {
  status?: string;
  prefetchDone: boolean;
  isChecking: boolean;
  downloadStatus?: string | null;
}) {
  if (isChecking) return <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />;
  if (downloadStatus === 'downloading') return <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />;
  if (downloadStatus === 'done') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
  if (downloadStatus === 'failed') return <XCircle className="w-3.5 h-3.5 text-red-400" />;
  if (status === 'ready') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
  if (status === 'not_applicable') return <Minus className="w-3.5 h-3.5 text-gray-600" />;
  if (prefetchDone) return <Minus className="w-3.5 h-3.5 text-amber-500" />;
  return <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />;
}

export default function StartupLoader({
  fields,
  allReady,
  prefetchRunning,
  resyncActive,
  resyncProgress,
  isChecking,
  onResyncAll,
  onMissingFields,
  onDismiss,
}: StartupLoaderProps) {
  const [dismissed, setDismissed] = useState(false);

  const dismiss = useCallback(() => {
    setDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  // Auto-dismiss when all fields are ready
  useEffect(() => {
    if (allReady && !isChecking) {
      const t = setTimeout(dismiss, 500);
      return () => clearTimeout(t);
    }
  }, [allReady, isChecking, dismiss]);

  const handleContinue = useCallback(() => {
    dismiss();
    if (onMissingFields && !allReady) {
      const missing = Object.values(fields).filter(f => f.status === 'missing').length;
      if (missing > 0) onMissingFields(missing);
    }
  }, [onMissingFields, allReady, fields, dismiss]);

  if (dismissed) return null;

  const prefetchDone = !prefetchRunning && !isChecking;
  const isResyncing = !!resyncActive;
  const hasAnyMissing = Object.values(fields).some(f => f.status === 'missing');

  const progressEntries = Object.entries(resyncProgress);
  const progressDone = progressEntries.filter(([, s]) => s === 'done').length;
  const progressFailed = progressEntries.filter(([, s]) => s === 'failed').length;
  const progressTotal = progressEntries.length;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-all"
      style={{ pointerEvents: 'all' }}
    >
      <div className="bg-maritime-dark/95 border border-white/10 rounded-2xl shadow-2xl p-6 w-[420px]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <Globe className="w-7 h-7 text-blue-400" />
          <div>
            <h2 className="text-white text-lg font-semibold">Loading Weather Data</h2>
            <p className="text-gray-400 text-xs">NE Atlantic, Europe &amp; Mediterranean</p>
          </div>
        </div>

        {/* Field rows */}
        <div className="space-y-2 mb-5">
          {FIELD_ORDER.map(name => {
            const meta = FIELD_META[name];
            if (!meta) return null;
            const field = fields[name];
            const dlStatus = isResyncing ? (resyncProgress[name] ?? null) : null;
            return (
              <div key={name} className="flex items-center gap-3 px-2 py-1.5 rounded-lg bg-white/[0.03]">
                <div className="text-gray-400">{meta.icon}</div>
                <FieldStatusIcon
                  status={field?.status}
                  prefetchDone={prefetchDone}
                  isChecking={isChecking}
                  downloadStatus={dlStatus}
                />
                <span className="text-sm text-gray-300 flex-1">{meta.label}</span>
                {!isChecking && field && !dlStatus && (
                  <span className="text-xs text-gray-600 tabular-nums">{field.frames}/{field.expected}</span>
                )}
                {dlStatus === 'downloading' && (
                  <span className="text-xs text-blue-400/70">syncing</span>
                )}
                {dlStatus === 'done' && field && (
                  <span className="text-xs text-gray-600 tabular-nums">{field.frames}/{field.expected}</span>
                )}
                {dlStatus === 'failed' && (
                  <span className="text-xs text-red-400/70">failed</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2">
          {hasAnyMissing && !isResyncing && (
            <button
              onClick={onResyncAll}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600/30 text-blue-400 hover:bg-blue-600/50 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download All
            </button>
          )}
          <button
            onClick={handleContinue}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1"
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Resync in progress indicator */}
        {isResyncing && (
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-blue-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Downloading weather data...</span>
              </div>
              {progressTotal > 0 && (
                <span className="text-xs text-gray-500 tabular-nums">
                  {progressDone}{progressFailed > 0 ? `+${progressFailed} err` : ''}/{progressTotal} fields
                </span>
              )}
            </div>
            {progressTotal > 0 && (
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${((progressDone + progressFailed) / progressTotal) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
