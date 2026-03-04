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
import { WeatherFieldStatus, AreaReadiness, ADRSAreaInfo, apiClient } from '@/lib/api';

const FIELD_META: Record<string, { label: string; icon: React.ReactNode }> = {
  wind:       { label: 'Wind',       icon: <Wind className="w-4 h-4" /> },
  waves:      { label: 'Waves',      icon: <Waves className="w-4 h-4" /> },
  currents:   { label: 'Currents',   icon: <Navigation className="w-4 h-4" /> },
  ice:        { label: 'Sea Ice',    icon: <Snowflake className="w-4 h-4" /> },
  sst:        { label: 'SST',        icon: <Thermometer className="w-4 h-4" /> },
  visibility: { label: 'Visibility', icon: <Eye className="w-4 h-4" /> },
};

interface StartupLoaderProps {
  globalFields: Record<string, WeatherFieldStatus>;
  areas: Record<string, AreaReadiness>;
  allReady: boolean;
  prefetchRunning: boolean;
  resyncActive: string | null;
  resyncProgress: Record<string, string>;
  selectedAreas: string[];
  availableAreas: ADRSAreaInfo[];
  isChecking: boolean;
  onSelectAreas: (areas: string[]) => void;
  onResyncArea: (areaId: string) => void;
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
  // During resync, overlay download progress on top of cache status
  if (downloadStatus === 'downloading') return <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />;
  if (downloadStatus === 'done') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
  if (downloadStatus === 'failed') return <XCircle className="w-3.5 h-3.5 text-red-400" />;
  if (status === 'ready') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
  if (status === 'not_applicable') return <Minus className="w-3.5 h-3.5 text-gray-600" />;
  if (prefetchDone) return <Minus className="w-3.5 h-3.5 text-amber-500" />;
  return <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />;
}

function AreaStatusBadge({ area }: { area: AreaReadiness }) {
  const statuses = Object.values(area.fields).map(f => f.status);
  const applicable = statuses.filter(s => s !== 'not_applicable');
  const ready = applicable.filter(s => s === 'ready').length;
  const total = applicable.length;

  if (area.all_ready) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">Ready</span>;
  }
  if (ready > 0) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">{ready}/{total}</span>;
  }
  return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-500">No data</span>;
}

export default function StartupLoader({
  globalFields,
  areas,
  allReady,
  prefetchRunning,
  resyncActive,
  resyncProgress,
  selectedAreas,
  availableAreas,
  isChecking,
  onSelectAreas,
  onResyncArea,
  onResyncAll,
  onMissingFields,
  onDismiss,
}: StartupLoaderProps) {
  const [dismissed, setDismissed] = useState(false);
  const [localSelected, setLocalSelected] = useState<string[]>(selectedAreas);
  const [resyncingArea, setResyncingArea] = useState<string | null>(null);

  const dismiss = useCallback(() => {
    setDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  // Sync local selection when prop changes
  useEffect(() => {
    setLocalSelected(selectedAreas);
  }, [selectedAreas]);

  const handleToggleArea = useCallback((areaId: string) => {
    setLocalSelected(prev => {
      if (prev.includes(areaId)) {
        if (prev.length <= 1) return prev;
        return prev.filter(a => a !== areaId);
      }
      return [...prev, areaId];
    });
  }, []);

  const handleContinue = useCallback(() => {
    if (JSON.stringify(localSelected.sort()) !== JSON.stringify(selectedAreas.sort())) {
      onSelectAreas(localSelected);
    }
    dismiss();
    if (onMissingFields && !allReady) {
      let missing = 0;
      for (const f of Object.values(globalFields)) {
        if (f.status === 'missing') missing++;
      }
      for (const area of Object.values(areas)) {
        for (const f of Object.values(area.fields)) {
          if (f.status === 'missing') missing++;
        }
      }
      if (missing > 0) onMissingFields(missing);
    }
  }, [localSelected, selectedAreas, onSelectAreas, onMissingFields, allReady, globalFields, areas, dismiss]);

  const handleResync = useCallback(async (areaId: string) => {
    if (JSON.stringify(localSelected.sort()) !== JSON.stringify(selectedAreas.sort())) {
      onSelectAreas(localSelected);
    }
    setResyncingArea(areaId);
    onResyncArea(areaId);
  }, [localSelected, selectedAreas, onSelectAreas, onResyncArea]);

  // Clear resyncing state when resync finishes
  useEffect(() => {
    if (!resyncActive && resyncingArea) {
      setResyncingArea(null);
    }
  }, [resyncActive, resyncingArea]);

  if (dismissed) return null;

  const prefetchDone = !prefetchRunning && !isChecking;
  const globalFieldOrder = ['wind', 'visibility'];
  const areaFieldOrder = ['waves', 'currents', 'sst', 'ice'];
  const isResyncing = !!resyncActive;

  // Determine if any data is missing (global fields or area fields)
  const globalFieldsMissing = Object.values(globalFields).some(f => f.status === 'missing');
  const selectedWithMissingData = localSelected.filter(areaId => {
    const area = areas[areaId];
    return area && !area.all_ready;
  });
  const hasAnyMissing = globalFieldsMissing || selectedWithMissingData.length > 0;

  // Compute progress summary from resyncProgress
  const progressEntries = Object.entries(resyncProgress);
  const progressDone = progressEntries.filter(([, s]) => s === 'done').length;
  const progressFailed = progressEntries.filter(([, s]) => s === 'failed').length;
  const progressTotal = progressEntries.length;

  // Helper: get download status for a field from resync progress
  const getDownloadStatus = (progressKey: string): string | null => {
    if (!isResyncing) return null;
    return resyncProgress[progressKey] ?? null;
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-all"
      style={{ pointerEvents: 'all' }}
    >
      <div className="bg-maritime-dark/95 border border-white/10 rounded-2xl shadow-2xl p-6 w-[520px] max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <Globe className="w-7 h-7 text-blue-400" />
          <div>
            <h2 className="text-white text-lg font-semibold">Select Sailing Area</h2>
            <p className="text-gray-400 text-xs">ADRS Volume 6 coverage areas</p>
          </div>
        </div>

        {/* Global fields status */}
        <div className="mb-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Global Fields</div>
          <div className="flex gap-4">
            {globalFieldOrder.map(name => {
              const meta = FIELD_META[name];
              if (!meta) return null;
              const field = globalFields[name];
              const dlStatus = getDownloadStatus(`${name}:global`);
              return (
                <div key={name} className="flex items-center gap-2">
                  <FieldStatusIcon
                    status={field?.status}
                    prefetchDone={prefetchDone}
                    isChecking={isChecking}
                    downloadStatus={dlStatus}
                  />
                  <span className="text-xs text-gray-400">{meta.label}</span>
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
        </div>

        {/* Area cards */}
        <div className="space-y-2 mb-5">
          {availableAreas.map(areaInfo => {
            const isSelected = localSelected.includes(areaInfo.id);
            const areaData = areas[areaInfo.id];
            const isDisabled = areaInfo.disabled;
            const isThisResyncing = resyncingArea === areaInfo.id || resyncActive === `area:${areaInfo.id}`;

            return (
              <div
                key={areaInfo.id}
                className={`rounded-lg border p-3 transition-colors cursor-pointer ${
                  isDisabled
                    ? 'border-white/5 bg-white/[0.02] opacity-50 cursor-not-allowed'
                    : isSelected
                    ? 'border-blue-500/40 bg-blue-500/10'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                }`}
                onClick={() => !isDisabled && handleToggleArea(areaInfo.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Checkbox */}
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      isDisabled ? 'border-gray-700' :
                      isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-600'
                    }`}>
                      {isSelected && !isDisabled && (
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      )}
                    </div>

                    <div>
                      <div className="text-sm text-white font-medium">
                        {areaInfo.label}
                        {isDisabled && <span className="text-gray-500 ml-2 text-xs">Coming soon</span>}
                      </div>
                      <div className="text-xs text-gray-500">{areaInfo.description}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status badge */}
                    {areaData && !isDisabled && <AreaStatusBadge area={areaData} />}

                    {/* Resync button for this area */}
                    {isSelected && areaData && !areaData.all_ready && !isDisabled && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleResync(areaInfo.id); }}
                        disabled={isResyncing}
                        className={`text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors ${
                          isResyncing
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600/30 text-blue-400 hover:bg-blue-600/50'
                        }`}
                        title={`Download weather data for ${areaInfo.label}`}
                      >
                        {isThisResyncing ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Download className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Per-field details (expanded when selected and has data) */}
                {isSelected && areaData && !isDisabled && (
                  <div className="mt-2 ml-7 grid grid-cols-2 gap-x-4 gap-y-1">
                    {areaFieldOrder.map(name => {
                      const meta = FIELD_META[name];
                      if (!meta) return null;
                      const field = areaData.fields[name];
                      if (!field) return null;
                      const dlStatus = getDownloadStatus(`${name}:${areaInfo.id}`);
                      return (
                        <div key={name} className="flex items-center gap-1.5">
                          <FieldStatusIcon
                            status={field.status}
                            prefetchDone={prefetchDone}
                            isChecking={isChecking}
                            downloadStatus={dlStatus}
                          />
                          <span className="text-xs text-gray-400">{meta.label}</span>
                          {field.status === 'not_applicable' && !dlStatus && (
                            <span className="text-xs text-gray-600">n/a</span>
                          )}
                          {field.status !== 'not_applicable' && !isChecking && !dlStatus && (
                            <span className="text-xs text-gray-600 tabular-nums">{field.frames}/{field.expected}</span>
                          )}
                          {dlStatus === 'downloading' && (
                            <span className="text-xs text-blue-400/70">syncing</span>
                          )}
                          {dlStatus === 'done' && (
                            <span className="text-xs text-gray-600 tabular-nums">{field.frames}/{field.expected}</span>
                          )}
                          {dlStatus === 'failed' && (
                            <span className="text-xs text-red-400/70">failed</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {localSelected.length} area{localSelected.length !== 1 ? 's' : ''} selected
          </div>
          <div className="flex gap-2">
            {hasAnyMissing && !isResyncing && (
              <button
                onClick={() => {
                  if (JSON.stringify(localSelected.sort()) !== JSON.stringify(selectedAreas.sort())) {
                    onSelectAreas(localSelected);
                  }
                  onResyncAll();
                }}
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
        </div>

        {/* Resync in progress indicator with field progress */}
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
            {/* Progress bar */}
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
