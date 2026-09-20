import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, UserCheck, Briefcase, Send, CheckCircle2 } from 'lucide-react';
import { ClientSite, PricingBreakdown, TruckConfig } from '../types';
import { generateWhatsAppMessage } from '../utils/pricing';
import { dispatchToMakeWebhook } from '../services/sheetsService';

interface WhatsAppModalProps {
  client: ClientSite;
  truck: TruckConfig;
  pricing: PricingBreakdown;
  onClose: () => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  client,
  truck,
  pricing,
  onClose,
}) => {
  const [version, setVersion] = useState<'driver' | 'manager'>('driver');
  const [copied, setCopied] = useState(false);
  const [isDispatchingWebhook, setIsDispatchingWebhook] = useState(false);
  const [webhookFeedback, setWebhookFeedback] = useState<string | null>(null);

  const messageText = generateWhatsAppMessage(client, truck, pricing, version);

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(messageText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleDispatchMake = async () => {
    setIsDispatchingWebhook(true);
    setWebhookFeedback('משדר ל-Make.com...');

    const payload = {
      dispatchType: 'single_client_task',
      version,
      clientName: client.name,
      comaxId: client.comaxId,
      address: client.address,
      city: client.city,
      district: client.district,
      truckName: truck.name,
      driverName: truck.driverName,
      serviceSku: truck.serviceSku,
      distanceKm: pricing.oneWayDistanceKm,
      roundTripKm: pricing.roundTripDistanceKm,
      unloadMinutes: pricing.ptoMinutes,
      contactName: client.contactName,
      contactPhone: client.contactPhone,
      observations: client.observations,
      riskDetails: client.riskDetails || 'אין',
      isProblematic: client.status === 'problematic',
      paymentTerms: client.paymentTerms || 'שוטף + 30',
      totalPriceWithVat: pricing.totalPriceWithVat,
      wazeUrl: `https://waze.com/ul?ll=${client.lat},${client.lng}&navigate=yes`,
      googleMapsUrl: `https://www.google.com/maps/dir/?api=1&origin=32.15574,34.89668&destination=${client.lat},${client.lng}`,
    };

    const res = await dispatchToMakeWebhook(payload);
    setIsDispatchingWebhook(false);
    setWebhookFeedback(res.message);

    setTimeout(() => {
      setWebhookFeedback(null);
    }, 4500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm pointer-events-auto">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg font-bold">
              💬
            </div>
            <div>
              <h3 className="font-bold text-base">הפצת כרטיס משימה / וובהוק</h3>
              <p className="text-xs text-neutral-400">
                עבור: {client.name} (#{client.comaxId})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Version Switcher Tabs */}
        <div className="p-4 bg-neutral-50 border-b border-neutral-200 flex gap-2">
          <button
            type="button"
            onClick={() => setVersion('driver')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              version === 'driver'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>גרסת נהג (ללא מחירים)</span>
          </button>

          <button
            type="button"
            onClick={() => setVersion('manager')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              version === 'manager'
                ? 'bg-neutral-900 text-white shadow-md'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>גרסת הנהלה (כולל עלויות)</span>
          </button>
        </div>

        {/* Message Preview Box */}
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="text-[11px] font-semibold text-neutral-500 mb-1.5 flex items-center justify-between">
            <span>תצוגה מקדימה של ההודעה:</span>
            <span className="text-[10px] bg-neutral-100 px-2 py-0.5 rounded text-neutral-600">
              {version === 'driver' ? 'מתאים לנהגי חכמת / עלי' : 'כולל דוח עלויות מלא ומע"מ'}
            </span>
          </div>

          <pre className="w-full p-4 bg-neutral-900 text-neutral-100 rounded-2xl text-xs font-mono whitespace-pre-wrap leading-relaxed border border-neutral-800 max-h-64 overflow-y-auto select-all">
            {messageText}
          </pre>
        </div>

        {/* Actions Footer */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-200 space-y-2">
          {webhookFeedback && (
            <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold rounded-xl text-center flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>{webhookFeedback}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2.5 bg-neutral-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'הועתק ללוח!' : 'העתק טקסט'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>פתח בוואטסאפ</span>
            </button>

            <button
              type="button"
              onClick={handleDispatchMake}
              disabled={isDispatchingWebhook}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isDispatchingWebhook ? 'משדר...' : 'שדר וובהוק לנהג'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
