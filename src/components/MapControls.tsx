import React, { useState } from 'react';
import { Layers, Compass, LocateFixed, Eye, HelpCircle, ShieldAlert } from 'lucide-react';
import { DEPOT } from '../data/clients';

interface MapControlsProps {
  mapLayerType: 'standard' | 'voyager' | 'dark' | 'satellite';
  onChangeLayer: (layer: 'standard' | 'voyager' | 'dark' | 'satellite') => void;
  onCenterDepot: () => void;
  onFitAll: () => void;
  clientsCount: number;
  problematicCount: number;
}

export const MapControls: React.FC<MapControlsProps> = ({
  mapLayerType,
  onChangeLayer,
  onCenterDepot,
  onFitAll,
  clientsCount,
  problematicCount,
}) => {
  const [showLayers, setShowLayers] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  return (
    <div className="flex flex-col items-end gap-2 pointer-events-auto">
      {/* Action Buttons */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-neutral-200/80 p-1 flex flex-col gap-1">
        {/* Reset to Depot Button */}
        <button
          type="button"
          onClick={onCenterDepot}
          title="מרכז מפה למגרש סבן (הוד השרון)"
          className="p-2.5 rounded-xl text-neutral-700 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
        >
          <Compass className="w-5 h-5" />
        </button>

        {/* Fit All Points */}
        <button
          type="button"
          onClick={onFitAll}
          title="הצג את כל הלקוחות במפה"
          className="p-2.5 rounded-xl text-neutral-700 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
        >
          <LocateFixed className="w-5 h-5" />
        </button>

        {/* Layer Selector Toggle */}
        <button
          type="button"
          onClick={() => {
            setShowLayers(!showLayers);
            setShowLegend(false);
          }}
          title="שכבות מפה"
          className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
            showLayers ? 'bg-blue-600 text-white' : 'text-neutral-700 hover:bg-neutral-100'
          }`}
        >
          <Layers className="w-5 h-5" />
        </button>

        {/* Legend Toggle */}
        <button
          type="button"
          onClick={() => {
            setShowLegend(!showLegend);
            setShowLayers(false);
          }}
          title="מקרא מפה"
          className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
            showLegend ? 'bg-amber-500 text-white' : 'text-neutral-700 hover:bg-neutral-100'
          }`}
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>

      {/* Layer Picker Popup */}
      {showLayers && (
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-neutral-200/80 p-2 w-48 text-xs space-y-1 mt-1 animate-in fade-in zoom-in-95">
          <div className="text-[10px] font-bold text-neutral-400 px-2 py-1 uppercase tracking-wider">
            בחר סגנון מפה
          </div>
          {[
            { id: 'voyager', label: '🗺️ Carto Voyager (נקי)' },
            { id: 'standard', label: '🌐 OpenStreetMap' },
            { id: 'satellite', label: '🛰️ תצ״א לוויין (Esri)' },
            { id: 'dark', label: '🌙 מצב לילה (Dark)' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onChangeLayer(item.id as any);
                setShowLayers(false);
              }}
              className={`w-full text-right px-3 py-2 rounded-xl font-bold transition-colors cursor-pointer ${
                mapLayerType === item.id
                  ? 'bg-blue-600 text-white'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Map Legend Popup */}
      {showLegend && (
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-neutral-200/80 p-3.5 w-60 text-xs space-y-2 mt-1 animate-in fade-in zoom-in-95">
          <div className="text-[11px] font-black text-neutral-800 border-b border-neutral-100 pb-1.5 flex items-center justify-between">
            <span>מקרא סטטוס אתרים</span>
            <span className="text-[10px] font-mono text-neutral-500">{clientsCount} אתרים</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-xl bg-blue-900 border border-amber-400 text-white flex items-center justify-center text-xs">
              🏗️
            </div>
            <div>
              <div className="font-bold text-neutral-900">מגרש סבן (מוצא ראשי)</div>
              <div className="text-[10px] text-neutral-500">החרש 10, הוד השרון</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
              📍
            </div>
            <div>
              <div className="font-bold text-emerald-800">אתר תקין ({clientsCount - problematicCount})</div>
              <div className="text-[10px] text-neutral-500">תנאים רגילים, שוטף מאושר</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-bold">
              ⚠️
            </div>
            <div>
              <div className="font-bold text-rose-800">אתר בעייתי ({problematicCount})</div>
              <div className="text-[10px] text-neutral-500">תוספת סיכון 10%, פריקה מורכבת</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
