import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Navigation,
  Crosshair,
  Gauge,
  ChevronDown,
  ChevronUp,
  X,
  Truck,
  MapPin,
  Flag,
} from 'lucide-react';
import { RouteCircuitData, InterpolatedTruckState } from '../utils/routePlayback';
import { DeliveryRound } from '../types';

interface RoutePlaybackControlProps {
  deliveryRound: DeliveryRound;
  circuit: RouteCircuitData;
  truckState: InterpolatedTruckState;
  isPlaying: boolean;
  playbackSpeed: number;
  followCamera: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  onSeek: (progress: number) => void;
  onChangeSpeed: (speed: number) => void;
  onToggleFollowCamera: () => void;
  onJumpToWaypoint: (waypointIndex: number) => void;
  onClose: () => void;
}

export const RoutePlaybackControl: React.FC<RoutePlaybackControlProps> = ({
  deliveryRound,
  circuit,
  truckState,
  isPlaying,
  playbackSpeed,
  followCamera,
  onTogglePlay,
  onReset,
  onSeek,
  onChangeSpeed,
  onToggleFollowCamera,
  onJumpToWaypoint,
  onClose,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  const percent = Math.round(truckState.overallProgress * 100);
  const stopsCount = deliveryRound.stops.length;
  const currentStopIndex = truckState.currentSegment?.to?.stopIndex ?? 1;

  // Handle previous & next waypoint jumps
  const handlePreviousWaypoint = () => {
    const activeIdx = truckState.currentSegment?.index ?? 0;
    const targetIdx = Math.max(0, activeIdx - 1);
    onJumpToWaypoint(targetIdx);
  };

  const handleNextWaypoint = () => {
    const activeIdx = truckState.currentSegment?.index ?? 0;
    const targetIdx = Math.min(circuit.waypoints.length - 1, activeIdx + 1);
    onJumpToWaypoint(targetIdx);
  };

  if (isMinimized) {
    return (
      <div className="bg-neutral-900/95 backdrop-blur-md text-white border border-neutral-700/80 shadow-2xl rounded-2xl p-2 px-3 flex items-center gap-3 transition-all animate-in fade-in slide-in-from-bottom-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-amber-400 text-neutral-950 flex items-center justify-center font-bold text-xs shadow-xs">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-black text-white flex items-center gap-1.5">
              <span>סימולציית סבב ({stopsCount} תחנות)</span>
              <span className="font-mono text-[10px] text-amber-400 font-bold">
                {percent}%
              </span>
            </div>
            <div className="text-[10px] text-neutral-400 truncate max-w-[160px]">
              {truckState.statusHeadline}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 mr-1 border-r border-neutral-700 pr-2">
          <button
            type="button"
            onClick={onTogglePlay}
            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all cursor-pointer ${
              isPlaying
                ? 'bg-amber-400 text-neutral-950 hover:bg-amber-300'
                : 'bg-blue-600 text-white hover:bg-blue-500'
            }`}
            title={isPlaying ? 'השהה סימולציה' : 'הפעל סימולציה'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
            title="פתח לוח בקרה מלא"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id="route-playback-bar"
      className="bg-neutral-950/95 backdrop-blur-md text-white border border-neutral-800 shadow-2xl rounded-2xl p-3.5 space-y-3 w-full max-w-md md:max-w-lg transition-all animate-in fade-in slide-in-from-bottom-4 select-none"
    >
      {/* Top Header: Title, Controls, Minimize & Close */}
      <div className="flex items-center justify-between gap-2 border-b border-neutral-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-amber-400 text-neutral-950 flex items-center justify-center font-bold shadow-xs">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-xs text-white tracking-tight">
                סימולציית נסיעה בסבב חלוקה
              </h4>
              <span className="text-[10px] font-mono font-extrabold bg-blue-900/70 text-blue-300 px-1.5 py-0.2 rounded border border-blue-700/50">
                {stopsCount} תחנות
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 font-medium">
              המחשת תנועת משאית לאורך מקטעי הסבב
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-neutral-400">
          {/* Follow Camera Toggle */}
          <button
            type="button"
            onClick={onToggleFollowCamera}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
              followCamera
                ? 'bg-blue-600/90 text-white border-blue-500 shadow-2xs'
                : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200'
            }`}
            title="הצמד מצלמת מפה למשאית בזמן תנועה"
          >
            <Crosshair className="w-3 h-3" />
            <span className="hidden sm:inline">מעקב מפה</span>
          </button>

          {/* Minimize button */}
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
            title="מזער חלון בקרה"
          >
            <ChevronDown className="w-4 h-4" />
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-rose-400 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
            title="סגור סימולציה"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Real-time Status Card */}
      <div className="p-2.5 bg-neutral-900/90 rounded-xl border border-neutral-800 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                truckState.isAtStop
                  ? 'bg-amber-400 animate-ping'
                  : isPlaying
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-blue-400'
              }`}
            />
            <span className="font-extrabold text-xs text-white truncate block">
              {truckState.statusHeadline}
            </span>
          </div>
          <div className="text-[10px] text-neutral-400 truncate mt-0.5 font-medium">
            {truckState.statusSubtext}
          </div>
        </div>

        <div className="text-left shrink-0 font-mono">
          <div className="text-xs font-black text-amber-400">
            {truckState.distanceCoveredKm} / {truckState.totalDistanceKm} ק"מ
          </div>
          <div className="text-[10px] text-neutral-400 font-bold">
            התקדמות {percent}%
          </div>
        </div>
      </div>

      {/* Scrubbing Timeline Slider with Waypoint Ticks */}
      <div className="space-y-1.5">
        <div className="relative flex items-center">
          <input
            id="playback-seek-slider"
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={truckState.overallProgress * 100}
            onChange={(e) => onSeek(Number(e.target.value) / 100)}
            className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400 focus:outline-none"
            title="גרור כדי לקפוץ לכל נקודה במסלול"
          />
        </div>

        {/* Waypoint markers along timeline */}
        <div className="flex items-center justify-between text-[9px] text-neutral-400 font-bold px-0.5">
          <button
            type="button"
            onClick={() => onJumpToWaypoint(0)}
            className="hover:text-amber-400 flex items-center gap-0.5 cursor-pointer"
            title="מוצא: מגרש סבן"
          >
            <span>🏗️ מוצא</span>
          </button>

          {deliveryRound.stops.map((s, idx) => (
            <button
              key={`wp-tick-${s.id}`}
              type="button"
              onClick={() => onJumpToWaypoint(idx + 1)}
              className={`hover:text-amber-400 flex items-center gap-0.5 cursor-pointer ${
                currentStopIndex === s.stopIndex ? 'text-blue-400 font-black' : ''
              }`}
              title={`קפוץ לתחנה #${s.stopIndex}: ${s.client.name}`}
            >
              <MapPin className="w-2.5 h-2.5" />
              <span>תחנה {s.stopIndex}</span>
            </button>
          ))}

          <button
            type="button"
            onClick={() => onJumpToWaypoint(circuit.waypoints.length - 1)}
            className="hover:text-emerald-400 flex items-center gap-0.5 cursor-pointer"
            title="חזרה לבסיס סבן (סיום)"
          >
            <Flag className="w-2.5 h-2.5" />
            <span>סיום 🏁</span>
          </button>
        </div>
      </div>

      {/* Controls Row: Playback Controls & Speed Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        {/* Play / Pause / Reset / Skip */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onReset}
            className="p-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-xl border border-neutral-800 transition-colors cursor-pointer"
            title="אתחל מסלול מההתחלה (מגרש סבן)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handlePreviousWaypoint}
            className="p-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-xl border border-neutral-800 transition-colors cursor-pointer"
            title="קפוץ לתחנה הקודמת"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            id="playback-play-pause-btn"
            type="button"
            onClick={onTogglePlay}
            className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
              isPlaying
                ? 'bg-amber-400 text-neutral-950 hover:bg-amber-300'
                : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-900/30'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>השהה</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>{percent >= 100 ? 'הפעל שוב' : 'הפעל'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleNextWaypoint}
            className="p-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-xl border border-neutral-800 transition-colors cursor-pointer"
            title="קפוץ לתחנה הבאה"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Speed Multipliers */}
        <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
          <Gauge className="w-3 h-3 text-neutral-400 ml-1" />
          {[1, 2, 4, 8].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChangeSpeed(s)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                playbackSpeed === s
                  ? 'bg-amber-400 text-neutral-950 shadow-2xs font-black'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
