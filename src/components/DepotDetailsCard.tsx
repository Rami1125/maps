import React from 'react';
import { X, MapPin, Phone, Clock, Truck, ShieldCheck, Building2, Navigation } from 'lucide-react';
import { DepotInfo, TruckConfig } from '../types';

interface DepotDetailsCardProps {
  depot: DepotInfo;
  trucks: Record<'crane' | 'flatbed', TruckConfig>;
  onClose: () => void;
  onFocusDepot: () => void;
}

export const DepotDetailsCard: React.FC<DepotDetailsCardProps> = ({
  depot,
  trucks,
  onClose,
  onFocusDepot,
}) => {
  const wazeUrl = `https://waze.com/ul?ll=${depot.lat},${depot.lng}&navigate=yes`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${depot.lat},${depot.lng}`;

  return (
    <div className="w-full md:w-[440px] bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-neutral-200/80 flex flex-col overflow-hidden pointer-events-auto">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-neutral-100 flex items-center justify-between bg-blue-900 text-white">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-amber-400 text-blue-950 flex items-center justify-center font-bold text-lg">
            🏗️
          </div>
          <div>
            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest block">
              בסיס מוצא ראשי לכל השינוע
            </span>
            <h3 className="text-base font-black leading-tight">
              {depot.fullName}
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-5 space-y-4 text-xs">
        {/* Company Registration & Address */}
        <div>
          <div className="text-xs text-neutral-500 font-semibold mb-1">
            {depot.companyNumber}
          </div>
          <div className="flex items-center gap-1.5 text-neutral-800 font-bold text-sm">
            <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>{depot.address}</span>
          </div>
        </div>

        {/* Operating Hours & Phone */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-neutral-50 rounded-xl p-2.5 border border-neutral-200/60">
            <div className="flex items-center gap-1 text-neutral-500 font-bold text-[11px]">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>שעות פתיחה</span>
            </div>
            <div className="font-semibold text-neutral-800 mt-1 leading-snug">
              {depot.hours}
            </div>
          </div>

          <div className="bg-neutral-50 rounded-xl p-2.5 border border-neutral-200/60">
            <div className="flex items-center gap-1 text-neutral-500 font-bold text-[11px]">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>מוקד סדרן / משרד</span>
            </div>
            <a
              href={`tel:${depot.phone}`}
              className="font-bold text-neutral-800 mt-1 block hover:text-blue-600"
            >
              {depot.phone}
            </a>
          </div>
        </div>

        {/* Fleet Profile */}
        <div className="space-y-2">
          <h4 className="font-extrabold text-neutral-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-blue-600" />
            <span>צי המשאיות של סבן</span>
          </h4>

          <div className="space-y-1.5">
            <div className="bg-blue-50/70 rounded-xl p-2.5 border border-blue-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-neutral-900">{trucks.crane.name}</div>
                <div className="text-[10px] text-neutral-500">{trucks.crane.vehicleModel}</div>
              </div>
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                מק"ט {trucks.crane.serviceSku}
              </span>
            </div>

            <div className="bg-indigo-50/70 rounded-xl p-2.5 border border-indigo-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-neutral-900">{trucks.flatbed.name}</div>
                <div className="text-[10px] text-neutral-500">{trucks.flatbed.vehicleModel}</div>
              </div>
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                מק"ט {trucks.flatbed.serviceSku}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <a
            href={wazeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-cyan-800 font-bold transition-colors"
          >
            <span>🧭</span>
            <span>ניווט למגרש ב-Waze</span>
          </a>

          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 font-bold transition-colors"
          >
            <span>🗺️</span>
            <span>Google Maps</span>
          </a>
        </div>
      </div>
    </div>
  );
};
