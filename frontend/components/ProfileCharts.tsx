'use client';

import { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import {
  VoyageResponse, OptimizedRouteKey, OptimizationResponse,
  LegResult, OptimizationLeg, ROUTE_STYLES,
} from '@/lib/api';

/* ── Types ── */

interface ProfileChartsProps {
  baseline: VoyageResponse;
  optimizations: Partial<Record<OptimizedRouteKey, OptimizationResponse>>;
  departureTime: string;
}

/** A breakpoint along a route at a specific timestamp */
interface TimePoint {
  timeMs: number; // epoch ms
  sog: number;
  fuel: number;   // cumulative MT
}

/* ── Time-based interpolation ── */

function buildTimeProfile(
  departureMs: number,
  legs: (LegResult | OptimizationLeg)[],
): TimePoint[] {
  if (legs.length === 0) return [];

  const points: TimePoint[] = [{ timeMs: departureMs, sog: legs[0].sog_kts, fuel: 0 }];
  let cumTimeMs = 0;
  let cumFuel = 0;

  for (const leg of legs) {
    cumTimeMs += leg.time_hours * 3_600_000;
    cumFuel += leg.fuel_mt;
    points.push({
      timeMs: departureMs + cumTimeMs,
      sog: leg.sog_kts,
      fuel: cumFuel,
    });
  }

  return points;
}

function interpolateAtTime(
  points: TimePoint[],
  targetMs: number,
  field: 'sog' | 'fuel',
): number | undefined {
  if (points.length === 0) return undefined;
  // Before departure or after arrival → undefined (line stops)
  if (targetMs < points[0].timeMs) return undefined;
  if (targetMs > points[points.length - 1].timeMs) return undefined;

  for (let i = 1; i < points.length; i++) {
    if (targetMs <= points[i].timeMs) {
      const prev = points[i - 1];
      const curr = points[i];
      const span = curr.timeMs - prev.timeMs;
      if (span <= 0) return curr[field];
      const t = (targetMs - prev.timeMs) / span;
      return prev[field] + t * (curr[field] - prev[field]);
    }
  }
  return points[points.length - 1][field];
}

/** Build unified time-grid chart data. Each route gets undefined past its ETA. */
function buildTimeChartData(
  departureMs: number,
  maxEtaMs: number,
  baselineProfile: TimePoint[],
  optProfiles: Map<OptimizedRouteKey, TimePoint[]>,
  visibleRoutes: Set<string>,
  field: 'sog' | 'fuel',
): Record<string, number | undefined>[] {
  const totalMs = maxEtaMs - departureMs;
  if (totalMs <= 0) return [];

  // ~120 sample points, at least every hour
  const step = Math.max(totalMs / 120, 1_800_000); // min 30 min
  const data: Record<string, number | undefined>[] = [];

  for (let ms = departureMs; ms <= maxEtaMs; ms += step) {
    const row: Record<string, number | undefined> = { time: ms };

    if (visibleRoutes.has('baseline')) {
      const v = interpolateAtTime(baselineProfile, ms, field);
      row.baseline = v !== undefined ? Number(v.toFixed(2)) : undefined;
    }

    for (const [key, profile] of optProfiles) {
      if (visibleRoutes.has(key)) {
        const v = interpolateAtTime(profile, ms, field);
        row[key] = v !== undefined ? Number(v.toFixed(2)) : undefined;
      }
    }

    data.push(row);
  }

  // Ensure exact endpoint for each route (crisp line ending)
  const allProfiles: [string, TimePoint[]][] = [['baseline', baselineProfile]];
  for (const [k, p] of optProfiles) allProfiles.push([k, p]);

  for (const [key, profile] of allProfiles) {
    if (!visibleRoutes.has(key) || profile.length === 0) continue;
    const endMs = profile[profile.length - 1].timeMs;
    // Only inject if not already at a sample point
    if (endMs > departureMs && endMs < maxEtaMs) {
      const existing = data.find(d => d.time === endMs);
      if (!existing) {
        const row: Record<string, number | undefined> = { time: endMs };
        // Fill all visible routes at this timestamp
        if (visibleRoutes.has('baseline')) {
          row.baseline = interpolateAtTime(baselineProfile, endMs, field);
          if (row.baseline !== undefined) row.baseline = Number(row.baseline.toFixed(2));
        }
        for (const [k2, p2] of optProfiles) {
          if (visibleRoutes.has(k2)) {
            const v = interpolateAtTime(p2, endMs, field);
            row[k2] = v !== undefined ? Number(v.toFixed(2)) : undefined;
          }
        }
        data.push(row);
      }
    }
  }

  // Sort by time
  data.sort((a, b) => (a.time as number) - (b.time as number));

  return data;
}

/* ── ETA computation ── */

function computeEta(departureMs: number, legs: { time_hours: number }[]): number {
  let totalHours = 0;
  for (const leg of legs) totalHours += leg.time_hours;
  return departureMs + totalHours * 3_600_000;
}

function formatDelta(baseMs: number, otherMs: number): { text: string; positive: boolean } {
  const diffMs = otherMs - baseMs;
  const absMins = Math.round(Math.abs(diffMs) / 60_000);
  const h = Math.floor(absMins / 60);
  const m = absMins % 60;
  const sign = diffMs >= 0 ? '+' : '-';
  const text = h > 0 ? `${sign}${h}h ${m}m` : `${sign}${m}m`;
  return { text, positive: diffMs <= 0 };
}

/* ── Tooltip ── */

const DARK_TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: '#1e293b',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '6px',
  fontSize: '11px',
  color: '#e2e8f0',
};

function formatTimeLabel(ms: number | string): string {
  return format(new Date(Number(ms)), 'MMM d HH:mm');
}

/* ── Component ── */

export default function ProfileCharts({ baseline, optimizations, departureTime }: ProfileChartsProps) {
  const departureMs = useMemo(() => new Date(departureTime).getTime(), [departureTime]);

  const optKeys = useMemo(
    () => Object.keys(optimizations) as OptimizedRouteKey[],
    [optimizations],
  );

  // Visibility toggles — all visible by default
  const [visible, setVisible] = useState<Set<string>>(() => {
    const s = new Set<string>(['baseline']);
    for (const k of Object.keys(optimizations)) s.add(k);
    return s;
  });

  const toggle = (key: string) => {
    setVisible(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // Build time-based profiles
  const baselineProfile = useMemo(
    () => buildTimeProfile(departureMs, baseline.legs),
    [departureMs, baseline.legs],
  );

  const optProfiles = useMemo(() => {
    const m = new Map<OptimizedRouteKey, TimePoint[]>();
    for (const key of optKeys) {
      const opt = optimizations[key];
      if (opt) m.set(key, buildTimeProfile(departureMs, opt.legs));
    }
    return m;
  }, [optimizations, optKeys, departureMs]);

  // ETAs (epoch ms)
  const baselineEtaMs = useMemo(
    () => computeEta(departureMs, baseline.legs),
    [departureMs, baseline.legs],
  );

  const optEtasMs = useMemo(() => {
    const m = new Map<OptimizedRouteKey, number>();
    for (const key of optKeys) {
      const opt = optimizations[key];
      if (opt) m.set(key, computeEta(departureMs, opt.legs));
    }
    return m;
  }, [optimizations, optKeys, departureMs]);

  // Max ETA across all routes (defines X-axis extent)
  const maxEtaMs = useMemo(() => {
    let max = baselineEtaMs;
    for (const eta of optEtasMs.values()) if (eta > max) max = eta;
    return max;
  }, [baselineEtaMs, optEtasMs]);

  // Chart data
  const sogData = useMemo(
    () => buildTimeChartData(departureMs, maxEtaMs, baselineProfile, optProfiles, visible, 'sog'),
    [departureMs, maxEtaMs, baselineProfile, optProfiles, visible],
  );

  const fuelData = useMemo(
    () => buildTimeChartData(departureMs, maxEtaMs, baselineProfile, optProfiles, visible, 'fuel'),
    [departureMs, maxEtaMs, baselineProfile, optProfiles, visible],
  );

  // Auto-scale SOG Y-axis — fixed to min/max across ALL solutions (not just visible)
  // so toggling routes doesn't shift the axis and differences are always readable.
  const sogDomain = useMemo<[number, number]>(() => {
    let min = Infinity, max = -Infinity;
    const scan = (pts: TimePoint[]) => {
      for (const p of pts) {
        if (p.sog < min) min = p.sog;
        if (p.sog > max) max = p.sog;
      }
    };
    scan(baselineProfile);
    for (const profile of optProfiles.values()) scan(profile);
    if (!isFinite(min)) return [0, 15];
    return [Math.max(0, Math.floor((min - 0.5) * 2) / 2), Math.ceil((max + 0.5) * 2) / 2];
  }, [baselineProfile, optProfiles]);

  // X-axis tick formatter — choose ~8 evenly spaced ticks
  const timeDomain = useMemo<[number, number]>(() => [departureMs, maxEtaMs], [departureMs, maxEtaMs]);

  return (
    <div className="space-y-6">
      {/* ── ETA Comparison Bar ── */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">ETA Comparison</h2>
        <div className="flex flex-wrap gap-3">
          <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#3b82f6' }} />
            <div>
              <div className="text-[10px] text-gray-500">Baseline</div>
              <div className="text-xs font-medium text-white">
                {format(new Date(baselineEtaMs), 'MMM d HH:mm')}
              </div>
            </div>
          </div>
          {optKeys.map(key => {
            const etaMs = optEtasMs.get(key);
            if (etaMs === undefined) return null;
            const style = ROUTE_STYLES[key];
            const delta = formatDelta(baselineEtaMs, etaMs);
            return (
              <div
                key={key}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2"
              >
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: style.color }} />
                <div>
                  <div className="text-[10px] text-gray-500">{style.label}</div>
                  <div className="text-xs font-medium text-white">
                    {format(new Date(etaMs), 'MMM d HH:mm')}
                    <span className={`ml-1.5 text-[10px] ${delta.positive ? 'text-green-400' : 'text-amber-400'}`}>
                      {delta.text}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Route visibility toggles ── */}
      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={visible.has('baseline')}
            onChange={() => toggle('baseline')}
            className="accent-blue-500"
          />
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#3b82f6' }} />
          Baseline
        </label>
        {optKeys.map(key => {
          const style = ROUTE_STYLES[key];
          return (
            <label key={key} className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={visible.has(key)}
                onChange={() => toggle(key)}
                className="accent-blue-500"
              />
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: style.color }} />
              {style.label}
            </label>
          );
        })}
      </div>

      {/* ── SOG Profile Chart ── */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">Speed Over Ground Profile</h2>
        <div className="h-80 bg-white/[0.03] rounded-lg border border-white/10 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sogData} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="time"
                type="number"
                domain={timeDomain}
                scale="time"
                tick={{ fontSize: 9, fill: '#94a3b8' }}
                tickFormatter={formatTimeLabel}
                stroke="rgba(255,255,255,0.1)"
                angle={-30}
                textAnchor="end"
              />
              <YAxis
                domain={sogDomain}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                label={{ value: 'SOG (kts)', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#94a3b8' } }}
                stroke="rgba(255,255,255,0.1)"
              />
              <Tooltip
                contentStyle={DARK_TOOLTIP_STYLE}
                labelFormatter={formatTimeLabel}
                formatter={(value: number, name: string) => [
                  `${value.toFixed(1)} kts`,
                  name === 'baseline' ? 'Baseline' : ROUTE_STYLES[name as OptimizedRouteKey]?.label ?? name,
                ]}
              />
              {visible.has('baseline') && (
                <Line
                  type="monotone"
                  dataKey="baseline"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                  name="baseline"
                />
              )}
              {optKeys.map(key => {
                if (!visible.has(key)) return null;
                const style = ROUTE_STYLES[key];
                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={style.color}
                    strokeWidth={1.5}
                    strokeDasharray={style.dashArray}
                    dot={false}
                    connectNulls={false}
                    name={key}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Cumulative Fuel Chart ── */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">Cumulative Fuel Consumption</h2>
        <div className="h-80 bg-white/[0.03] rounded-lg border border-white/10 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={fuelData} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="time"
                type="number"
                domain={timeDomain}
                scale="time"
                tick={{ fontSize: 9, fill: '#94a3b8' }}
                tickFormatter={formatTimeLabel}
                stroke="rgba(255,255,255,0.1)"
                angle={-30}
                textAnchor="end"
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                label={{ value: 'Fuel (MT)', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#94a3b8' } }}
                stroke="rgba(255,255,255,0.1)"
              />
              <Tooltip
                contentStyle={DARK_TOOLTIP_STYLE}
                labelFormatter={formatTimeLabel}
                formatter={(value: number, name: string) => [
                  `${value.toFixed(1)} MT`,
                  name === 'baseline' ? 'Baseline' : ROUTE_STYLES[name as OptimizedRouteKey]?.label ?? name,
                ]}
              />
              {visible.has('baseline') && (
                <Line
                  type="monotone"
                  dataKey="baseline"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                  name="baseline"
                />
              )}
              {optKeys.map(key => {
                if (!visible.has(key)) return null;
                const style = ROUTE_STYLES[key];
                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={style.color}
                    strokeWidth={1.5}
                    strokeDasharray={style.dashArray}
                    dot={false}
                    connectNulls={false}
                    name={key}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
