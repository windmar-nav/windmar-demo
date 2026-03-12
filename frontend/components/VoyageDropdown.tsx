'use client';

import { Wind, Upload, Trash2, MapPin, Maximize2 } from 'lucide-react';
import { useVoyage } from '@/components/VoyageContext';
import RouteImport from '@/components/RouteImport';
import type { Position } from '@/lib/api';

const SAMPLE_ROUTE: { name: string; waypoints: Position[] } = {
  name: 'Rotterdam to Augusta',
  waypoints: [
    { lat: 51.9225, lon: 4.4792, name: 'Rotterdam' },
    { lat: 51.0500, lon: 1.5000, name: 'Dover Strait' },
    { lat: 48.4500, lon: -5.1000, name: 'Ushant' },
    { lat: 42.8800, lon: -9.8900, name: 'Finisterre' },
    { lat: 37.0000, lon: -9.1000, name: 'Cape St Vincent' },
    { lat: 36.1408, lon: -5.3536, name: 'Gibraltar' },
    { lat: 38.0000, lon: 8.8000, name: 'Sardinia South' },
    { lat: 37.2333, lon: 15.2167, name: 'Augusta' },
  ],
};

interface VoyageDropdownProps {
  onFitRoute?: () => void;
  onClose?: () => void;
}

export default function VoyageDropdown({ onFitRoute, onClose }: VoyageDropdownProps) {
  const {
    calmSpeed, setCalmSpeed,
    isLaden, setIsLaden,
    useWeather, setUseWeather,
    waypoints, setWaypoints,
    routeName, setRouteName,
  } = useVoyage();

  const handleImport = (importedWaypoints: Position[], name: string) => {
    setWaypoints(importedWaypoints);
    setRouteName(name);
  };

  const handleClearRoute = () => {
    setWaypoints([]);
    setRouteName('Custom Route');
  };

  const handleDrawOnMap = () => {
    onClose?.();
  };

  const handleFitRoute = () => {
    onFitRoute?.();
    onClose?.();
  };

  // Calculate total distance for summary
  const totalDistance = waypoints.reduce((sum, wp, i) => {
    if (i === 0) return 0;
    const prev = waypoints[i - 1];
    const R = 3440.065;
    const lat1 = (prev.lat * Math.PI) / 180;
    const lat2 = (wp.lat * Math.PI) / 180;
    const dlat = ((wp.lat - prev.lat) * Math.PI) / 180;
    const dlon = ((wp.lon - prev.lon) * Math.PI) / 180;
    const a =
      Math.sin(dlat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return sum + R * c;
  }, 0);

  return (
    <div className="absolute top-full right-0 mt-2 w-96 bg-maritime-dark/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl p-4 space-y-4 z-50 max-h-[80vh] overflow-y-auto">
      {/* Section 1: Voyage Parameters */}
      {/* Calm Speed */}
      <div>
        <label className="block text-sm text-gray-300 mb-2">Calm Water Speed</label>
        <div className="flex items-center space-x-2">
          <input
            type="range"
            min="8"
            max="18"
            step="0.5"
            value={calmSpeed}
            onChange={(e) => setCalmSpeed(parseFloat(e.target.value))}
            className="flex-1"
          />
          <span className="w-16 text-right text-white font-semibold text-sm">
            {calmSpeed} kts
          </span>
        </div>
      </div>

      {/* Loading Condition */}
      <div>
        <label className="block text-sm text-gray-300 mb-2">Loading Condition</label>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsLaden(true)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              isLaden
                ? 'bg-primary-500 text-white'
                : 'bg-maritime-medium text-gray-400 hover:text-white'
            }`}
          >
            Laden
          </button>
          <button
            onClick={() => setIsLaden(false)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              !isLaden
                ? 'bg-primary-500 text-white'
                : 'bg-maritime-medium text-gray-400 hover:text-white'
            }`}
          >
            Ballast
          </button>
        </div>
      </div>

      {/* Weather Toggle */}
      <div className="flex items-center justify-between p-3 bg-maritime-medium rounded-lg">
        <div className="flex items-center space-x-2">
          <Wind className="w-4 h-4 text-primary-400" />
          <span className="text-sm text-white">Use Weather</span>
        </div>
        <button
          onClick={() => setUseWeather(!useWeather)}
          className={`relative w-10 h-6 rounded-full transition-colors ${
            useWeather ? 'bg-primary-500' : 'bg-gray-600'
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
              useWeather ? 'left-5' : 'left-1'
            }`}
          />
        </button>
      </div>

      {/* Section 2: Route Import */}
      <div className="border-t border-white/10 pt-4">
        <label className="block text-sm text-gray-300 mb-2">Route</label>

        {waypoints.length > 0 ? (
          <div className="p-3 bg-maritime-medium rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 min-w-0">
                <MapPin className="w-4 h-4 text-primary-400 flex-shrink-0" />
                <span className="text-sm text-white font-medium truncate">{routeName}</span>
              </div>
              <button
                onClick={handleClearRoute}
                className="text-gray-400 hover:text-red-400 transition-colors flex-shrink-0"
                title="Clear Route"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-gray-400">
              {waypoints.length} waypoints &middot; {totalDistance.toFixed(1)} nm
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <RouteImport onImport={handleImport} />
            <button
              onClick={() => handleImport(SAMPLE_ROUTE.waypoints, SAMPLE_ROUTE.name)}
              className="text-xs text-primary-400 hover:text-primary-300 underline"
            >
              Load sample route (Rotterdam — Augusta)
            </button>
          </div>
        )}
      </div>

      {/* Section 3: Waypoint Table + Actions */}
      {waypoints.length > 0 && (
        <div className="border-t border-white/10 pt-4 space-y-3">
          <label className="block text-sm text-gray-300">Waypoints</label>

          <div className="max-h-[250px] overflow-y-auto rounded-lg border border-white/5">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-maritime-dark/95">
                <tr className="text-gray-400 border-b border-white/5">
                  <th className="px-2 py-1.5 text-left w-8">#</th>
                  <th className="px-2 py-1.5 text-left">Name</th>
                  <th className="px-2 py-1.5 text-right">Lat</th>
                  <th className="px-2 py-1.5 text-right">Lon</th>
                </tr>
              </thead>
              <tbody>
                {waypoints.map((wp, i) => (
                  <tr
                    key={i}
                    className="text-gray-300 border-b border-white/5 last:border-0 hover:bg-white/5"
                  >
                    <td className="px-2 py-1 text-gray-500">{i + 1}</td>
                    <td className="px-2 py-1 truncate max-w-[140px]">
                      {wp.name || `WP ${i + 1}`}
                    </td>
                    <td className="px-2 py-1 text-right font-mono">
                      {wp.lat.toFixed(4)}
                    </td>
                    <td className="px-2 py-1 text-right font-mono">
                      {wp.lon.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action buttons */}
          <div className="flex space-x-2">
            <button
              onClick={handleDrawOnMap}
              className="flex-1 flex items-center justify-center space-x-1.5 py-2 bg-primary-500/20 text-primary-400 rounded-lg text-sm font-medium hover:bg-primary-500/30 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Draw on Map</span>
            </button>
            <button
              onClick={handleFitRoute}
              className="flex-1 flex items-center justify-center space-x-1.5 py-2 bg-ocean-500/20 text-ocean-400 rounded-lg text-sm font-medium hover:bg-ocean-500/30 transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Fit to Route</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
