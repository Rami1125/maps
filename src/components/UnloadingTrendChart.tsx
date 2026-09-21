import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Clock,
  TrendingDown,
  TrendingUp,
  Minus,
  Truck,
  Gauge,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Filter,
  Search,
  ChevronRight,
  Info,
  Layers,
} from 'lucide-react';
import { ClientSite, DashboardOrder } from '../types';
import { getClientHistoricalTrend, ClientHistoricalDelivery } from '../utils/clientHistory';
import { ClientOrdersAccordion } from './ClientOrdersAccordion';

interface UnloadingTrendChartProps {
  clients: ClientSite[];
  selectedClientId?: string;
  onSelectClient?: (client: ClientSite) => void;
  onOpenDeliveryNote?: (client: ClientSite, order?: DashboardOrder) => void;
}

export const UnloadingTrendChart: React.FC<UnloadingTrendChartProps> = ({
  clients,
  selectedClientId,
  onSelectClient,
  onOpenDeliveryNote,
}) => {
  const [activeClientId, setActiveClientId] = useState<string>(
    selectedClientId || clients[0]?.id || ''
  );
  const [filterTruck, setFilterTruck] = useState<'all' | 'crane' | 'flatbed'>('all');
  const [clientSearch, setClientSearch] = useState('');

  // Update active client if prop changes
  React.useEffect(() => {
    if (selectedClientId && selectedClientId !== activeClientId) {
      setActiveClientId(selectedClientId);
    }
  }, [selectedClientId]);

  const activeClient = useMemo(() => {
    return clients.find((c) => c.id === activeClientId) || clients[0];
  }, [clients, activeClientId]);

  const trendData = useMemo(() => {
    if (!activeClient) return null;
    return getClientHistoricalTrend(activeClient);
  }, [activeClient]);

  // Chart data points formatted for Recharts
  const chartData = useMemo(() => {
    if (!trendData) return [];
    return trendData.history.map((h) => ({
      displayDate: h.displayDate,
      date: h.date,
      month: h.month,
      truckId: h.truckId,
      truckName: h.truckName,
      driverName: h.driverName,
      unloadMinutes: h.unloadMinutes,
      ptoMinutes: h.ptoActiveMinutes,
      baseline: h.baselineMinutes,
      variance: h.varianceMinutes,
      fieldEvent: h.fieldEvent,
      // Split for multi-line visual if desired
      craneMinutes: h.truckId === 'crane' ? h.unloadMinutes : null,
      flatbedMinutes: h.truckId === 'flatbed' ? h.unloadMinutes : null,
    }));
  }, [trendData]);

  const filteredHistory = useMemo(() => {
    if (!trendData) return [];
    if (filterTruck === 'all') return trendData.history;
    return trendData.history.filter((h) => h.truckId === filterTruck);
  }, [trendData, filterTruck]);

  // Client dropdown list filtered by search
  const filteredClientOptions = useMemo(() => {
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.comaxId.includes(clientSearch) ||
        c.city.toLowerCase().includes(clientSearch.toLowerCase())
    );
  }, [clients, clientSearch]);

  const handleSelectClientInternal = (c: ClientSite) => {
    setActiveClientId(c.id);
    if (onSelectClient) {
      onSelectClient(c);
    }
  };

  if (!activeClient || !trendData) {
    return (
      <div className="p-8 text-center text-neutral-500">
        לא נמצאו נתוני היסטוריה עבור הלקוח המבוקש
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Client Selection & Status Banner */}
      <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Client Selector Dropdown */}
        <div className="flex-1 w-full md:w-auto">
          <label className="block text-xs font-bold text-neutral-500 mb-1">
            בחר יעד / לקוח לניתוח מגמת זמני פריקה (אוגוסט - ספטמבר):
          </label>
          <div className="flex items-center gap-2">
            <select
              value={activeClientId}
              onChange={(e) => {
                const target = clients.find((c) => c.id === e.target.value);
                if (target) handleSelectClientInternal(target);
              }}
              className="flex-1 bg-white px-3 py-2 rounded-xl border border-neutral-300 font-extrabold text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-amber-400 shadow-2xs"
            >
              {filteredClientOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (#{c.comaxId}) - {c.city} [{c.district}]
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Truck / Driver View Mode Filter */}
        <div className="flex items-center gap-1.5 bg-neutral-200/70 p-1 rounded-xl text-xs font-bold w-full md:w-auto justify-center">
          <button
            type="button"
            onClick={() => setFilterTruck('all')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filterTruck === 'all'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-700 hover:text-neutral-950'
            }`}
          >
            כל הפריקות (הצלבה)
          </button>
          <button
            type="button"
            onClick={() => setFilterTruck('crane')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
              filterTruck === 'crane'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-neutral-700 hover:text-blue-900'
            }`}
          >
            <span>חכמת (מנוף 12T)</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterTruck('flatbed')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
              filterTruck === 'flatbed'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-neutral-700 hover:text-amber-900'
            }`}
          >
            <span>עלי (פלטה 5.5T)</span>
          </button>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. Avg Crane Minutes */}
        <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-blue-900">
            <span>ממוצע מנוף PTO</span>
            <span className="bg-blue-200 text-blue-900 px-1.5 py-0.2 rounded font-mono font-bold text-[10px]">
              עמודה I
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-black text-blue-900 font-mono">
              {trendData.avgCraneMinutes}
            </span>
            <span className="text-xs text-blue-700 font-bold">דקות</span>
          </div>
          <div className="text-[10px] text-blue-600 mt-0.5">
            חכמת • 4 פריקות מתועדות
          </div>
        </div>

        {/* 2. Avg Flatbed Minutes */}
        <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
            <span>ממוצע פריקה ידנית</span>
            <span className="bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-mono font-bold text-[10px]">
              עמודה J
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-black text-amber-900 font-mono">
              {trendData.avgFlatbedMinutes}
            </span>
            <span className="text-xs text-amber-700 font-bold">דקות</span>
          </div>
          <div className="text-[10px] text-amber-600 mt-0.5">
            עלי • 4 פריקות מתועדות
          </div>
        </div>

        {/* 3. Range Min - Max */}
        <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 shadow-2xs">
          <div className="text-[11px] font-bold text-neutral-500">
            טווח פריקה (קיצון)
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-black text-neutral-800 font-mono">
              {trendData.minMinutes} - {trendData.maxMinutes}
            </span>
            <span className="text-xs text-neutral-500 font-bold">דקות</span>
          </div>
          <div className="text-[10px] text-neutral-500 mt-0.5">
            הפרש מקסימלי: {trendData.maxMinutes - trendData.minMinutes} דק׳
          </div>
        </div>

        {/* 4. Trend Direction */}
        <div className={`p-3.5 rounded-2xl border shadow-2xs ${
          trendData.trendDirection === 'improving'
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
            : trendData.trendDirection === 'delayed'
            ? 'bg-rose-50/80 border-rose-200 text-rose-950'
            : 'bg-neutral-50 border-neutral-200 text-neutral-800'
        }`}>
          <div className="text-[11px] font-bold opacity-80">
            מגמת יעילות (אוג׳ ⟷ ספט׳)
          </div>
          <div className="mt-1 flex items-center gap-1.5 font-black text-sm">
            {trendData.trendDirection === 'improving' ? (
              <>
                <TrendingDown className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>שיפור של {trendData.trendPercent}%</span>
              </>
            ) : trendData.trendDirection === 'delayed' ? (
              <>
                <TrendingUp className="w-4 h-4 text-rose-600 shrink-0" />
                <span>עלייה של {trendData.trendPercent}%</span>
              </>
            ) : (
              <>
                <Minus className="w-4 h-4 text-neutral-500 shrink-0" />
                <span>יציב (ללא סטייה)</span>
              </>
            )}
          </div>
          <div className="text-[10px] opacity-75 mt-0.5">
            {trendData.trendDirection === 'improving'
              ? 'זמני פריקה התקצרו בספטמבר'
              : trendData.trendDirection === 'delayed'
              ? 'עומס באתר האריך את השהייה'
              : 'זמני פריקה עקביים בשני החודשים'}
          </div>
        </div>
      </div>

      {/* Main Interactive Chart */}
      <div className="p-5 bg-white rounded-3xl border border-neutral-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
          <div>
            <h3 className="font-black text-sm md:text-base text-neutral-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>גרף מגמת זמני פריקה בפועל: {activeClient.name}</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              דוחות איתוראן שבועיים מאוגוסט וספטמבר 2026 • מרצדס 12T (חכמת) מול איסוזו 5.5T (עלי)
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-blue-800">
              <span className="w-3 h-3 rounded-full bg-blue-600 inline-block"></span>
              <span>מרצדס מנוף PTO</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold text-amber-800">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
              <span>איסוזו פריקה ידנית</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold text-emerald-700">
              <span className="w-3 h-0.5 bg-emerald-500 inline-block border border-dashed"></span>
              <span>תקן מכויל</span>
            </div>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="h-72 w-full pt-2 dir-ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <defs>
                <linearGradient id="colorCrane" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorFlatbed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />

              <XAxis
                dataKey="displayDate"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />

              <YAxis
                stroke="#64748b"
                fontSize={11}
                unit=" דק׳"
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                domain={['auto', 'auto']}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as (typeof chartData)[0];
                    const isCrane = data.truckId === 'crane';

                    return (
                      <div className="bg-neutral-900 text-white p-3 rounded-2xl shadow-xl border border-neutral-700 text-xs space-y-1.5 max-w-xs dir-rtl text-right">
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-1">
                          <span className="font-extrabold text-amber-400">
                            {data.displayDate} ({data.month})
                          </span>
                          <span className="font-mono text-[10px] text-neutral-400">
                            {data.date}
                          </span>
                        </div>

                        <div className="font-bold text-neutral-200">
                          🚚 {data.truckName} • נהג: {data.driverName}
                        </div>

                        <div className="flex items-center justify-between bg-neutral-800/80 px-2 py-1 rounded-lg">
                          <span className="text-neutral-400 font-medium">משך פריקה:</span>
                          <span className="font-mono font-black text-sm text-white">
                            {data.unloadMinutes} דקות
                          </span>
                        </div>

                        {isCrane && (
                          <div className="flex items-center justify-between text-blue-300">
                            <span>זמן PTO פעיל:</span>
                            <span className="font-mono font-bold">{data.ptoMinutes} דקות</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                          <span>סטייה מתקן מכויל:</span>
                          <span className={`font-mono font-bold ${
                            data.variance > 0
                              ? 'text-rose-400'
                              : data.variance < 0
                              ? 'text-emerald-400'
                              : 'text-neutral-300'
                          }`}>
                            {data.variance > 0 ? `+${data.variance}` : data.variance} דק׳
                          </span>
                        </div>

                        <div className="pt-1 border-t border-neutral-800 text-[11px] text-amber-200/90 leading-snug">
                          📝 {data.fieldEvent}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Reference Baseline Target Line */}
              <ReferenceLine
                y={activeClient.craneUnloadMinutes || 25}
                stroke="#10b981"
                strokeDasharray="4 4"
                label={{
                  value: 'תקן מנוף',
                  fill: '#10b981',
                  fontSize: 10,
                  position: 'insideBottomLeft',
                }}
              />

              {/* Unloading Minutes Area / Line */}
              <Area
                type="monotone"
                dataKey="unloadMinutes"
                name="זמן פריקה (דקות)"
                stroke="#2563eb"
                strokeWidth={3}
                fill="url(#colorCrane)"
                dot={{ r: 5, stroke: '#1d4ed8', strokeWidth: 2, fill: '#ffffff' }}
                activeDot={{ r: 7, stroke: '#f59e0b', strokeWidth: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Historical Deliveries Log Table */}
      <div className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-sm space-y-3 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-black text-sm text-neutral-900">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>יומן פריקות איתוראן מפורט (אוגוסט - ספטמבר 2026)</span>
          </div>
          <span className="text-xs text-neutral-500 font-bold">
            {filteredHistory.length} פריקות מוצלבות
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-neutral-100">
          <table className="w-full text-right border-collapse text-xs">
            <thead className="bg-neutral-50 text-neutral-700 font-bold border-b border-neutral-200">
              <tr>
                <th className="p-2.5">תאריך</th>
                <th className="p-2.5">חודש</th>
                <th className="p-2.5">משאית ונהג</th>
                <th className="p-2.5 text-center">זמן פריקה</th>
                <th className="p-2.5 text-center">זמן מנוף PTO</th>
                <th className="p-2.5 text-center">סטייה מתקן</th>
                <th className="p-2.5">תיעוד אירוע שטח מאיתוראן</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-medium text-neutral-800">
              {filteredHistory.map((h) => {
                const isCrane = h.truckId === 'crane';
                return (
                  <tr key={h.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="p-2.5 font-mono font-bold text-neutral-900">
                      {h.displayDate}
                    </td>
                    <td className="p-2.5 text-neutral-600">
                      {h.month}
                    </td>
                    <td className="p-2.5">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className={`w-2 h-2 rounded-full ${isCrane ? 'bg-blue-600' : 'bg-amber-500'}`} />
                        <span>{h.driverName}</span>
                        <span className="text-neutral-400 font-normal">({h.truckName})</span>
                      </div>
                    </td>
                    <td className="p-2.5 text-center font-mono font-black text-sm">
                      <span className={isCrane ? 'text-blue-800' : 'text-amber-800'}>
                        {h.unloadMinutes} דק׳
                      </span>
                    </td>
                    <td className="p-2.5 text-center font-mono">
                      {isCrane ? (
                        <span className="text-blue-700 font-bold">{h.ptoActiveMinutes} דק׳</span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="p-2.5 text-center font-mono font-bold">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        h.varianceMinutes > 2
                          ? 'bg-rose-100 text-rose-800'
                          : h.varianceMinutes < -2
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}>
                        {h.varianceMinutes > 0 ? `+${h.varianceMinutes}` : h.varianceMinutes} דק׳
                      </span>
                    </td>
                    <td className="p-2.5 text-neutral-600 text-[11px]">
                      {h.fieldEvent}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Connected Client Historical Orders from דשבורד_הזמנות */}
      <div className="bg-neutral-50/70 p-4 rounded-3xl border border-neutral-200">
        <div className="mb-2 px-1 text-xs font-black text-neutral-800 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span>📦</span>
            <span>היסטוריית הזמנות בפועל עבור {activeClient.name} (מקור נתונים: דשבורד_הזמנות)</span>
          </span>
          <span className="text-[10px] text-neutral-500 font-bold">
            ניתן לפתוח כל הזמנה לפירוט מק"טים והפקת תעודת משלוח
          </span>
        </div>
        <ClientOrdersAccordion
          client={activeClient}
          onGenerateDeliveryNote={(order) => onOpenDeliveryNote?.(activeClient, order)}
        />
      </div>
    </div>
  );
};
