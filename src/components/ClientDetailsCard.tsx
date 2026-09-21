import React, { useState } from 'react';
import {
  X,
  MapPin,
  Phone,
  Clock,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Receipt,
  Truck,
  ExternalLink,
  Copy,
  Check,
  Send,
  PlusCircle,
  Fuel,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { ClientSite, PricingBreakdown, TruckConfig, DashboardOrder, TruckType } from '../types';
import { DEPOT, TRUCKS } from '../data/clients';
import { generateWhatsAppMessage } from '../utils/pricing';
import { dispatchToMakeWebhook } from '../services/sheetsService';
import { ClientOrdersAccordion } from './ClientOrdersAccordion';

interface ClientDetailsCardProps {
  client: ClientSite;
  truck: TruckConfig;
  pricing: PricingBreakdown;
  onClose: () => void;
  onOpenWhatsAppModal: () => void;
  onAddToRoute?: (client: ClientSite) => void;
  isInRoute?: boolean;
  onOpenTrends?: (client: ClientSite) => void;
  onOpenDeliveryNote?: (client: ClientSite, order?: DashboardOrder) => void;
  onSelectTruck?: (type: TruckType) => void;
  allTrucks?: Record<TruckType, TruckConfig>;
}

export const ClientDetailsCard: React.FC<ClientDetailsCardProps> = ({
  client,
  truck,
  pricing,
  onClose,
  onOpenWhatsAppModal,
  onAddToRoute,
  isInRoute = false,
  onOpenTrends,
  onOpenDeliveryNote,
  onSelectTruck,
  allTrucks = TRUCKS,
}) => {
  // 3 Bottom Sheet Modes on Mobile: 'peek' (min ~72px) | 'half' (~50vh) | 'full' (~88vh)
  const [sheetMode, setSheetMode] = useState<'peek' | 'half' | 'full'>('half');
  const [showCostBreakdown, setShowCostBreakdown] = useState(true);
  const [copiedQuick, setCopiedQuick] = useState(false);
  const [isSendingWebhook, setIsSendingWebhook] = useState(false);
  const [webhookToast, setWebhookToast] = useState<string | null>(null);

  const wazeUrl = `https://waze.com/ul?ll=${client.lat},${client.lng}&navigate=yes`;
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${DEPOT.lat},${DEPOT.lng}&destination=${client.lat},${client.lng}`;
  const phoneUrl = `tel:${client.contactPhone.replace(/[^0-9+]/g, '')}`;

  const isProblematic = client.status === 'problematic';

  const handleQuickCopy = () => {
    const text = generateWhatsAppMessage(client, truck, pricing, 'driver');
    navigator.clipboard.writeText(text);
    setCopiedQuick(true);
    setTimeout(() => setCopiedQuick(false), 2000);
  };

  const handleQuickWebhook = async () => {
    setIsSendingWebhook(true);
    setWebhookToast('משדר משימה ל-Make.com...');

    const res = await dispatchToMakeWebhook({
      dispatchType: 'single_client_task',
      clientName: client.name,
      comaxId: client.comaxId,
      address: client.address,
      city: client.city,
      district: client.district,
      truckName: truck.name,
      driverName: truck.driverName,
      serviceSku: truck.serviceSku,
      distanceKm: pricing.oneWayDistanceKm,
      unloadMinutes: pricing.ptoMinutes,
      contactName: client.contactName,
      contactPhone: client.contactPhone,
      observations: client.observations,
      riskStatus: isProblematic ? 'בעייתי' : 'תקין',
      wazeUrl,
    });

    setIsSendingWebhook(false);
    setWebhookToast(res.message);
    setTimeout(() => setWebhookToast(null), 4000);
  };

  // Drag handle or toggle logic for 3 sheet states
  const cycleSheetMode = () => {
    if (sheetMode === 'peek') setSheetMode('half');
    else if (sheetMode === 'half') setSheetMode('full');
    else setSheetMode('peek');
  };

  return (
    <div
      id="client-bottom-sheet"
      className={`fixed inset-x-0 bottom-0 z-30 md:static md:w-[460px] md:max-h-[calc(100vh-140px)] bg-white/98 backdrop-blur-md rounded-t-3xl md:rounded-3xl shadow-2xl border-t md:border border-slate-200/90 flex flex-col overflow-hidden transition-all duration-300 pointer-events-auto ${
        sheetMode === 'peek'
          ? 'h-[74px]'
          : sheetMode === 'half'
          ? 'max-h-[55vh] h-[55vh] md:h-auto md:max-h-[calc(100vh-140px)]'
          : 'h-[88vh] md:h-auto md:max-h-[calc(100vh-140px)]'
      }`}
    >
      {/* 0. Mobile Drag Handle & Mode Switcher */}
      <div
        onClick={cycleSheetMode}
        className="md:hidden pt-2 pb-1.5 px-4 flex items-center justify-between cursor-pointer active:bg-slate-100 transition-colors select-none shrink-0"
      >
        <div className="w-6" />
        <div className="w-12 h-1.5 rounded-full bg-slate-300 hover:bg-slate-400 transition-colors" />
        <div className="text-[10px] font-bold text-slate-400 flex items-center gap-0.5">
          {sheetMode === 'peek' ? (
            <ChevronUp className="w-4 h-4 text-sky-600 animate-bounce" />
          ) : sheetMode === 'half' ? (
            <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
          ) : (
            <Minimize2 className="w-3.5 h-3.5 text-slate-500" />
          )}
        </div>
      </div>

      {/* 1. Mode A: Peek View (Compact Bar on Mobile ~70px) */}
      {sheetMode === 'peek' && (
        <div
          onClick={() => setSheetMode('half')}
          className="md:hidden px-4 py-1.5 flex items-center justify-between gap-2 cursor-pointer"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">
                {isProblematic ? '🔴' : '🟢'}
              </span>
              <h3 className="text-sm font-black text-slate-900 truncate">
                {client.name}
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                #{client.comaxId}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1 mt-0.5">
              <span>{client.city}</span>
              <span>•</span>
              <span className="font-mono font-bold text-sky-700">{pricing.oneWayDistanceKm} ק"מ</span>
              <span>•</span>
              <span className="font-bold text-emerald-700">₪{pricing.totalPriceWithVat.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <a
              href={wazeUrl}
              target="_blank"
              rel="noreferrer"
              className="min-h-[44px] min-w-[44px] p-2 bg-sky-500 text-white rounded-xl flex items-center justify-center shadow-xs"
              title="Waze"
            >
              🧭
            </a>
            <a
              href={phoneUrl}
              className="min-h-[44px] min-w-[44px] p-2 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-xs"
              title="טלפון"
            >
              <Phone className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={() => setSheetMode('half')}
              className="min-h-[44px] min-w-[44px] p-2 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center"
              title="הרחב פרטים"
            >
              <ChevronUp className="w-5 h-5 text-slate-700" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Top Header Bar (Shown in Half & Full on Mobile, and Desktop) */}
      <div
        className={`${
          sheetMode === 'peek' ? 'hidden md:flex' : 'flex'
        } px-4 py-2.5 border-b border-slate-100 items-center justify-between bg-slate-50/80 shrink-0`}
      >
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {/* Service SKU Badge */}
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100/90 text-amber-900 border border-amber-300/80 text-xs font-bold shadow-2xs">
            <span>🏷️ מק"ט:</span>
            <span className="font-mono font-black text-amber-950">{truck.serviceSku}</span>
          </div>

          {/* District Badge */}
          <span className="px-2 py-0.5 rounded-lg bg-slate-200 text-slate-800 font-bold text-xs">
            {client.district}
          </span>

          {client.isCustomGeocoded && (
            <span className="px-2 py-0.5 rounded-lg bg-sky-100 text-sky-900 font-bold text-[10px]">
              אותר גיאוגרפית
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Mobile Sheet Mode Toggle Button */}
          <button
            type="button"
            onClick={() => setSheetMode(sheetMode === 'full' ? 'half' : 'full')}
            className="md:hidden min-h-[36px] min-w-[36px] p-1.5 rounded-xl text-slate-500 hover:bg-slate-200 transition-colors flex items-center justify-center"
            title={sheetMode === 'full' ? 'הקטן' : 'הרחב'}
          >
            {sheetMode === 'full' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 transition-colors flex items-center justify-center cursor-pointer active:scale-95"
            title="סגור כרטיס"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 3. Scrollable Content Body */}
      <div
        className={`${
          sheetMode === 'peek' ? 'hidden md:block' : 'block'
        } flex-1 overflow-y-auto px-4 py-3 space-y-3 overscroll-contain text-right`}
      >
        {/* Client Name & Comax ID */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-900 leading-snug truncate">
              {client.name}
            </h2>
            <div className="text-left shrink-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none">קוד קומקס</span>
              <span className="font-mono font-bold text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded mt-0.5 inline-block">
                #{client.comaxId}
              </span>
            </div>
          </div>

          {/* Address & GPS */}
          <div className="mt-1 flex items-center justify-between gap-2 text-slate-600 text-xs">
            <div className="flex items-center gap-1 font-medium truncate">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{client.address}, {client.city}</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">
              שער מאומת GPS
            </span>
          </div>
        </div>

        {/* DRIVER & TRUCK SWITCHER (Integrated directly in Bottom Sheet) */}
        {onSelectTruck && (
          <div className="p-2 bg-slate-100/90 rounded-2xl border border-slate-200/80 space-y-1">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider px-1">
              בחר נהג ומשאית לחלוקה:
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {/* Hikmat */}
              <button
                type="button"
                onClick={() => onSelectTruck('crane')}
                className={`min-h-[44px] p-2 rounded-xl text-right transition-all cursor-pointer flex items-center gap-2 border ${
                  truck.id === 'crane'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 ring-2 ring-blue-300'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                }`}
              >
                <span className="text-xl">🏗️</span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black leading-tight truncate">חכמת (מנוף 12T)</div>
                  <div className={`text-[10px] font-mono leading-tight ${truck.id === 'crane' ? 'text-blue-100' : 'text-slate-500'}`}>
                    מק"ט 18111 • {client.ituranCraneAvgMinutes || client.craneUnloadMinutes} דק'
                  </div>
                </div>
              </button>

              {/* Ali */}
              <button
                type="button"
                onClick={() => onSelectTruck('flatbed')}
                className={`min-h-[44px] p-2 rounded-xl text-right transition-all cursor-pointer flex items-center gap-2 border ${
                  truck.id === 'flatbed'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20 ring-2 ring-indigo-300'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                }`}
              >
                <span className="text-xl">🚛</span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black leading-tight truncate">עלי (פלטה 5.5T)</div>
                  <div className={`text-[10px] font-mono leading-tight ${truck.id === 'flatbed' ? 'text-indigo-100' : 'text-slate-500'}`}>
                    מק"ט 818111 • {client.ituranFlatbedAvgMinutes || client.flatbedUnloadMinutes} דק'
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Navigation Hub: Waze & Google Maps ("מר גוגל 🌍") */}
        <div className="grid grid-cols-2 gap-2">
          {/* Waze */}
          <a
            href={wazeUrl}
            target="_blank"
            rel="noreferrer"
            className="min-h-[48px] px-3 py-2 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-sm flex items-center justify-between gap-1.5 transition-all cursor-pointer active:scale-95 border border-cyan-300/40"
            title="נווט עם Waze לשער הלקוח"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg">🧭</span>
              <div className="text-right min-w-0">
                <div className="text-xs font-black text-white leading-tight">Waze</div>
                <div className="text-[10px] text-cyan-100 font-bold leading-tight">ניווט ישיר</div>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-cyan-100 shrink-0" />
          </a>

          {/* Google Maps ("מר גוגל 🌍") */}
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="min-h-[48px] px-3 py-2 rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-800 hover:from-neutral-800 hover:to-neutral-700 text-white shadow-sm flex items-center justify-between gap-1.5 transition-all cursor-pointer active:scale-95 border border-neutral-700"
            title="נווט עם מר גוגל"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg">🗺️</span>
              <div className="text-right min-w-0">
                <div className="text-xs font-black text-white leading-tight flex items-center gap-0.5">
                  <span>מר גוגל</span>
                  <span>🌍</span>
                </div>
                <div className="text-[10px] text-neutral-300 font-bold leading-tight">מפות גוגל</div>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          </a>
        </div>

        {/* Site Contact & Quick Call */}
        <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-2 text-xs">
          <div className="min-w-0 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none">איש קשר באתר</span>
            <div className="font-black text-slate-900 truncate">{client.contactName}</div>
            <div className="text-slate-500 font-mono text-[11px] truncate">{client.contactPhone}</div>
          </div>
          <a
            href={phoneUrl}
            className="min-h-[44px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer shrink-0 active:scale-95"
          >
            <Phone className="w-4 h-4" />
            <span>התקשר</span>
          </a>
        </div>

        {/* Quick Profile Row: Distance & Time */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-indigo-600 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400 font-bold">מרחק מהמגרש</div>
              <div className="font-mono font-black text-slate-900 text-sm">{pricing.oneWayDistanceKm} ק"מ</div>
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400 font-bold">זמן פריקה משוער</div>
              <div className="font-mono font-black text-slate-900 text-sm">
                {truck.id === 'crane' ? client.craneUnloadMinutes : client.flatbedUnloadMinutes} דק'
              </div>
            </div>
          </div>
        </div>

        {/* Risk & Terms Banner */}
        <div
          className={`p-2.5 rounded-2xl border flex items-center gap-2 transition-all ${
            isProblematic
              ? 'bg-rose-50 border-rose-200 text-rose-950'
              : 'bg-emerald-50 border-emerald-200 text-emerald-950'
          }`}
        >
          {isProblematic ? (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <div className="text-xs min-w-0 flex-1 flex items-center justify-between gap-1">
            <span className="font-bold truncate">
              {isProblematic ? 'חריג (+10% תוספת סיכון)' : 'אתר תקין ומאושר'}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
              isProblematic ? 'bg-rose-200 text-rose-900' : 'bg-emerald-200 text-emerald-900'
            }`}>
              {client.paymentTerms || (isProblematic ? 'מזומן מראש' : 'שוטף + 30')}
            </span>
          </div>
        </div>

        {/* In Half mode, button to expand to Full view */}
        {sheetMode === 'half' && (
          <button
            type="button"
            onClick={() => setSheetMode('full')}
            className="md:hidden w-full min-h-[44px] py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <span>הצג חישובי שינוע, דלק ומע״מ מלאים</span>
            <ChevronDown className="w-4 h-4 text-slate-500" />
          </button>
        )}

        {/* 4. MODE C (FULL VIEW): Transport Calculations, VAT, Ituran Verification & Orders */}
        {(sheetMode === 'full' || typeof window !== 'undefined') && (
          <div className={`${sheetMode === 'half' ? 'hidden md:block' : 'block'} space-y-3 pt-1`}>
            {/* Dynamic Transport Pricing Breakdown */}
            <div className="p-3.5 bg-gradient-to-br from-neutral-900 to-neutral-950 text-white rounded-3xl shadow-lg border border-neutral-800 space-y-2.5">
              <div
                onClick={() => setShowCostBreakdown(!showCostBreakdown)}
                className="flex items-center justify-between cursor-pointer group select-none"
              >
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-400" />
                  <span className="font-extrabold text-xs sm:text-sm text-neutral-100">
                    ניתוח עלויות שינוע, דלק ומע״מ
                  </span>
                </div>
                <div className="text-neutral-400 group-hover:text-white transition-colors">
                  {showCostBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {showCostBreakdown && (
                <div className="space-y-1.5 pt-1 text-xs border-t border-neutral-800">
                  <div className="flex justify-between text-neutral-300">
                    <span>בסיס אזור ({client.district}):</span>
                    <span className="font-mono font-bold">₪{pricing.basePriceNis.toLocaleString()}</span>
                  </div>

                  {pricing.extraKm > 0 && (
                    <div className="flex justify-between text-neutral-300">
                      <span>ק"מ עודף ({pricing.extraKm} ק"מ × ₪{truck.extraKmRateNis}):</span>
                      <span className="font-mono font-bold">₪{pricing.extraKmCostNis.toLocaleString()}</span>
                    </div>
                  )}

                  {pricing.ptoCostNis > 0 && (
                    <div className="flex justify-between text-neutral-300">
                      <span>זמן פריקה ({pricing.ptoMinutes} דק' מנוף PTO):</span>
                      <span className="font-mono font-bold">₪{pricing.ptoCostNis.toLocaleString()}</span>
                    </div>
                  )}

                  {pricing.riskMarkupNis > 0 && (
                    <div className="flex justify-between text-rose-300">
                      <span>תוספת אתר חריג (+10%):</span>
                      <span className="font-mono font-bold">+₪{pricing.riskMarkupNis.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-amber-300/90 text-[11px] pt-0.5 border-t border-neutral-800/80">
                    <span className="flex items-center gap-1">
                      <Fuel className="w-3 h-3 text-amber-400" />
                      צריכת דלק משוערת:
                    </span>
                    <span className="font-mono font-bold">
                      {(pricing.dieselConsumptionLiters + (pricing.ptoConsumptionLiters || 0)).toFixed(1)} ליטר (₪{(pricing.roundTripDieselCostNis + (pricing.ptoCostNis || 0)).toLocaleString()})
                    </span>
                  </div>
                </div>
              )}

              {/* Final Price Summary */}
              <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-neutral-400 font-semibold">
                    מחיר לפני מע"מ: <span className="font-mono font-bold text-neutral-200">₪{pricing.recommendedPriceBeforeVat.toLocaleString()}</span>
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    מע"מ 18%: ₪{pricing.vatAmountNis.toLocaleString()}
                  </div>
                </div>

                <div className="text-left bg-gradient-to-r from-amber-500/20 to-emerald-500/20 px-3 py-1.5 rounded-2xl border border-amber-400/40">
                  <span className="text-[9px] uppercase tracking-wider font-bold text-amber-300 block">
                    סה"כ לתשלום
                  </span>
                  <span className="text-lg md:text-xl font-black text-emerald-300 font-mono">
                    ₪{pricing.totalPriceWithVat.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Observations */}
            {client.observations && (
              <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <Info className="w-3.5 h-3.5 text-amber-700" />
                  <span>דגשי שטח והנחיות פריקה:</span>
                </div>
                <p className="text-neutral-700 text-[11px] leading-relaxed">
                  {client.observations}
                </p>
              </div>
            )}

            {/* Cross-Validation / Columns I, J, L, P Section */}
            <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200/90 text-xs space-y-2">
              <div className="flex items-center justify-between font-black text-amber-950">
                <span className="text-xs">⚖️ הצלבת נתוני איתוראן (אוג׳-ספט׳)</span>
                <span className="text-[10px] bg-amber-200 text-amber-950 px-2 py-0.5 rounded-full font-bold">
                  מאומת
                </span>
              </div>
              <div className="text-[11px] text-emerald-900 bg-emerald-50 p-2 rounded-xl border border-emerald-200 font-medium">
                {client.verificationStamp || 'אימות רב-חודשי (אוג׳-ספט׳): הצלבת איתוראן עלי (איסוזו FSR90) + חכמת (מרצדס 2543) • שטח מאומת 100%'}
              </div>
              {onOpenTrends && (
                <button
                  type="button"
                  onClick={() => onOpenTrends(client)}
                  className="w-full min-h-[44px] py-2 px-3 bg-amber-200/90 hover:bg-amber-300 text-amber-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>📈</span>
                  <span>גרף מגמת זמני פריקה בפועל (אוג׳-ספט׳)</span>
                </button>
              )}
            </div>

            {/* Client Orders History Accordion */}
            <ClientOrdersAccordion
              client={client}
              onGenerateDeliveryNote={(order) => onOpenDeliveryNote?.(client, order)}
            />
          </div>
        )}
      </div>

      {/* 5. STICKY ACTION BAR (Single Unified Bottom Row, No Overlap) */}
      <div
        id="sticky-client-action-bar"
        className={`${
          sheetMode === 'peek' ? 'hidden md:block' : 'block'
        } sticky bottom-0 z-30 bg-white/98 backdrop-blur-md border-t border-slate-200/90 px-4 py-2.5 pb-[calc(0.65rem+env(safe-area-inset-bottom))] space-y-2 shrink-0 shadow-lg`}
      >
        {webhookToast && (
          <div className="p-1.5 bg-blue-50 text-blue-900 font-bold text-xs rounded-xl text-center flex items-center justify-center gap-1.5 animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">{webhookToast}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Add to Route Button */}
          {onAddToRoute && (
            <button
              type="button"
              onClick={() => onAddToRoute(client)}
              className={`min-h-[44px] py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer shrink-0 active:scale-95 ${
                isInRoute
                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300 shadow-2xs'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-blue-600" />
              <span className="whitespace-nowrap">{isInRoute ? 'בסבב' : 'הוסף לסבב'}</span>
            </button>
          )}

          {/* Primary Action Button: WhatsApp Dispatch */}
          <button
            type="button"
            onClick={onOpenWhatsAppModal}
            className="flex-1 min-h-[44px] py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 truncate"
          >
            <span className="text-base">💬</span>
            <span className="truncate">הפצת משימה לוואטסאפ</span>
          </button>

          {/* Direct 1-Click Make.com Webhook */}
          <button
            type="button"
            onClick={handleQuickWebhook}
            disabled={isSendingWebhook}
            title="שידור מיידי לוובהוק של Make.com"
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50 shrink-0 active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>

          {/* Quick Copy */}
          <button
            type="button"
            onClick={handleQuickCopy}
            title="העתק גרסת נהג מהירה"
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer shrink-0 flex items-center justify-center active:scale-95"
          >
            {copiedQuick ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
