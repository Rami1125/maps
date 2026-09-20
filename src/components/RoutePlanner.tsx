import React, { useState } from 'react';
import {
  X,
  ArrowUpDown,
  Trash2,
  Plus,
  Send,
  Sparkles,
  Truck,
  Fuel,
  Clock,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  TrendingDown,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { ClientSite, DeliveryRound, TruckConfig } from '../types';
import {
  optimizeStopsSequence,
  calculateRoundSavings,
  generateMultiStopWhatsAppMessage,
} from '../utils/routePlanner';
import { dispatchToMakeWebhook } from '../services/sheetsService';

interface RoutePlannerProps {
  allClients: ClientSite[];
  selectedStops: ClientSite[];
  deliveryRound: DeliveryRound | null;
  truck: TruckConfig;
  fuelRateNis: number;
  onAddStop: (client: ClientSite) => void;
  onRemoveStop: (clientId: string) => void;
  onReorderStops: (newStops: ClientSite[]) => void;
  onClearAllStops: () => void;
  onClose: () => void;
}

export const RoutePlanner: React.FC<RoutePlannerProps> = ({
  allClients,
  selectedStops,
  deliveryRound,
  truck,
  fuelRateNis,
  onAddStop,
  onRemoveStop,
  onReorderStops,
  onClearAllStops,
  onClose,
}) => {
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'stops' | 'lifo' | 'pricing'>('stops');

  // Filter clients not yet in route
  const availableClients = allClients.filter(
    (c) => !selectedStops.some((s) => s.id === c.id) &&
      (c.name.includes(searchFilter) || c.city.includes(searchFilter) || c.address.includes(searchFilter) || c.comaxId.includes(searchFilter))
  );

  // Move stop up or down in sequence
  const handleMoveStop = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedStops.length) return;

    const updated = [...selectedStops];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    onReorderStops(updated);
  };

  // 1-Click Nearest-Neighbor optimization
  const handleOptimizeRoute = () => {
    const optimized = optimizeStopsSequence(selectedStops);
    onReorderStops(optimized);
  };

  // Calculate savings vs separate trips
  const savings = deliveryRound
    ? calculateRoundSavings(selectedStops, deliveryRound, truck, fuelRateNis)
    : { savedKm: 0, savedFuelNis: 0, percentSaved: 0 };

  // Dispatch to Make.com Webhook + WhatsApp
  const handleDispatchRound = async () => {
    if (!deliveryRound || selectedStops.length === 0) return;

    setIsDispatching(true);
    setDispatchStatus('משדר סבב ל-Make.com...');

    const payload = {
      dispatchType: 'multi_stop_round',
      roundId: deliveryRound.id,
      truckName: truck.name,
      driverName: truck.driverName,
      totalStops: deliveryRound.stops.length,
      totalCircuitKm: deliveryRound.totalCircuitDistanceKm,
      totalTravelMinutes: deliveryRound.totalTravelMinutes,
      totalUnloadMinutes: deliveryRound.totalUnloadMinutes,
      stops: deliveryRound.stops.map((s) => ({
        stopIndex: s.stopIndex,
        clientName: s.client.name,
        comaxId: s.client.comaxId,
        address: s.client.address,
        city: s.client.city,
        contactPhone: s.client.contactPhone,
        loadingOrder: s.loadingOrder,
        loadingPosition: s.loadingPositionDescription,
        wazeUrl: `https://waze.com/ul?ll=${s.client.lat},${s.client.lng}&navigate=yes`,
      })),
      totalPriceWithVat: deliveryRound.totalPriceWithVat,
    };

    const res = await dispatchToMakeWebhook(payload);
    setIsDispatching(false);
    setDispatchStatus(res.message);

    setTimeout(() => {
      setDispatchStatus(null);
    }, 4500);
  };

  const handleCopyWhatsAppText = () => {
    if (!deliveryRound) return;
    const text = generateMultiStopWhatsAppMessage(deliveryRound, truck, fuelRateNis);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleOpenWhatsAppDirect = () => {
    if (!deliveryRound) return;
    const text = generateMultiStopWhatsAppMessage(deliveryRound, truck, fuelRateNis);
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="w-full max-w-md md:max-w-lg bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[85vh] pointer-events-auto transition-all animate-in fade-in slide-in-from-top-4 duration-300">
      {/* Header */}
      <div className="px-5 py-3.5 bg-neutral-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm font-bold text-base">
            🗺️
          </div>
          <div>
            <h3 className="font-extrabold text-sm md:text-base leading-tight">
              תכנון סבב חלוקה רב-יעדי (2-5 תחנות)
            </h3>
            <p className="text-[11px] text-blue-300">
              {truck.name} • {selectedStops.length} יעדים נבחרו (מקסימום 5)
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

      {/* Tabs */}
      <div className="px-4 py-2 bg-neutral-100 border-b border-neutral-200 flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('stops')}
          className={`flex-1 py-1.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'stops'
              ? 'bg-white text-blue-700 shadow-sm border border-neutral-200'
              : 'text-neutral-600 hover:bg-neutral-200/60'
          }`}
        >
          <span>🎯 תחנות במסלול ({selectedStops.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('lifo')}
          className={`flex-1 py-1.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'lifo'
              ? 'bg-amber-500 text-neutral-950 font-black shadow-sm'
              : 'text-neutral-600 hover:bg-neutral-200/60'
          }`}
        >
          <span>🧱 סדר העמסה LIFO</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pricing')}
          className={`flex-1 py-1.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'pricing'
              ? 'bg-white text-emerald-700 shadow-sm border border-neutral-200'
              : 'text-neutral-600 hover:bg-neutral-200/60'
          }`}
        >
          <span>💰 עלויות ורווחיות</span>
        </button>
      </div>

      {/* Body Content */}
      <div className="p-4 flex-1 overflow-y-auto space-y-3.5">
        {/* Tab 1: Stops Management */}
        {activeTab === 'stops' && (
          <div className="space-y-3">
            {/* Quick Actions Bar */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-neutral-700">
                סדר פריקה מהמגרש:
              </span>

              <div className="flex items-center gap-2">
                {selectedStops.length >= 2 && (
                  <button
                    type="button"
                    onClick={handleOptimizeRoute}
                    className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold rounded-lg flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                    title="ממיין תחנות לפי אלגוריתם המסלול הקצר ביותר מהמגרש"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>אופטימיזציה חכמה</span>
                  </button>
                )}

                {selectedStops.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearAllStops}
                    className="px-2 py-1 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    נקה הכל
                  </button>
                )}
              </div>
            </div>

            {/* Stops List */}
            {selectedStops.length === 0 ? (
              <div className="p-8 text-center bg-neutral-50 rounded-2xl border-2 border-dashed border-neutral-200">
                <Truck className="w-10 h-10 text-neutral-400 mx-auto mb-2 opacity-50" />
                <h4 className="font-bold text-sm text-neutral-800">
                  טרם נבחרו תחנות לסבב
                </h4>
                <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
                  לחץ על סיכות במפה או השתמש בכפתור ״הוסף יעד לסבב״ מטה לבניית מסלול בין 2 ל-5 תחנות.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Depot Starting Point */}
                <div className="p-2.5 bg-neutral-100 rounded-xl border border-neutral-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-neutral-900 text-amber-400 flex items-center justify-center font-black text-xs">
                      🏗️
                    </span>
                    <div>
                      <span className="font-extrabold text-neutral-900">מוצא: מגרש סבן (הוד השרון)</span>
                      <p className="text-[10px] text-neutral-500">החרש 10, אזה"ת נווה נאמן</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-neutral-600 bg-white px-2 py-0.5 rounded border border-neutral-200">
                    נקודת יציאה
                  </span>
                </div>

                {/* Ordered Stops */}
                {deliveryRound?.stops.map((stop, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === selectedStops.length - 1;

                  return (
                    <div
                      key={stop.id}
                      className="p-3 bg-white rounded-2xl border border-neutral-200 shadow-2xs hover:border-blue-300 transition-all space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-sm">
                            {stop.stopIndex}
                          </span>
                          <div>
                            <h4 className="font-extrabold text-xs text-neutral-900 leading-tight">
                              {stop.client.name}
                            </h4>
                            <p className="text-[11px] text-neutral-500">
                              {stop.client.address}, {stop.client.city} ({stop.client.district})
                            </p>
                          </div>
                        </div>

                        {/* Reorder and Delete controls */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={isFirst}
                            onClick={() => handleMoveStop(idx, 'up')}
                            className="p-1 rounded text-neutral-400 hover:text-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="הזז קדימה בסדר הפריקה"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            disabled={isLast}
                            onClick={() => handleMoveStop(idx, 'down')}
                            className="p-1 rounded text-neutral-400 hover:text-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="הזז אחורה בסדר הפריקה"
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveStop(stop.client.id)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="הסר יעד זה"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Leg Specs & LIFO badge */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-neutral-100 text-[10px]">
                        <span className="text-neutral-500">
                          מרחק מהתחנה הקודמת: <strong className="text-neutral-800">{stop.distanceFromPrevKm} ק"מ</strong> (~{stop.travelMinutesFromPrev} דק')
                        </span>

                        <span className="bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded text-[9px]">
                          LIFO העמסה #{stop.loadingOrder}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Return to depot leg */}
                {selectedStops.length > 0 && (
                  <div className="p-2.5 bg-neutral-100 rounded-xl border border-neutral-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-neutral-900 text-emerald-400 flex items-center justify-center font-black text-xs">
                        🏁
                      </span>
                      <span className="font-extrabold text-neutral-900">חזרה לבסיס סבן (סיום סבב)</span>
                    </div>
                    <span className="text-[10px] font-bold text-neutral-600 bg-white px-2 py-0.5 rounded border border-neutral-200">
                      סגירת מעגל
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Add Stop Button / Search Trigger */}
            {selectedStops.length < 5 && (
              <div>
                {!isSearchingClient ? (
                  <button
                    type="button"
                    onClick={() => setIsSearchingClient(true)}
                    className="w-full py-2.5 bg-blue-50 hover:bg-blue-100/80 text-blue-700 border border-blue-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>הוסף יעד נוסף לסבב ({selectedStops.length}/5)</span>
                  </button>
                ) : (
                  <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-300 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-800">בחר יעד ממאגר הלקוחות:</span>
                      <button
                        type="button"
                        onClick={() => setIsSearchingClient(false)}
                        className="text-neutral-400 hover:text-neutral-700 text-xs"
                      >
                        סגור
                      </button>
                    </div>

                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="חפש לפי שם, עיר, כתובת או קוד קומקס..."
                      className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs outline-none focus:border-blue-500"
                    />

                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {availableClients.slice(0, 10).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            onAddStop(c);
                            setIsSearchingClient(false);
                            setSearchFilter('');
                          }}
                          className="w-full text-right p-2 rounded-lg bg-white hover:bg-blue-50 border border-neutral-200 text-xs flex items-center justify-between cursor-pointer"
                        >
                          <div>
                            <div className="font-bold text-neutral-900">{c.name}</div>
                            <div className="text-[10px] text-neutral-500">{c.address}, {c.city}</div>
                          </div>
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            + הוסף
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: LIFO Loading Assistant */}
        {activeTab === 'lifo' && deliveryRound && (
          <div className="space-y-3.5">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-amber-900 font-extrabold">
                <Info className="w-4 h-4 text-amber-700" />
                <span>עקרון LIFO להעמסה במגרש סבן (Last-In First-Out):</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                כדי למנוע הזזת משטחים והפרעות בזמן פריקה באתרים: <strong>היעד הראשון לפריקה נטען אחרון למשאית (בקצה האחורי)</strong>. היעד האחרון לפריקה נטען ראשון עמוק בצמוד לקבינה!
              </p>
            </div>

            {/* Truck Bed Visual Diagram */}
            <div className="p-3.5 bg-neutral-900 rounded-2xl text-white space-y-2.5">
              <div className="text-[11px] font-bold text-neutral-400 flex items-center justify-between">
                <span>תרשים ארגז המשאית ({truck.vehicleModel}):</span>
                <span className="text-amber-400">חזית [קבינה] ⟵ תא מטען ⟵ קצה אחורי</span>
              </div>

              {/* Graphical representation */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-center text-xs">
                {/* Cabin end */}
                <div className="p-2.5 rounded-xl bg-neutral-800 border border-neutral-700">
                  <div className="text-[10px] font-bold text-neutral-400 mb-1">
                    🚛 חזית הארגז (עמוק בפנים)
                  </div>
                  <div className="font-extrabold text-white text-xs truncate">
                    {deliveryRound.stops[deliveryRound.stops.length - 1]?.client.name || 'ריק'}
                  </div>
                  <div className="text-[9px] text-amber-300 font-bold mt-1">
                    נטען #1 במגרש (נפרק אחרון)
                  </div>
                </div>

                {/* Middle */}
                <div className="p-2.5 rounded-xl bg-neutral-800 border border-neutral-700">
                  <div className="text-[10px] font-bold text-neutral-400 mb-1">
                    📦 מרכז משטח המשאית
                  </div>
                  <div className="font-extrabold text-white text-xs truncate">
                    {deliveryRound.stops.length > 2
                      ? deliveryRound.stops[1]?.client.name
                      : 'מעבר פתוח'}
                  </div>
                  <div className="text-[9px] text-blue-300 font-bold mt-1">
                    נטען בשלבי הביניים
                  </div>
                </div>

                {/* Tailgate end */}
                <div className="p-2.5 rounded-xl bg-blue-900/60 border-2 border-blue-400">
                  <div className="text-[10px] font-bold text-blue-200 mb-1">
                    🚪 קצה אחורי / דלתות פריקה
                  </div>
                  <div className="font-black text-amber-400 text-xs truncate">
                    {deliveryRound.stops[0]?.client.name || 'ריק'}
                  </div>
                  <div className="text-[9px] text-emerald-300 font-black mt-1">
                    נטען אחרון (נפרק ראשון!)
                  </div>
                </div>
              </div>
            </div>

            {/* Sequence list for yard workers */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-neutral-700">
                שלבי העמסה למלגזן במגרש (לפי סדר ביצוע):
              </span>

              {[...deliveryRound.stops]
                .sort((a, b) => a.loadingOrder - b.loadingOrder)
                .map((s) => (
                  <div
                    key={`lifo-${s.id}`}
                    className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-amber-500 text-neutral-950 flex items-center justify-center font-black text-xs shadow-xs">
                        {s.loadingOrder}
                      </span>
                      <div>
                        <div className="font-extrabold text-neutral-900">{s.client.name}</div>
                        <div className="text-[10px] text-neutral-500">{s.loadingPositionDescription}</div>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      תחנת פריקה #{s.stopIndex}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Tab 3: Aggregate Round Pricing & Fuel Breakdown */}
        {activeTab === 'pricing' && deliveryRound && (
          <div className="space-y-3.5">
            {/* Savings Banner */}
            {savings.savedKm > 0 && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs flex items-center gap-2 text-emerald-900">
                <TrendingDown className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-extrabold text-emerald-950">
                    חיסכון אופרטיבי בסבב: {savings.savedKm} ק"מ ({savings.percentSaved}% חיסכון)!
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    חסכת כ-₪{savings.savedFuelNis} בסולר בהשוואה לנסיעות הלוך-חזור נפרדות לכל לקוח.
                  </p>
                </div>
              </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200 text-center">
                <span className="text-[10px] text-neutral-500 font-bold block">סה"כ מרחק מעגל</span>
                <span className="text-base font-extrabold text-neutral-900">
                  {deliveryRound.totalCircuitDistanceKm} ק"מ
                </span>
              </div>

              <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200 text-center">
                <span className="text-[10px] text-neutral-500 font-bold block">זמן נסיעה משוער</span>
                <span className="text-base font-extrabold text-neutral-900">
                  ~{deliveryRound.totalTravelMinutes} דק'
                </span>
              </div>

              <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200 text-center">
                <span className="text-[10px] text-neutral-500 font-bold block">סולר נסיעה</span>
                <span className="text-base font-extrabold text-neutral-900">
                  ₪{deliveryRound.totalDieselCostNis}
                </span>
              </div>

              <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200 text-center">
                <span className="text-[10px] text-neutral-500 font-bold block">סולר מנוף PTO</span>
                <span className="text-base font-extrabold text-neutral-900">
                  ₪{deliveryRound.totalPtoCostNis}
                </span>
              </div>
            </div>

            {/* Direct Cost vs Billing Price Card */}
            <div className="p-4 bg-gradient-to-br from-neutral-900 to-neutral-950 text-white rounded-2xl border border-neutral-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>סך עלות שינוע ישירה (דלק בלבד):</span>
                <strong className="text-white">₪{deliveryRound.totalDirectCostNis}</strong>
              </div>

              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>מחיר מחירון מומלץ לסבב (לפני מע"מ):</span>
                <strong className="text-amber-400 font-extrabold text-sm">
                  ₪{deliveryRound.totalPriceBeforeVat.toLocaleString()}
                </strong>
              </div>

              <div className="flex items-center justify-between text-xs text-neutral-400 border-t border-neutral-800 pt-2">
                <span>מע"מ 18%:</span>
                <span>₪{deliveryRound.totalVatAmountNis.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between text-sm font-black border-t border-neutral-700 pt-2 text-white">
                <span className="text-emerald-400">סה"כ חיוב כולל מע"מ:</span>
                <span className="text-lg text-emerald-400 font-black">
                  ₪{deliveryRound.totalPriceWithVat.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="p-4 bg-neutral-50 border-t border-neutral-200 space-y-2">
        {dispatchStatus && (
          <div className="p-2 bg-blue-50 text-blue-900 font-bold text-xs rounded-lg text-center animate-in fade-in">
            {dispatchStatus}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleCopyWhatsAppText}
            disabled={!deliveryRound || selectedStops.length === 0}
            className="px-3 py-2 bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'הועתק!' : 'העתק דוח סבב'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenWhatsAppDirect}
            disabled={!deliveryRound || selectedStops.length === 0}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <ExternalLink className="w-4 h-4" />
            <span>וואטסאפ לנהג</span>
          </button>

          <button
            type="button"
            onClick={handleDispatchRound}
            disabled={isDispatching || !deliveryRound || selectedStops.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isDispatching ? 'משדר...' : 'שדר סבב ל-Make.com'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
