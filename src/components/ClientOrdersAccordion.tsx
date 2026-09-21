import React, { useState, useEffect } from 'react';
import {
  Package,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileCheck,
  Truck,
  Building2,
  Copy,
  Check,
  ExternalLink,
  Layers,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { ClientSite, DashboardOrder, HistoricalOrderItem } from '../types';
import { fetchOrdersFromDashboardTab, getOrdersForClient, ORDERS_SHEET_TAB_NAME } from '../services/ordersService';

interface ClientOrdersAccordionProps {
  client: ClientSite;
  onGenerateDeliveryNote?: (order: DashboardOrder) => void;
}

export const ClientOrdersAccordion: React.FC<ClientOrdersAccordionProps> = ({
  client,
  onGenerateDeliveryNote,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(true); // open by default so dispatcher sees it immediately
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // Load orders for this specific client from tab דשבורד_הזמנות
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetchOrdersFromDashboardTab()
      .then((allOrders) => {
        if (!isMounted) return;
        const clientOrders = getOrdersForClient(client, allOrders);
        setOrders(clientOrders);
        // Automatically expand the first order to show the itemized table right away
        if (clientOrders.length > 0) {
          setSelectedOrderId(clientOrders[0].id);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        const fallback = getOrdersForClient(client, []);
        setOrders(fallback);
        if (fallback.length > 0) {
          setSelectedOrderId(fallback[0].id);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [client.id, client.comaxId]);

  const toggleOrderExpand = (orderId: string) => {
    setSelectedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  const handleCopyOrder = (order: DashboardOrder, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `📦 הזמנה מס׳ ${order.orderNumber} | לקוח: ${order.clientName} (#${order.comaxId})\nתאריך: ${order.orderDate} | מחסן: ${order.warehouse}\nנהג: ${order.assignedDriver} | סטטוס: ${order.supplyStatus}\nפקדונות: ${order.balesDeposit} בלות, ${order.palletsDeposit} משטחים\n\nפירוט פריטים:\n${order.items.map((i) => `• [${i.sku}] ${i.name} - כמות: ${i.quantity}`).join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopiedOrderId(order.id);
    setTimeout(() => setCopiedOrderId(null), 2500);
  };

  return (
    <div className="rounded-2xl border border-amber-300/80 bg-gradient-to-b from-amber-50/70 via-white to-white overflow-hidden shadow-xs transition-all">
      {/* Accordion Master Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-amber-100/60 hover:bg-amber-100 transition-colors flex items-center justify-between text-right cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-amber-400 text-neutral-950 flex items-center justify-center font-bold text-sm shadow-xs">
            📦
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xs md:text-sm text-neutral-900">
                היסטוריית הזמנות לקוח
              </span>
              <span className="bg-amber-200 text-amber-900 border border-amber-300 text-[10px] font-extrabold px-2 py-0.2 rounded-full">
                {orders.length} הזמנות
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 font-bold mt-0.5">
              <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
              <span>מקור נתונים: טאב ״{ORDERS_SHEET_TAB_NAME}״</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-neutral-500">
          <span className="text-[11px] font-bold text-neutral-600">
            {isOpen ? 'כווץ' : 'פתח הזמנות'}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Accordion Body */}
      {isOpen && (
        <div className="p-3.5 space-y-3">
          {isLoading ? (
            <div className="py-6 flex flex-col items-center justify-center gap-2 text-neutral-400 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
              <span>טוען היסטוריית הזמנות מטאב {ORDERS_SHEET_TAB_NAME}...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-4 text-center text-xs text-neutral-500 bg-neutral-50 rounded-xl border border-neutral-200">
              לא נמצאו הזמנות היסטוריות עבור לקוח זה בטאב {ORDERS_SHEET_TAB_NAME}
            </div>
          ) : (
            <div className="space-y-2.5">
              {orders.map((order) => {
                const isExpanded = selectedOrderId === order.id;

                return (
                  <div
                    key={order.id}
                    className={`rounded-xl border transition-all overflow-hidden ${
                      isExpanded
                        ? 'border-amber-400 bg-amber-50/30 ring-2 ring-amber-300/40 shadow-xs'
                        : 'border-neutral-200 bg-white hover:border-neutral-300'
                    }`}
                  >
                    {/* Order Row (Click to expand/collapse table) */}
                    <div
                      onClick={() => toggleOrderExpand(order.id)}
                      className="p-3 cursor-pointer select-none flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-neutral-50/60 transition-colors"
                    >
                      <div className="flex items-start sm:items-center gap-2.5">
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                            isExpanded ? 'bg-amber-400 text-neutral-950' : 'bg-neutral-100 text-neutral-700'
                          }`}
                        >
                          {order.orderNumber.slice(-3)}
                        </span>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-xs text-neutral-900">
                              הזמנה #{order.orderNumber}
                            </span>
                            <span className="text-[10px] bg-neutral-100 text-neutral-700 px-1.5 py-0.2 rounded font-mono">
                              {order.orderDate}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                                order.supplyStatus.includes('סופק')
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {order.supplyStatus}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-medium mt-0.5 flex-wrap">
                            <span>{order.warehouse}</span>
                            <span>•</span>
                            <span className="font-bold text-neutral-700">{order.assignedDriver}</span>
                            <span>•</span>
                            <span className="text-amber-800 font-bold">{order.items.length} פריטים</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Section / Badges & Expand Indicator */}
                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-neutral-100">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">
                            {order.deliveryNoteStatus}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleCopyOrder(order, e)}
                            className="p-1 rounded hover:bg-neutral-200 text-neutral-500 transition-colors"
                            title="העתק נתוני הזמנה"
                          >
                            {copiedOrderId === order.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <div className="p-1 text-neutral-400">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-amber-600" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Table for this specific order ("טבלה נפתחת תחת אותו לקוח ספציפי") */}
                    {isExpanded && (
                      <div className="border-t border-amber-200/80 bg-white p-3 space-y-3 animate-in fade-in duration-150">
                        {/* Summary metadata tags */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-neutral-50 p-2.5 rounded-xl border border-neutral-200">
                          <div>
                            <span className="text-neutral-500 font-bold block text-[10px]">כתובת יעד:</span>
                            <span className="font-bold text-neutral-800 truncate block" title={order.deliveryAddress}>
                              {order.deliveryAddress || `${client.address}, ${client.city}`}
                            </span>
                          </div>
                          <div>
                            <span className="text-neutral-500 font-bold block text-[10px]">פקדון בלות:</span>
                            <span className="font-bold text-amber-800">{order.balesDeposit || 'תקין'}</span>
                          </div>
                          <div>
                            <span className="text-neutral-500 font-bold block text-[10px]">פקדון משטחים:</span>
                            <span className="font-bold text-amber-800">{order.palletsDeposit || 'תקין'}</span>
                          </div>
                          <div>
                            <span className="text-neutral-500 font-bold block text-[10px]">תעודת משלוח:</span>
                            <span className="font-bold text-emerald-700">{order.deliveryNoteStatus}</span>
                          </div>
                        </div>

                        {/* Itemized Order Table */}
                        <div className="overflow-x-auto rounded-xl border border-neutral-200 shadow-2xs">
                          <table className="w-full text-right border-collapse text-xs">
                            <thead className="bg-neutral-100 text-neutral-700 font-bold border-b border-neutral-200">
                              <tr>
                                <th className="p-2 text-center w-8">#</th>
                                <th className="p-2 w-20">מק״ט</th>
                                <th className="p-2">תיאור פריט / חומר בניין</th>
                                <th className="p-2 text-center w-16">כמות</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 font-medium text-neutral-800">
                              {order.items.map((item, idx) => (
                                <tr key={`${order.id}-item-${idx}`} className="hover:bg-amber-50/50 transition-colors">
                                  <td className="p-2 text-center font-mono text-[11px] text-neutral-400">
                                    {item.itemNumber || idx + 1}
                                  </td>
                                  <td className="p-2 font-mono font-bold text-blue-700 text-[11px]">
                                    {item.sku}
                                  </td>
                                  <td className="p-2 font-bold text-neutral-900">
                                    {item.name}
                                  </td>
                                  <td className="p-2 text-center font-mono font-black text-amber-900 bg-amber-50/40">
                                    {item.quantity}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Order Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <div className="text-[10px] text-neutral-500 font-mono">
                            קוד קומקס לקוח: {order.comaxId || client.comaxId}
                          </div>

                          {onGenerateDeliveryNote && (
                            <button
                              type="button"
                              onClick={() => onGenerateDeliveryNote(order)}
                              className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-black rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer hover:scale-105 active:scale-95"
                            >
                              <FileCheck className="w-3.5 h-3.5 text-amber-400" />
                              <span>הפק תעודת משלוח להזמנה #{order.orderNumber}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
