import React, { useState, useMemo } from 'react';
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
  Gauge,
  Timer,
  Calendar,
  SlidersHorizontal,
} from 'lucide-react';
import { ClientSite, DeliveryRound, TruckConfig } from '../types';
import {
  optimizeStopsSequence,
  calculateRoundSavings,
  generateMultiStopWhatsAppMessage,
  calculateRoundTimeEstimation,
  formatMinutes,
  RoundTimeEstimation,
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
  const [activeTab, setActiveTab] = useState<'stops' | 'time' | 'lifo' | 'pricing'>('stops');

  // Transit Speed & Duration Estimation Parameters
  const [transitSpeedKmH, setTransitSpeedKmH] = useState<number>(42);
  const [stopOverheadMinutes, setStopOverheadMinutes] = useState<number>(8);
  const [depotPrepMinutes, setDepotPrepMinutes] = useState<number>(15);
  const [departureTime, setDepartureTime] = useState<string>('07:30');

  // Dynamic time estimation calculated from route distance, speed, and stops count
  const timeEstimation: RoundTimeEstimation | null = useMemo(() => {
    if (!deliveryRound || selectedStops.length === 0) return null;
    return calculateRoundTimeEstimation(
      deliveryRound,
      truck,
      transitSpeedKmH,
      stopOverheadMinutes,
      depotPrepMinutes,
      departureTime
    );
  }, [deliveryRound, selectedStops.length, truck, transitSpeedKmH, stopOverheadMinutes, depotPrepMinutes, departureTime]);

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

  // Set current time rounded to next 5 minutes
  const handleSetCurrentTime = () => {
    const now = new Date();
    const h = now.getHours();
    const m = Math.ceil(now.getMinutes() / 5) * 5;
    const normH = m >= 60 ? (h + 1) % 24 : h;
    const normM = m >= 60 ? 0 : m;
    setDepartureTime(`${String(normH).padStart(2, '0')}:${String(normM).padStart(2, '0')}`);
  };

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
      totalTravelMinutes: timeEstimation?.totalTransitMinutes ?? deliveryRound.totalTravelMinutes,
      totalUnloadMinutes: deliveryRound.totalUnloadMinutes,
      totalStopOverheadMinutes: timeEstimation?.totalStopOverheadMinutes ?? (selectedStops.length * stopOverheadMinutes),
      totalEstimatedRoundMinutes: timeEstimation?.totalRoundMinutes,
      totalEstimatedRoundFormatted: timeEstimation?.totalRoundFormatted,
      averageTransitSpeedKmH: transitSpeedKmH,
      departureTime: departureTime,
      estimatedReturnTime: timeEstimation?.estimatedReturnTime,
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
    const text = generateMultiStopWhatsAppMessage(
      deliveryRound,
      truck,
      fuelRateNis,
      timeEstimation || undefined
    );
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleOpenWhatsAppDirect = () => {
    if (!deliveryRound) return;
    const text = generateMultiStopWhatsAppMessage(
      deliveryRound,
      truck,
      fuelRateNis,
      timeEstimation || undefined
    );
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

      {/* Quick Summary Pill: Total Duration & Speed */}
      {timeEstimation && selectedStops.length > 0 && (
        <div className="px-4 py-2 bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 text-white border-t border-neutral-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-neutral-300 font-medium">משך סבב משוער:</span>
            <strong className="text-emerald-400 font-black text-sm">{timeEstimation.totalRoundFormatted}</strong>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => {
                const playBtn =
                  document.getElementById('playback-play-pause-btn') ||
                  document.getElementById('reopen-playback-btn');
                if (playBtn) playBtn.click();
              }}
              className="bg-amber-400 hover:bg-amber-300 text-neutral-950 font-black px-2.5 py-0.5 rounded-lg flex items-center gap-1 transition-transform hover:scale-105 cursor-pointer shadow-sm"
              title="הפעל או פתח סימולציית נסיעה חיה על גבי המפה"
            >
              <span>🚛 סימולציה במפה ▶</span>
            </button>
            <span className="bg-neutral-800 px-2 py-0.5 rounded text-neutral-200 font-bold border border-neutral-700">
              {timeEstimation.departureTime} ⟵ {timeEstimation.estimatedReturnTime}
            </span>
            <span className="bg-blue-900/80 text-blue-300 px-2 py-0.5 rounded font-bold border border-blue-700/60 hidden sm:inline">
              {timeEstimation.transitSpeedKmH} קמ"ש
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="px-3 py-2 bg-neutral-100 border-b border-neutral-200 flex gap-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('stops')}
          className={`py-1.5 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'stops'
              ? 'bg-white text-blue-700 shadow-sm border border-neutral-200'
              : 'text-neutral-600 hover:bg-neutral-200/60'
          }`}
        >
          <span>🎯 תחנות ({selectedStops.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('time')}
          className={`py-1.5 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'time'
              ? 'bg-blue-600 text-white font-black shadow-sm'
              : 'text-blue-900 bg-blue-50 hover:bg-blue-100/70 border border-blue-200/60'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>משך סבב ולו"ז</span>
          {timeEstimation && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
              activeTab === 'time' ? 'bg-white/20 text-white' : 'bg-blue-200 text-blue-950'
            }`}>
              {timeEstimation.totalRoundFormatted}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('lifo')}
          className={`py-1.5 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'lifo'
              ? 'bg-amber-500 text-neutral-950 font-black shadow-sm'
              : 'text-neutral-600 hover:bg-neutral-200/60'
          }`}
        >
          <span>🧱 LIFO</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pricing')}
          className={`py-1.5 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'pricing'
              ? 'bg-white text-emerald-700 shadow-sm border border-neutral-200'
              : 'text-neutral-600 hover:bg-neutral-200/60'
          }`}
        >
          <span>💰 עלויות</span>
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
                      <p className="text-[10px] text-neutral-500">החרש 10, אזה"ת נווה נאמן • יציאה: {timeEstimation?.departureTime || '07:30'}</p>
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
                  const legEst = timeEstimation?.legs.find((l) => l.stopIndex === stop.stopIndex);

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

                      {/* Leg Specs, Dynamic Travel Time & LIFO badge */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-neutral-100 text-[10px]">
                        <div className="flex items-center gap-1.5 text-neutral-500">
                          <span>
                            מרחק: <strong className="text-neutral-800">{stop.distanceFromPrevKm} ק"מ</strong>
                          </span>
                          <span>•</span>
                          <span>
                            נסיעה: <strong className="text-neutral-800">~{legEst?.travelMinutesFromPrev ?? stop.travelMinutesFromPrev} דק'</strong>
                          </span>
                          {legEst && (
                            <>
                              <span>•</span>
                              <span className="text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                                הגעה: {legEst.arrivalTime}
                              </span>
                            </>
                          )}
                        </div>

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
                      <div>
                        <span className="font-extrabold text-neutral-900">חזרה לבסיס סבן (סיום סבב)</span>
                        {timeEstimation && (
                          <p className="text-[10px] text-neutral-500">
                            מרחק: {timeEstimation.returnLegDistanceKm} ק"מ • הגעה משוערת: {timeEstimation.estimatedReturnTime}
                          </p>
                        )}
                      </div>
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

        {/* Tab 2: Duration Estimation & Schedule */}
        {activeTab === 'time' && (
          <div className="space-y-3.5">
            {!timeEstimation ? (
              <div className="p-8 text-center bg-neutral-50 rounded-2xl border border-neutral-200">
                <Clock className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                <p className="text-xs text-neutral-600 font-bold">
                  הוסף לפחות תחנה אחת כדי לחשב אומדן משך סבב ולוח זמנים.
                </p>
              </div>
            ) : (
              <>
                {/* 1. Total Duration Hero Banner & Breakdown */}
                <div className="p-4 bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 text-white rounded-2xl border border-neutral-800 shadow-md space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1.5">
                        <Timer className="w-3.5 h-3.5" />
                        אומדן משך סבב כולל (מקצה לקצה):
                      </span>
                      <h3 className="text-2xl font-black text-white mt-0.5 tracking-tight">
                        {timeEstimation.totalRoundFormatted}
                      </h3>
                    </div>

                    <div className="text-left">
                      <span className="text-[10px] text-neutral-400 block font-medium">חלון זמנים משוער:</span>
                      <div className="font-mono font-black text-sm text-amber-300 mt-0.5">
                        {timeEstimation.departureTime} ⟵ {timeEstimation.estimatedReturnTime}
                      </div>
                    </div>
                  </div>

                  {/* Visual Duration Distribution Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="h-3 w-full bg-neutral-800 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${Math.max(8, (timeEstimation.totalTransitMinutes / timeEstimation.totalRoundMinutes) * 100)}%` }}
                        className="bg-blue-500 h-full transition-all"
                        title={`נסיעה בדרכים: ${timeEstimation.totalTransitMinutes} דק'`}
                      />
                      <div
                        style={{ width: `${Math.max(8, (timeEstimation.totalUnloadMinutes / timeEstimation.totalRoundMinutes) * 100)}%` }}
                        className="bg-purple-500 h-full transition-all"
                        title={`זמן פריקה נטו: ${timeEstimation.totalUnloadMinutes} דק'`}
                      />
                      <div
                        style={{ width: `${Math.max(6, (timeEstimation.totalStopOverheadMinutes / timeEstimation.totalRoundMinutes) * 100)}%` }}
                        className="bg-amber-400 h-full transition-all"
                        title={`שערים ותמרון (${selectedStops.length} תחנות): ${timeEstimation.totalStopOverheadMinutes} דק'`}
                      />
                      <div
                        style={{ width: `${Math.max(4, (timeEstimation.depotPrepMinutes / timeEstimation.totalRoundMinutes) * 100)}%` }}
                        className="bg-emerald-400 h-full transition-all"
                        title={`העמסה במגרש: ${timeEstimation.depotPrepMinutes} דק'`}
                      />
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap items-center justify-between text-[10px] text-neutral-300 gap-1 pt-0.5">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        נסיעה: {timeEstimation.totalTransitMinutes} דק'
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        פריקה: {timeEstimation.totalUnloadMinutes} דק'
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        שערים ({selectedStops.length} תחנות): {timeEstimation.totalStopOverheadMinutes} דק'
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        העמסה: {timeEstimation.depotPrepMinutes} דק'
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Interactive Parameters: Speed, Stops Overhead & Departure Time */}
                <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-neutral-900 flex items-center gap-1.5">
                      <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                      התאמת פרמטרים וחישוב מהירות:
                    </span>
                    <span className="text-[10px] text-neutral-500 font-bold">
                      {selectedStops.length} תחנות בסבב
                    </span>
                  </div>

                  {/* 2.1 Average Transit Speed */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-neutral-700 flex items-center gap-1">
                        <Gauge className="w-3.5 h-3.5 text-blue-600" />
                        מהירות נסיעה ממוצעת:
                      </label>
                      <span className="font-mono font-black text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                        {transitSpeedKmH} קמ"ש
                      </span>
                    </div>

                    {/* Speed Presets */}
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setTransitSpeedKmH(30)}
                        className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                          transitSpeedKmH === 30
                            ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                            : 'bg-white hover:bg-blue-50 text-neutral-700 border-neutral-200'
                        }`}
                      >
                        🚗 פקקים / עירוני (30)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransitSpeedKmH(42)}
                        className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                          transitSpeedKmH === 42
                            ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                            : 'bg-white hover:bg-blue-50 text-neutral-700 border-neutral-200'
                        }`}
                      >
                        🚛 רגיל (42) ⭐
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransitSpeedKmH(55)}
                        className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                          transitSpeedKmH === 55
                            ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                            : 'bg-white hover:bg-blue-50 text-neutral-700 border-neutral-200'
                        }`}
                      >
                        🛣️ שוטף / מהיר (55)
                      </button>
                    </div>

                    {/* Fine-tune slider */}
                    <div className="pt-1 flex items-center gap-2">
                      <span className="text-[10px] text-neutral-400 font-mono">20</span>
                      <input
                        type="range"
                        min={20}
                        max={70}
                        step={1}
                        value={transitSpeedKmH}
                        onChange={(e) => setTransitSpeedKmH(Number(e.target.value))}
                        className="flex-1 accent-blue-600 cursor-pointer h-1.5 bg-neutral-200 rounded-lg"
                      />
                      <span className="text-[10px] text-neutral-400 font-mono">70</span>
                    </div>
                  </div>

                  {/* 2.2 Stop Overhead & Maneuvering Buffer */}
                  <div className="space-y-1.5 pt-2 border-t border-neutral-200/80">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-[11px] font-bold text-neutral-700 block">
                          זמן שער, בידוק ותמרון לכל תחנה:
                        </label>
                        <span className="text-[10px] text-neutral-500">
                          {selectedStops.length} תחנות × {stopOverheadMinutes} דק' = תוספת <strong>{timeEstimation.totalStopOverheadMinutes} דקות</strong> לסבב
                        </span>
                      </div>

                      {/* Options */}
                      <div className="flex items-center gap-1">
                        {[5, 8, 12, 15].map((mins) => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => setStopOverheadMinutes(mins)}
                            className={`px-2 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              stopOverheadMinutes === mins
                                ? 'bg-amber-500 text-neutral-950 border-amber-600 shadow-2xs'
                                : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                            }`}
                          >
                            {mins} דק'
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 2.3 Departure Time */}
                  <div className="space-y-1.5 pt-2 border-t border-neutral-200/80">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-neutral-700 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-neutral-600" />
                        שעת יציאה ממגרש סבן:
                      </label>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleSetCurrentTime}
                          className="px-2 py-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-[10px] font-bold rounded-lg cursor-pointer"
                        >
                          עכשיו
                        </button>
                        <input
                          type="time"
                          value={departureTime}
                          onChange={(e) => setDepartureTime(e.target.value)}
                          className="px-2 py-1 bg-white border border-neutral-300 rounded-lg text-xs font-mono font-bold outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Detailed Stop-by-Stop Turnaround Timeline */}
                <div className="space-y-2">
                  <span className="text-xs font-extrabold text-neutral-800 block">
                    לוח זמנים משוער לסבב (Schedule Timeline):
                  </span>

                  <div className="space-y-2 relative before:absolute before:top-3 before:bottom-3 before:right-3.5 before:w-0.5 before:bg-neutral-200">
                    {/* Departure from Saban Yard */}
                    <div className="relative flex items-start gap-2.5 p-2.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs">
                      <span className="w-7 h-7 rounded-full bg-neutral-900 text-amber-400 flex items-center justify-center font-black text-xs shrink-0 z-10 shadow-2xs">
                        🏗️
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-neutral-900">מוצא: מגרש סבן (הוד השרון)</span>
                          <span className="font-mono font-extrabold text-neutral-800 bg-white px-1.5 py-0.5 rounded border border-neutral-200 text-[11px]">
                            {timeEstimation.departureTime}
                          </span>
                        </div>
                        <p className="text-[10px] text-neutral-500 mt-0.5">
                          העמסה וקשירת מטען במגרש ({timeEstimation.depotPrepMinutes} דק') • יציאה לדרך
                        </p>
                      </div>
                    </div>

                    {/* Each Stop in order */}
                    {timeEstimation.legs.map((leg) => (
                      <div
                        key={`leg-${leg.stopIndex}`}
                        className="relative flex items-start gap-2.5 p-2.5 bg-white rounded-xl border border-neutral-200 shadow-2xs text-xs hover:border-blue-300 transition-all"
                      >
                        <span className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0 z-10 shadow-2xs">
                          {leg.stopIndex}
                        </span>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-neutral-900">{leg.clientName}</span>
                            <div className="flex items-center gap-1 font-mono text-[11px]">
                              <span className="text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                                הגעה: {leg.arrivalTime}
                              </span>
                              <span className="text-neutral-400">⟵</span>
                              <span className="text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded">
                                יציאה: {leg.departureTime}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-neutral-500 pt-0.5 border-t border-neutral-100">
                            <span>
                              נסיעה מהתחנה הקודמת: <strong className="text-neutral-700">{leg.distanceFromPrevKm} ק"מ (~{leg.travelMinutesFromPrev} דק')</strong>
                            </span>
                            <span className="text-amber-900 bg-amber-50 px-1.5 py-0.2 rounded font-medium">
                              שהייה באתר: {leg.totalStopMinutes} דק' ({leg.unloadMinutes} דק' פריקה + {leg.maneuveringMinutes} דק' שער)
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Return to Depot */}
                    <div className="relative flex items-start gap-2.5 p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-200 text-xs">
                      <span className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center font-black text-xs shrink-0 z-10 shadow-2xs">
                        🏁
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-emerald-950">חזרה לבסיס סבן (סיום סבב מלא)</span>
                          <span className="font-mono font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                            {timeEstimation.estimatedReturnTime}
                          </span>
                        </div>
                        <p className="text-[10px] text-emerald-800 mt-0.5">
                          קטע חזרה: {timeEstimation.returnLegDistanceKm} ק"מ (~{timeEstimation.returnLegTravelMinutes} דק' נסיעה)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab 3: LIFO Loading Assistant */}
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

        {/* Tab 4: Aggregate Round Pricing & Fuel Breakdown */}
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
                  ~{timeEstimation?.totalTransitMinutes ?? deliveryRound.totalTravelMinutes} דק'
                </span>
                <span className="text-[9px] text-neutral-400 block font-mono">({transitSpeedKmH} קמ"ש)</span>
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
