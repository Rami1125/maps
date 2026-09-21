import React, { useState } from 'react';
import {
  X,
  Navigation,
  MapPin,
  Phone,
  Clock,
  Gauge,
  Fuel,
  AlertTriangle,
  CheckCircle2,
  Share2,
  ChevronDown,
  ChevronUp,
  Info,
  DollarSign,
  Receipt,
  Truck,
  ExternalLink,
  Copy,
  Check,
  Send,
  PlusCircle,
  CreditCard,
} from 'lucide-react';
import { ClientSite, PricingBreakdown, TruckConfig, DashboardOrder } from '../types';
import { DEPOT } from '../data/clients';
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
}) => {
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

  return (
    <div className="w-full md:w-[460px] max-h-[85vh] md:max-h-[calc(100vh-140px)] bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-neutral-200/80 flex flex-col overflow-hidden transition-all duration-300 pointer-events-auto">
      {/* Top Bar with SKU, District & Close */}
      <div className="px-5 pt-4 pb-3 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/70">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Service SKU Barcode */}
          <div
            style={{
              width: '235px',
              height: '58px',
              fontFamily: 'Georgia',
              textAlign: 'center',
              fontSize: '26px',
              marginLeft: '-11px',
              marginRight: '50px',
              backgroundColor: '#fbf368',
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-xl border border-blue-200 text-blue-800 font-bold tracking-wide shadow-2xs"
          >
            <span>🏷️ מק"ט:</span>
            <span
              style={{
                fontFamily: 'Assistant',
                fontSize: '33px',
              }}
              className="font-mono text-blue-900 font-black"
            >
              {truck.serviceSku}
            </span>
          </div>

          {/* District Badge */}
          <span
            style={{
              marginRight: '300px',
              paddingTop: '6px',
              paddingBottom: '5px',
              marginLeft: '-13px',
              marginTop: '-52px',
            }}
            className="px-2.5 rounded-lg bg-neutral-200/80 text-neutral-800 font-bold text-xs"
          >
            {client.district}
          </span>

          {client.isCustomGeocoded && (
            <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 font-bold text-[10px]">
              יעד שאותר גיאוגרפית
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 transition-colors cursor-pointer"
          title="סגור כרטיס"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5">
        {/* Client Name & Comax ID */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-xl md:text-2xl font-black text-neutral-900 leading-tight">
              {client.name}
            </h2>
            <div className="text-left flex-shrink-0">
              <span className="text-[11px] uppercase font-bold text-neutral-400 block">קוד קומקס</span>
              <span className="font-mono font-bold text-sm text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded">
                #{client.comaxId}
              </span>
            </div>
          </div>

          {/* Address */}
          <div className="mt-2 flex items-center justify-between gap-2 text-neutral-600 text-xs">
            <div className="flex items-center gap-1.5 font-medium truncate">
              <MapPin className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              <span className="truncate">{client.address}, {client.city}</span>
            </div>
          </div>
        </div>

        {/* Enlarged & Modern Navigation Hub: Waze & Google Maps Only */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Waze Button - Enlarged & Modern Design */}
          <a
            href={wazeUrl}
            target="_blank"
            rel="noreferrer"
            className="group relative overflow-hidden px-3.5 py-3 min-h-[60px] rounded-2xl bg-gradient-to-br from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md shadow-cyan-500/25 flex items-center justify-between gap-2 transition-all duration-200 cursor-pointer active:scale-[0.98] border border-cyan-300/40"
            title="נווט עם Waze ישירות לשער הלקוח"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl shadow-inner shrink-0 group-hover:scale-110 transition-transform">
                🧭
              </div>
              <div className="text-right min-w-0">
                <div className="text-sm md:text-base font-black text-white leading-tight tracking-tight">
                  Waze
                </div>
                <div className="text-[11px] text-cyan-100 font-bold leading-tight mt-0.5">
                  ניווט ישיר
                </div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-cyan-100/90 shrink-0 group-hover:translate-x-[-2px] transition-transform" />
          </a>

          {/* Google Maps Button - Enlarged & Modern Design */}
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="group relative overflow-hidden px-3.5 py-3 min-h-[60px] rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-850 to-neutral-950 hover:from-neutral-800 hover:to-neutral-900 text-white shadow-md shadow-neutral-950/20 flex items-center justify-between gap-2 transition-all duration-200 cursor-pointer active:scale-[0.98] border border-neutral-750"
            title="נווט עם מר גוגל לנ.צ מדויק"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl shadow-inner shrink-0 group-hover:scale-110 transition-transform">
                🗺️
              </div>
              <div className="text-right min-w-0">
                <div className="text-sm md:text-base font-black text-white leading-tight tracking-tight flex items-center gap-1">
                  <span>מר גוגל</span>
                  <span>🌍</span>
                </div>
                <div className="text-[11px] text-neutral-300 font-bold leading-tight mt-0.5">
                  מפות גוגל
                </div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-white shrink-0 group-hover:translate-x-[-2px] transition-transform" />
          </a>
        </div>

        {/* Risk & Payment Terms Banner */}
        <div
          className={`p-3 rounded-2xl border flex items-start gap-2.5 transition-all ${
            isProblematic
              ? 'bg-rose-50 border-rose-200 text-rose-950'
              : 'bg-emerald-50 border-emerald-200 text-emerald-950'
          }`}
        >
          {isProblematic ? (
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          )}

          <div className="text-xs space-y-0.5 w-full">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm">
                {isProblematic
                  ? '⚠️ אתר בעייתי / מורכב (+10% תוספת סיכון)'
                  : '🟢 אתר תקין ומאושר'}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isProblematic ? 'bg-rose-200 text-rose-900' : 'bg-emerald-200 text-emerald-900'
              }`}>
                {client.paymentTerms || (isProblematic ? 'מזומן / אשראי מראש' : 'שוטף + 30')}
              </span>
            </div>
            {isProblematic && client.riskDetails && (
              <p className="text-[11px] text-rose-800 mt-1 font-medium leading-relaxed">
                {client.riskDetails}
              </p>
            )}
          </div>
        </div>

        {/* Unified Cross-Validation Section (Columns I, J, L, P) */}
        <div className="p-3.5 bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-neutral-50 rounded-2xl border border-amber-200/90 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-black text-xs text-amber-950">
              <span className="text-sm">⚖️</span>
              <span>הצלבת נתוני שטח וכיול רב-חודשי (אוג׳-ספט׳)</span>
            </div>
            <span className="text-[10px] bg-amber-200 text-amber-950 font-black px-2 py-0.5 rounded-full border border-amber-300">
              איתוראן מאומת
            </span>
          </div>

          {/* Drivers & Unload Times Comparison: Column I & Column J */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Column I: Crane PTO (Mercedes - Hikmat) */}
            <div className={`p-2.5 rounded-xl border transition-all ${
              truck.id === 'crane'
                ? 'bg-blue-50/90 border-blue-300 ring-2 ring-blue-400/50'
                : 'bg-white border-neutral-200'
            }`}>
              <div className="flex items-center justify-between text-[10px] font-bold text-neutral-500">
                <span>עמודה I • מנוף PTO</span>
                <span className="bg-blue-100 text-blue-900 px-1.5 rounded font-mono font-bold">18111</span>
              </div>
              <div className="font-extrabold text-xs text-neutral-900 mt-0.5">
                חכמת (מרצדס 12T)
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-lg font-black text-blue-700">
                  {client.ituranCraneAvgMinutes || client.craneUnloadMinutes}
                </span>
                <span className="text-[11px] text-neutral-600 font-semibold">דקות פריקה</span>
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5">
                כיול ממוצע אמת אוג׳-ספט׳
              </div>
            </div>

            {/* Column J: Flatbed Manual (Isuzu - Ali) */}
            <div className={`p-2.5 rounded-xl border transition-all ${
              truck.id === 'flatbed'
                ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-400/50'
                : 'bg-white border-neutral-200'
            }`}>
              <div className="flex items-center justify-between text-[10px] font-bold text-neutral-500">
                <span>עמודה J • פריקה ידנית</span>
                <span className="bg-amber-100 text-amber-900 px-1.5 rounded font-mono font-bold">818111</span>
              </div>
              <div className="font-extrabold text-xs text-neutral-900 mt-0.5">
                עלי (איסוזו 5.5T)
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-lg font-black text-amber-700">
                  {client.ituranFlatbedAvgMinutes || client.flatbedUnloadMinutes}
                </span>
                <span className="text-[11px] text-neutral-600 font-semibold">דקות פריקה</span>
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5">
                זמן בפועל מדוחות איתוראן
              </div>
            </div>
          </div>

          {/* Column L: Multi-month verification stamp */}
          <div className="p-2.5 bg-white/95 rounded-xl border border-amber-200 text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-black text-neutral-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>עמודה L: חותמת אימות רב-חודשית</span>
            </div>
            <div className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
              {client.verificationStamp || 'אימות רב-חודשי (אוג׳-ספט׳): הצלבת איתוראן עלי (איסוזו FSR90) + חכמת (מרצדס 2543) • שטח מאומת 100%'}
            </div>
            {client.crossValidationNote && (
              <p className="text-[10px] text-neutral-600 leading-relaxed pt-0.5">
                {client.crossValidationNote}
              </p>
            )}

            {onOpenTrends && (
              <button
                type="button"
                onClick={() => onOpenTrends(client)}
                className="w-full mt-2 py-1.5 px-3 bg-amber-200/90 hover:bg-amber-300 text-amber-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer border border-amber-300"
              >
                <span>📈</span>
                <span>גרף מגמת זמני פריקה בפועל (אוג׳-ספט׳)</span>
              </button>
            )}
          </div>
        </div>

        {/* Client Historical Orders Accordion from tab דשבורד_הזמנות */}
        <ClientOrdersAccordion
          client={client}
          onGenerateDeliveryNote={(order) => onOpenDeliveryNote?.(client, order)}
        />

        {/* Unloading Profile & Driver Contact */}
        <div className="grid grid-cols-2 gap-2">
          {/* Unload Minutes */}
          <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/80">
            <div className="flex items-center gap-1.5 text-neutral-500 text-[11px] font-bold">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>זמן פריקה משוער</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-neutral-900">
                {truck.id === 'crane' ? client.craneUnloadMinutes : client.flatbedUnloadMinutes}
              </span>
              <span className="text-xs text-neutral-500 font-semibold">
                דקות ({truck.id === 'crane' ? 'מנוף' : 'פלטה'})
              </span>
            </div>
          </div>

          {/* Distance */}
          <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/80">
            <div className="flex items-center gap-1.5 text-neutral-500 text-[11px] font-bold">
              <Gauge className="w-3.5 h-3.5 text-indigo-600" />
              <span>מרחק נסיעה</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-neutral-900 font-mono">
                {pricing.oneWayDistanceKm}
              </span>
              <span className="text-xs text-neutral-500 font-semibold">
                ק"מ מהמגרש (~{pricing.travelMinutes} דק')
              </span>
            </div>
          </div>
        </div>

        {/* Site Contact Person */}
        <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/80 flex items-center justify-between text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">איש קשר באתר</span>
            <div className="font-bold text-neutral-900">{client.contactName}</div>
            <div className="text-neutral-500 font-mono">{client.contactPhone}</div>
          </div>
          <a
            href={phoneUrl}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>התקשר</span>
          </a>
        </div>

        {/* Site Observations */}
        {client.observations && (
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <Info className="w-3.5 h-3.5 text-amber-700" />
              <span>דגשי שטח והנחיות פריקה:</span>
            </div>
            <p className="text-neutral-700 text-[11px] leading-relaxed">
              {client.observations}
            </p>
          </div>
        )}

        {/* Dynamic Pricing Breakdown */}
        <div className="p-4 bg-gradient-to-br from-neutral-900 to-neutral-950 text-white rounded-3xl shadow-lg border border-neutral-800 space-y-3">
          <div
            onClick={() => setShowCostBreakdown(!showCostBreakdown)}
            className="flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-400" />
              <span className="font-extrabold text-sm text-neutral-100">
                ניתוח עלויות שינוע ותמחור
              </span>
            </div>
            <div className="text-neutral-400 group-hover:text-white transition-colors">
              {showCostBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>

          {showCostBreakdown && (
            <div className="space-y-2 pt-2 border-t border-neutral-800 text-xs">
              <div className="flex items-center justify-between text-neutral-300">
                <span>
                  סולר נסיעה הלוך-חזור ({pricing.roundTripDistanceKm} ק"מ @ {truck.fuelConsumptionKmPerL} ק"מ/ל):
                </span>
                <span className="font-mono font-bold text-neutral-200">
                  {pricing.dieselConsumptionLiters} ל׳ = ₪{pricing.roundTripDieselCostNis}
                </span>
              </div>

              <div className="flex items-center justify-between text-neutral-300">
                <span>
                  {truck.id === 'crane'
                    ? `הפעלת מנוף PTO (${pricing.ptoMinutes} דק׳ @ ${truck.ptoFuelLitersPerHour} ל/שעה):`
                    : 'פריקה (פלטה ללא מנוף PTO):'}
                </span>
                <span className="font-mono font-bold text-neutral-200">
                  {truck.id === 'crane'
                    ? `${pricing.ptoConsumptionLiters} ל׳ = ₪${pricing.ptoCostNis}`
                    : '₪0'}
                </span>
              </div>

              <div className="flex items-center justify-between text-amber-300 font-bold bg-neutral-800/80 px-2 py-1.5 rounded-lg border border-neutral-700">
                <span>סך עלות שינוע ישירה (דלק בלבד):</span>
                <span className="font-mono">₪{pricing.totalDirectDeliveryCostNis}</span>
              </div>

              <div className="flex items-center justify-between text-neutral-400 text-[11px] pt-1">
                <span>מחירון בסיס אזור ({client.district}):</span>
                <span className="font-mono">₪{pricing.basePriceNis}</span>
              </div>

              {pricing.extraKm > 0 && (
                <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                  <span>
                    תוספת מעל 15 ק"מ ({pricing.extraKm} ק"מ @ ₪{truck.extraKmRateNis}/ק"מ):
                  </span>
                  <span className="font-mono text-amber-300">+₪{pricing.extraKmCostNis}</span>
                </div>
              )}

              {pricing.isProblematic && (
                <div className="flex items-center justify-between text-rose-300 text-[11px] font-bold">
                  <span>תוספת סיכון אתר מורכב (10%+):</span>
                  <span className="font-mono">+₪{pricing.riskMarkupNis}</span>
                </div>
              )}
            </div>
          )}

          {/* Final Price */}
          <div className="pt-1 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-neutral-400 font-semibold">
                מחיר לפני מע"מ: <span className="font-mono font-bold text-neutral-200">₪{pricing.recommendedPriceBeforeVat.toLocaleString()}</span>
              </div>
              <div className="text-[10px] text-neutral-400">
                מע"מ 18%: ₪{pricing.vatAmountNis.toLocaleString()}
              </div>
            </div>

            <div className="text-left bg-gradient-to-r from-amber-500/20 to-emerald-500/20 px-3 py-1.5 rounded-2xl border border-amber-400/40">
              <span className="text-[10px] uppercase tracking-wider font-bold text-amber-300 block">
                סה"כ לתשלום
              </span>
              <span className="text-xl md:text-2xl font-black text-emerald-300 font-mono">
                ₪{pricing.totalPriceWithVat.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="px-5 py-3 bg-neutral-100 border-t border-neutral-200 space-y-2">
        {webhookToast && (
          <div className="p-2 bg-blue-50 text-blue-900 font-bold text-xs rounded-xl text-center flex items-center justify-center gap-1.5 animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            <span>{webhookToast}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Add to Multi-stop Route Button */}
          {onAddToRoute && (
            <button
              type="button"
              onClick={() => onAddToRoute(client)}
              className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                isInRoute
                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                  : 'bg-white text-neutral-700 hover:bg-neutral-50 border-neutral-300 shadow-2xs'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-blue-600" />
              <span>{isInRoute ? 'נמצא בסבב' : 'הוסף לסבב'}</span>
            </button>
          )}

          {/* WhatsApp Export Modal */}
          <button
            type="button"
            onClick={onOpenWhatsAppModal}
            className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <span>💬</span>
            <span>הפצת משימה לוואטסאפ</span>
          </button>

          {/* Direct 1-Click Make.com Webhook */}
          <button
            type="button"
            onClick={handleQuickWebhook}
            disabled={isSendingWebhook}
            title="שידור מיידי לוובהוק של Make.com"
            className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSendingWebhook ? 'משדר...' : 'שדר וובהוק'}</span>
          </button>

          {/* Quick Copy */}
          <button
            type="button"
            onClick={handleQuickCopy}
            title="העתק גרסת נהג מהירה"
            className="p-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50 shadow-2xs transition-colors cursor-pointer"
          >
            {copiedQuick ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
