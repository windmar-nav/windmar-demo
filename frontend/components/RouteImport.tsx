'use client';

import { useRef, useState } from 'react';
import { Upload, FileText, X, Check, AlertCircle } from 'lucide-react';
import { apiClient, RouteData, Position } from '@/lib/api';

interface RouteImportProps {
  onImport: (waypoints: Position[], routeName: string) => void;
}

/**
 * RTZ route file import component.
 * Supports drag-and-drop and file selection.
 */
export default function RouteImport({ onImport }: RouteImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importedRoute, setImportedRoute] = useState<RouteData | null>(null);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.rtz')) {
      setError('Please select an RTZ file');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const routeData = await apiClient.parseRTZ(file);
      setImportedRoute(routeData);

      // Convert to Position array
      const waypoints: Position[] = routeData.waypoints.map((wp) => ({
        lat: wp.lat,
        lon: wp.lon,
        name: wp.name,
      }));

      onImport(waypoints, routeData.name);
    } catch (err) {
      console.error('Failed to parse RTZ:', err);
      setError('Failed to parse RTZ file. Please check the file format.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleClear = () => {
    setImportedRoute(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-all duration-200
          ${isDragging
            ? 'border-primary-400 bg-primary-400/10'
            : 'border-white/10 hover:border-white/30 hover:bg-white/5'
          }
          ${isLoading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".rtz"
          onChange={handleFileChange}
          className="hidden"
        />

        <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragging ? 'text-primary-400' : 'text-gray-400'}`} />
        <div className="text-sm text-gray-300">
          {isDragging ? (
            'Drop RTZ file here'
          ) : (
            <>
              <span className="text-primary-400">Click to upload</span> or drag and drop
            </>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-1">RTZ route files only</div>

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-maritime-dark/80 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400" />
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-300">{error}</span>
          <button
            onClick={handleClear}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Success Message */}
      {importedRoute && !error && (
        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-300">Route imported</span>
            </div>
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-2 space-y-1 text-xs">
            <div className="flex items-center space-x-2 text-gray-300">
              <FileText className="w-3 h-3" />
              <span>{importedRoute.name}</span>
            </div>
            <div className="text-gray-400">
              {importedRoute.waypoints.length} waypoints · {importedRoute.total_distance_nm.toFixed(1)} nm
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Sample RTZ download button for testing.
 */
export function SampleRTZButton() {
  const downloadSample = () => {
    const sampleRTZ = `<?xml version="1.0" encoding="UTF-8"?>
<route xmlns="http://www.cirm.org/RTZ/1/1" version="1.1">
  <routeInfo routeName="Rotterdam to Augusta" />
  <waypoints>
    <waypoint name="Rotterdam">
      <position lat="51.9225" lon="4.4792" />
    </waypoint>
    <waypoint name="Dover Strait">
      <position lat="51.0500" lon="1.5000" />
    </waypoint>
    <waypoint name="Ushant">
      <position lat="48.4500" lon="-5.1000" />
    </waypoint>
    <waypoint name="Finisterre">
      <position lat="42.8800" lon="-9.2700" />
    </waypoint>
    <waypoint name="Gibraltar">
      <position lat="36.1408" lon="-5.3536" />
    </waypoint>
    <waypoint name="Alboran Sea">
      <position lat="36.2000" lon="-3.0000" />
    </waypoint>
    <waypoint name="Sardinia South">
      <position lat="38.0000" lon="8.8000" />
    </waypoint>
    <waypoint name="Augusta">
      <position lat="37.2333" lon="15.2167" />
    </waypoint>
  </waypoints>
</route>`;

    const blob = new Blob([sampleRTZ], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rotterdam-augusta.rtz';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={downloadSample}
      className="text-xs text-primary-400 hover:text-primary-300 underline"
    >
      Download sample RTZ
    </button>
  );
}
