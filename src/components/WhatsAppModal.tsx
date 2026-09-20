import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, UserCheck, Briefcase } from 'lucide-react';
import { ClientSite, PricingBreakdown, TruckConfig } from '../types';
import { generateWhatsAppMessage } from '../utils/pricing';

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
              <h3 className="font-bold text-base">העתקת כרטיס משימה לוואטסאפ</h3>
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
            <span>גרסת הנהלה / סדרן (כולל מחירים)</span>
          </button>
        </div>

        {/* Message Preview Box */}
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="text-[11px] font-semibold text-neutral-500 mb-1.5 flex items-center justify-between">
            <span>תצוגה מקדימה של ההודעה שתועתק:</span>
            <span className="text-[10px] bg-neutral-100 px-2 py-0.5 rounded text-neutral-600">
              {version === 'driver' ? 'מתאים לנהגי חכמת / עלי' : 'כולל דוח עלויות מלא ומע"מ'}
            </span>
          </div>

          <pre className="w-full p-4 bg-neutral-900 text-neutral-100 rounded-2xl text-xs font-mono whitespace-pre-wrap leading-relaxed border border-neutral-800 max-h-72 overflow-y-auto select-all">
            {messageText}
          </pre>
        </div>

        {/* Actions Footer */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-neutral-600 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
          >
            ביטול
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="px-5 py-2.5 bg-neutral-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'הועתק ללוח בהצלחה!' : 'העתק ללוח'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>שלח ישירות לוואטסאפ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
