import React, { useState } from 'react';
import { Truck, Fuel, ShieldAlert, Sparkles, Check, Edit3 } from 'lucide-react';
import { TruckConfig, TruckType } from '../types';

interface TruckToolbarProps {
  currentTruck: TruckConfig;
  trucks: Record<TruckType, TruckConfig>;
  onSelectTruck: (type: TruckType) => void;
  fuelRateNis: number;
  onUpdateFuelRate: (rate: number) => void;
}

export const TruckToolbar: React.FC<TruckToolbarProps> = ({
  currentTruck,
  trucks,
  onSelectTruck,
  fuelRateNis,
  onUpdateFuelRate,
}) => {
  const [isEditingFuel, setIsEditingFuel] = useState(false);
  const [tempFuel, setTempFuel] = useState(fuelRateNis.toString());

  const handleSaveFuel = () => {
    const val = parseFloat(tempFuel);
    if (!isNaN(val) && val > 0 && val < 30) {
      onUpdateFuelRate(Math.round(val * 100) / 100);
    } else {
      setTempFuel(fuelRateNis.toString());
    }
    setIsEditingFuel(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
      {/* Truck Selector Segmented Control */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-neutral-200/80 p-1 flex items-center gap-1">
        <button
          type="button"
          onClick={() => onSelectTruck('crane')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
            currentTruck.id === 'crane'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          <span className="text-base">🏗️</span>
          <div className="text-right">
            <span className="block leading-none">חכמת (מרצדס מנוף)</span>
            <span className="text-[10px] font-normal opacity-80 leading-tight">12 טון • מק"ט 18111</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelectTruck('flatbed')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
            currentTruck.id === 'flatbed'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-[1.02]'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          <span className="text-base">🚛</span>
          <div className="text-right">
            <span className="block leading-none">עלי (איסוזו פלטה)</span>
            <span className="text-[10px] font-normal opacity-80 leading-tight">5.5 טון • מק"ט 818111</span>
          </div>
        </button>
      </div>

      {/* Fuel Rate Box */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-neutral-200/80 px-3 py-1.5 flex items-center gap-2">
        <div className="p-1 rounded-lg bg-amber-50 text-amber-600">
          <Fuel className="w-4 h-4" />
        </div>

        <div className="text-xs">
          <div className="text-[10px] text-neutral-500 font-semibold leading-none">
            סולר נטו לליטר
          </div>

          {isEditingFuel ? (
            <div className="flex items-center gap-1 mt-0.5">
              <input
                type="number"
                step="0.05"
                min="3"
                max="25"
                value={tempFuel}
                onChange={(e) => setTempFuel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveFuel();
                }}
                className="w-16 px-1.5 py-0.5 text-xs font-bold border border-blue-400 rounded outline-none text-neutral-900"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveFuel}
                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => {
                setTempFuel(fuelRateNis.toString());
                setIsEditingFuel(true);
              }}
              title="לחץ לעריכת מחיר סולר"
              className="flex items-center gap-1 font-extrabold text-neutral-800 cursor-pointer hover:text-blue-600 transition-colors"
            >
              <span>₪{fuelRateNis.toFixed(2)}</span>
              <span className="text-[10px] text-neutral-400 font-normal">/ ל׳</span>
              <Edit3 className="w-3 h-3 text-neutral-400" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
