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
} from 'lucide-react';
import { ClientSite, PricingBreakdown, TruckConfig } from '../types';
import { DEPOT } from '../data/clients';
import { generateWhatsAppMessage } from '../utils/pricing';

interface ClientDetailsCardProps {
  client: ClientSite;
  truck: TruckConfig;
  pricing: PricingBreakdown;
  onClose: () => void;
  onOpenWhatsAppModal: () => void;
}

export const ClientDetailsCard: React.FC<ClientDetailsCardProps> = ({
  client,
  truck,
  pricing,
  onClose,
  onOpenWhatsAppModal,
}) => {
  const [showCostBreakdown, setShowCostBreakdown] = useState(true);
  const [copiedQuick, setCopiedQuick] = useState(false);

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

  return (
    <div className="w-full md:w-[460px] max-h-[85vh] md:max-h-[calc(100vh-140px)] bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-neutral-200/80 flex flex-col overflow-hidden transition-all duration-300 pointer-events-auto">
      {/* Top Bar with SKU, District & Close */}
      <div className="px-5 pt-4 pb-3 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/70">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Service SKU Barcode */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 font-bold text-xs tracking-wide shadow-xs">
            <span>🏷️ מק"ט שירות:</span>
            <span className="font-mono text-sm text-blue-900">{truck.serviceSku}</span>
          </div>

          {/* District Badge */}
          <span className="px-2.5 py-0.5 rounded-lg bg-neutral-200/80 text-neutral-800 font-bold text-xs">
            {client.district}
          </span>
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
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
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

          <div className="flex items-center gap-1.5 text-neutral-600 text-sm mt-1">
            <MapPin className="w-4 h-4 text-neutral-400 flex-shrink-0" />
            <span>{client.address}, {client.city}</span>
          </div>
        </div>

        {/* Action Buttons: Waze, Google Maps, Phone */}
        <div className="grid grid-cols-3 gap-2">
          <a
            href={wazeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-cyan-50 hover:bg-cyan-100/80 border border-cyan-200 text-cyan-800 font-bold text-xs transition-colors shadow-xs"
          >
            <span className="text-base">🧭</span>
            <span>ניווט Waze</span>
          </a>

          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-blue-50 hover:bg-blue-100/80 border border-blue-200 text-blue-800 font-bold text-xs transition-colors shadow-xs"
          >
            <span className="text-base">🗺️</span>
            <span>Google Maps</span>
          </a>

          <a
            href={phoneUrl}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-800 font-bold text-xs transition-colors shadow-xs"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-600" />
            <span>חיוג לאתר</span>
          </a>
        </div>

        {/* Contact info pill */}
        <div className="bg-neutral-50 rounded-xl p-2.5 border border-neutral-200/60 flex items-center justify-between text-xs">
          <span className="text-neutral-500">איש קשר: <b className="text-neutral-800">{client.contactName}</b></span>
          <span className="font-mono font-bold text-neutral-700 dir-ltr">{client.contactPhone}</span>
        </div>

        {/* Risk Assessment & 10% Markup Banner */}
        {isProblematic ? (
          <div className="rounded-2xl p-3.5 bg-rose-50 border-2 border-rose-300 text-rose-900 shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="p-1 rounded-lg bg-rose-200/70 text-rose-800 flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-black text-sm text-rose-950 flex items-center gap-1.5">
                  <span>⚠️ לקוח / אתר בעייתי — חלה תוספת סיכון של 10% עליה במחיר!</span>
                </h4>
                <p className="text-xs font-semibold text-rose-800 mt-1 leading-relaxed">
                  🔴 תשלום מראש מומלץ (מזומן / אשראי).
                  {client.riskDetails && ` ${client.riskDetails}`}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="font-bold text-xs text-emerald-900">
                ✅ לקוח תקין — תנאים רגילים | 🟢 שוטף מאושר
              </span>
            </div>
          </div>
        )}

        {/* Logistics & Unloading Profile */}
        <div className="bg-neutral-50/90 rounded-2xl p-3.5 border border-neutral-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-xs text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>פרופיל לוגיסטיקה ויעד פריקה</span>
            </h4>
            <span className="text-[11px] text-neutral-500">מוצא: רחוב החרש 10</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-xl p-2.5 border border-neutral-200/60 shadow-xs">
              <div className="text-[11px] text-neutral-500 font-semibold">מרחק מהמגרש</div>
              <div className="text-base font-black text-neutral-900 mt-0.5">
                {pricing.oneWayDistanceKm} ק"מ
              </div>
              <div className="text-[10px] text-neutral-400">כ-{pricing.travelMinutes} דק׳ נסיעה</div>
            </div>

            <div className="bg-white rounded-xl p-2.5 border border-neutral-200/60 shadow-xs">
              <div className="text-[11px] text-neutral-500 font-semibold">זמן פריקה היסטורי</div>
              <div className="text-base font-black text-neutral-900 mt-0.5">
                {pricing.ptoMinutes} דקות
              </div>
              <div className="text-[10px] text-neutral-400">
                {truck.id === 'crane' ? 'מנוף זרוע פעיל' : 'פריקת פלטה ידנית'}
              </div>
            </div>
          </div>

          {/* Observations banner */}
          <div className="bg-amber-50/70 rounded-xl p-2.5 border border-amber-200/70 text-xs text-amber-900">
            <div className="font-bold text-[11px] text-amber-800 mb-0.5">
              📝 תצפיות שטח והיסטוריית עיכובים:
            </div>
            <div className="leading-relaxed">{client.observations}</div>
            {client.preferredDeliveryHours && (
              <div className="mt-1 text-[11px] font-semibold text-amber-950">
                ⏰ שעות מועדפות: {client.preferredDeliveryHours}
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Costing & Pricing Engine */}
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 text-white rounded-3xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-700/60 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚙️</span>
              <div>
                <h4 className="font-extrabold text-sm text-white leading-tight">
                  מחשבון תמחור ועלויות שינוע
                </h4>
                <p className="text-[10px] text-neutral-300">
                  משאית פעילה: <span className="text-amber-300 font-bold">{truck.name}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCostBreakdown(!showCostBreakdown)}
              className="text-neutral-400 hover:text-white p-1 rounded transition-colors cursor-pointer text-xs flex items-center gap-1"
            >
              <span>{showCostBreakdown ? 'הסתר פירוט' : 'הצג פירוט'}</span>
              {showCostBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Collapsible calculation breakdown */}
          {showCostBreakdown && (
            <div className="space-y-2 text-xs border-b border-neutral-700/60 pb-3">
              <div className="flex items-center justify-between text-neutral-300">
                <span>
                  סולר נסיעה הלוך-חזור ({pricing.roundTripDistanceKm} ק"מ / {truck.fuelConsumptionKmPerL} ק"מ/ל׳):
                </span>
                <span className="font-mono font-bold text-neutral-200">
                  {pricing.dieselConsumptionLiters} ל׳ = ₪{pricing.roundTripDieselCostNis}
                </span>
              </div>

              <div className="flex items-center justify-between text-neutral-300">
                <span>
                  {truck.id === 'crane'
                    ? `הפעלת משאבת מנוף PTO (${pricing.ptoMinutes} דק׳ @ ${truck.ptoFuelLitersPerHour} ל/שעה):`
                    : 'עלות פריקה (פלטה ללא מנוף PTO):'}
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
                    תוספת ק"מ מעל 15 ק"מ ({pricing.extraKm} ק"מ @ ₪{truck.extraKmRateNis}/ק"מ):
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

          {/* Final Recommended Price Highlight */}
          <div className="pt-1 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-neutral-400 font-semibold">
                מחיר מומלץ לפני מע"מ: <span className="font-mono font-bold text-neutral-200">₪{pricing.recommendedPriceBeforeVat.toLocaleString()}</span>
              </div>
              <div className="text-[10px] text-neutral-400">
                מע"מ 18%: ₪{pricing.vatAmountNis.toLocaleString()}
              </div>
            </div>

            <div className="text-left bg-gradient-to-r from-amber-500/20 to-emerald-500/20 px-3 py-1.5 rounded-2xl border border-amber-400/40">
              <span className="text-[10px] uppercase tracking-wider font-bold text-amber-300 block">
                סה"כ לתשלום כולל מע"מ
              </span>
              <span className="text-xl md:text-2xl font-black text-emerald-300 font-mono">
                ₪{pricing.totalPriceWithVat.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer: WhatsApp Export */}
      <div className="px-5 py-3.5 bg-neutral-100/90 border-t border-neutral-200/80 flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenWhatsAppModal}
          className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-black text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all transform active:scale-95 cursor-pointer"
        >
          <span className="text-lg">📲</span>
          <span>העתק כרטיס משימה לוואטסאפ</span>
        </button>

        <button
          type="button"
          onClick={handleQuickCopy}
          title="העתקה מהירה של גרסת נהג ללוח"
          className="p-3 rounded-2xl bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50 shadow-xs transition-colors cursor-pointer flex-shrink-0"
        >
          {copiedQuick ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};
