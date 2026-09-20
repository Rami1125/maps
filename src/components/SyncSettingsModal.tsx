import React, { useState } from 'react';
import {
  X,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  ExternalLink,
  Send,
  Sliders,
  Database,
  Link,
  Layers,
} from 'lucide-react';
import { GOOGLE_SHEET_ID, SHEET_TAB_NAME, MAKE_WEBHOOK_URL, SyncStatus, dispatchToMakeWebhook } from '../services/sheetsService';

interface SyncSettingsModalProps {
  syncStatus: SyncStatus;
  customScriptUrl: string;
  onUpdateScriptUrl: (url: string) => void;
  onRefreshFromSheets: () => void;
  isLoading: boolean;
  onClose: () => void;
}

export const SyncSettingsModal: React.FC<SyncSettingsModalProps> = ({
  syncStatus,
  customScriptUrl,
  onUpdateScriptUrl,
  onRefreshFromSheets,
  isLoading,
  onClose,
}) => {
  const [scriptInput, setScriptInput] = useState(customScriptUrl);
  const [testWebhookStatus, setTestWebhookStatus] = useState<string | null>(null);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);

  const handleSaveAndSync = () => {
    onUpdateScriptUrl(scriptInput);
    onRefreshFromSheets();
  };

  const handleTestMake = async () => {
    setIsTestingWebhook(true);
    setTestWebhookStatus('משדר בדיקת תקשורת ל-Make.com...');

    const res = await dispatchToMakeWebhook({
      dispatchType: 'ping_test',
      message: 'בדיקת תקשורת ממערכת סבן SabanOS Live Dispatch v2.0',
      timestamp: new Date().toISOString(),
    });

    setIsTestingWebhook(false);
    setTestWebhookStatus(res.message);
    setTimeout(() => setTestWebhookStatus(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm pointer-events-auto">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
              ⚙️
            </div>
            <div>
              <h3 className="font-extrabold text-base">סנכרון נתונים ואינטגרציות</h3>
              <p className="text-xs text-neutral-400">
                Google Sheets • Make.com • וובהוק נהגים
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

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          {/* Status Box */}
          <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-500">סטטוס מאגר לקוחות פעיל:</span>
              <span
                className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] ${
                  syncStatus.isLive
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'bg-blue-100 text-blue-900'
                }`}
              >
                {syncStatus.isLive ? '🟢 סנכרון חי פעיל' : '📦 63 לקוחות היסטוריים טעונים'}
              </span>
            </div>

            <div className="text-neutral-700 leading-relaxed font-medium">
              {syncStatus.message}
            </div>

            <div className="text-[11px] text-neutral-400">
              עדכון אחרון: {syncStatus.syncedAt.toLocaleTimeString('he-IL')} • {syncStatus.count} יעדים זמינים במפה
            </div>
          </div>

          {/* Google Sheets Config */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span>Google Sheet מקושר:</span>
              </div>
              <a
                href={`https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-emerald-800 hover:underline flex items-center gap-1 font-bold"
              >
                <span>פתח גיליון</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-emerald-200 space-y-1 text-[11px]">
              <div className="flex justify-between text-neutral-600">
                <span>מזהה גיליון (ID):</span>
                <span className="font-mono text-neutral-900 select-all font-bold">
                  {GOOGLE_SHEET_ID.slice(0, 15)}...
                </span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>טאב יעדים וזמני פריקה:</span>
                <span className="font-bold text-neutral-900">{SHEET_TAB_NAME}</span>
              </div>
            </div>

            {/* Custom Google Apps Script Endpoint input */}
            <div>
              <label className="text-[11px] font-bold text-emerald-950 block mb-1">
                כתובת Google Apps Script Web App (אופציונלי עבור גיליון פרטי):
              </label>
              <input
                type="url"
                value={scriptInput}
                onChange={(e) => setScriptInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs font-mono outline-none focus:border-emerald-600"
              />
              <p className="text-[10px] text-neutral-500 mt-1">
                אם הגיליון פרטי, הטמעת סקריפט Web App מאפשרת סנכרון דו-כיווני מאובטח.
              </p>
            </div>
          </div>

          {/* Make.com Webhook Config */}
          <div className="p-3.5 bg-neutral-900 text-white rounded-2xl border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-amber-400">
                <span>⚡ Make.com Webhook:</span>
              </div>
              <span className="text-[10px] bg-neutral-800 px-2 py-0.5 rounded text-neutral-300 font-mono">
                EU1 Cluster
              </span>
            </div>

            <div className="bg-neutral-800/80 p-2 rounded-xl text-[10px] font-mono text-neutral-300 break-all select-all">
              {MAKE_WEBHOOK_URL}
            </div>

            {testWebhookStatus && (
              <div className="p-2 bg-blue-900/60 border border-blue-500 text-blue-200 text-xs font-bold rounded-lg text-center">
                {testWebhookStatus}
              </div>
            )}

            <button
              type="button"
              onClick={handleTestMake}
              disabled={isTestingWebhook}
              className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5 text-amber-400" />
              <span>{isTestingWebhook ? 'בודק...' : 'בדיקת פינג ל-Make.com'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
          >
            סגור
          </button>

          <button
            type="button"
            onClick={handleSaveAndSync}
            disabled={isLoading}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'מסנכרן כעת...' : 'שמור וסנכרן עכשיו'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
