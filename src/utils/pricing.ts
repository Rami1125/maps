import { ClientSite, PricingBreakdown, TruckConfig } from '../types';
import { DEPOT, calculateDrivingDistanceKm } from '../data/clients';

export function calculateDeliveryCostAndPrice(
  client: ClientSite,
  truck: TruckConfig,
  fuelRateNis: number
): PricingBreakdown {
  const { distanceKm, travelMinutes } = calculateDrivingDistanceKm(
    DEPOT.lat,
    DEPOT.lng,
    client.lat,
    client.lng
  );

  const roundTripDistanceKm = Math.round(distanceKm * 2 * 10) / 10;

  // Round-trip Diesel Cost = ((Distance * 2) / (Consumption)) * Fuel Rate
  const dieselConsumptionLiters = roundTripDistanceKm / truck.fuelConsumptionKmPerL;
  const roundTripDieselCostNis = Math.round(dieselConsumptionLiters * fuelRateNis);

  // PTO Unloading Pump Cost:
  // If Crane: (Unloading Minutes / 60) * 4.5 L/hr * Fuel Rate; If Flatbed: 0 NIS
  const unloadMinutes = truck.id === 'crane' ? client.craneUnloadMinutes : client.flatbedUnloadMinutes;
  const ptoConsumptionLiters = truck.id === 'crane'
    ? (unloadMinutes / 60) * truck.ptoFuelLitersPerHour
    : 0;
  const ptoCostNis = Math.round(ptoConsumptionLiters * fuelRateNis);

  // Total Direct Delivery Cost
  const totalDirectDeliveryCostNis = roundTripDieselCostNis + ptoCostNis;

  // Base Catalog Price from matrix by district
  let baseCatalogPrice = truck.baseSharonPriceNis;
  if (client.district === 'תל אביב' || client.district === 'מרכז') {
    baseCatalogPrice = truck.baseCenterPriceNis;
  } else if (client.district === 'שפלה / מודיעין' || client.district === 'יהודה ושומרון') {
    baseCatalogPrice = truck.baseOuterPriceNis;
  }

  // Extra km surcharge (if km > base km: 12 NIS/km for crane, 8 NIS/km for flatbed)
  const baseIncludedKm = truck.baseIncludedKm; // 15 km
  const extraKm = Math.max(0, Math.round((distanceKm - baseIncludedKm) * 10) / 10);
  const extraKmCostNis = Math.round(extraKm * truck.extraKmRateNis);

  // Risk markup: +10% to base price if problematic
  const isProblematic = client.status === 'problematic';
  const riskMarkupNis = isProblematic ? Math.round(baseCatalogPrice * 0.10) : 0;

  // Recommended Final Price before VAT
  const rawPriceBeforeVat = baseCatalogPrice + extraKmCostNis + riskMarkupNis;
  // Ensure we at least cover direct cost + minimum standard operating margin (e.g. 50%)
  const minPriceFloored = Math.max(rawPriceBeforeVat, Math.round(totalDirectDeliveryCostNis * 1.6));
  const recommendedPriceBeforeVat = minPriceFloored;

  // 18% VAT in Israel
  const VAT_RATE = 0.18;
  const vatAmountNis = Math.round(recommendedPriceBeforeVat * VAT_RATE);
  const totalPriceWithVat = recommendedPriceBeforeVat + vatAmountNis;

  return {
    oneWayDistanceKm: distanceKm,
    roundTripDistanceKm,
    travelMinutes,
    fuelRateNis,
    dieselConsumptionLiters: Math.round(dieselConsumptionLiters * 10) / 10,
    roundTripDieselCostNis,
    ptoMinutes: unloadMinutes,
    ptoConsumptionLiters: Math.round(ptoConsumptionLiters * 10) / 10,
    ptoCostNis,
    totalDirectDeliveryCostNis,
    basePriceNis: baseCatalogPrice,
    extraKm,
    extraKmCostNis,
    riskMarkupNis,
    isProblematic,
    recommendedPriceBeforeVat,
    vatAmountNis,
    totalPriceWithVat,
  };
}

/**
 * Generate formatted WhatsApp message text
 */
export function generateWhatsAppMessage(
  client: ClientSite,
  truck: TruckConfig,
  pricing: PricingBreakdown,
  version: 'driver' | 'manager'
): string {
  const dateStr = new Date().toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
  });

  const wazeLink = `https://waze.com/ul?ll=${client.lat},${client.lng}&navigate=yes`;
  const googleMapsLink = `https://www.google.com/maps/dir/?api=1&origin=${DEPOT.lat},${DEPOT.lng}&destination=${client.lat},${client.lng}`;

  if (version === 'driver') {
    return `🚚 *כרטיס משימת הובלה — ח. סבן חומרי בניין (1994) בע"מ*
📅 תאריך: ${dateStr}
👤 *נהג:* ${truck.driverName} (${truck.name})
🏷️ *מק"ט שירות:* ${truck.serviceSku}
---------------------------------
📍 *יעד פריקה:* ${client.name} (קומקס: #${client.comaxId})
🏘️ *כתובת:* ${client.address}, ${client.city} (${client.district})
🎯 *נ.צ מדויק לשער האתר:* ${client.lat.toFixed(7)}, ${client.lng.toFixed(7)}
📏 *מרחק נסיעה מהמגרש:* כ-${pricing.oneWayDistanceKm} ק"מ (~${pricing.travelMinutes} דק')
⏱️ *זמן פריקה משוער:* ${pricing.ptoMinutes} דקות (${truck.id === 'crane' ? 'מנוף' : 'פלטה'})

📞 *איש קשר באתר:* ${client.contactName} (${client.contactPhone})
⏰ *חלון שעות מומלץ:* ${client.preferredDeliveryHours || 'לפי תיאום'}

⚠️ *הערות שטח ודגשי פריקה:*
${client.observations}
${client.status === 'problematic' ? `\n🚨 *שים לב:* אתר מוגדר כבעייתי! ${client.riskDetails || ''}` : ''}

🧭 *קישורי ניווט ישירים לשער האתר (GPS):*
• Waze: ${wazeLink}
• Google Maps: ${googleMapsLink}

_ח. סבן — נסיעה בטוחה ופריקה זהירה!_`;
  }

  // Manager version (with full commercial pricing)
  return `📊 *דוח תמחור ורווחיות שינוע — ח. סבן חומרי בניין (1994) בע"מ*
📅 תאריך: ${dateStr}
👤 *נהג ומשאית:* ${truck.name}
🏷️ *מק"ט שירות קומקס:* ${truck.serviceSku}
---------------------------------
🏢 *לקוח:* ${client.name} | קוד קומקס: #${client.comaxId}
📍 *אתר:* ${client.address}, ${client.city} (${client.district})
🚦 *סטטוס אתר:* ${client.status === 'problematic' ? '🔴 בעייתי (חלה תוספת סיכון 10%)' : '🟢 תקין'}

📈 *ניתוח מרחקים ודלקים:*
• מרחק נסיעה: ${pricing.oneWayDistanceKm} ק"מ (הלוך-חזור: ${pricing.roundTripDistanceKm} ק"מ)
• זמן נסיעה משוער: כ-${pricing.travelMinutes} דקות
• צריכת סולר משוערת: ${pricing.dieselConsumptionLiters} ליטר (תעריף: ₪${pricing.fuelRateNis}/ליטר)
• עלות סולר נסיעה: ₪${pricing.roundTripDieselCostNis}
• עלות הפעלת משאבת מנוף PTO (${pricing.ptoMinutes} דק'): ₪${pricing.ptoCostNis}
🔥 *סך עלות שינוע ישירה (דלק בלבד):* ₪${pricing.totalDirectDeliveryCostNis}

💰 *תמחור מחירון מומלץ:*
• מחירון בסיס אזור (${client.district}): ₪${pricing.basePriceNis}
${pricing.extraKm > 0 ? `• תוספת מרחק מעבר ל-15 ק"מ (${pricing.extraKm} ק"מ): ₪${pricing.extraKmCostNis}\n` : ''}${pricing.isProblematic ? `• ⚠️ תוספת סיכון אתר מורכב (10%): ₪${pricing.riskMarkupNis}\n` : ''}---------------------------------
💵 *מחיר סופי מומלץ לפני מע"מ:* ₪${pricing.recommendedPriceBeforeVat.toLocaleString()}
🧾 *מע"מ 18%:* ₪${pricing.vatAmountNis.toLocaleString()}
💎 *סה"כ לתשלום כולל מע"מ:* ₪${pricing.totalPriceWithVat.toLocaleString()}
${client.status === 'problematic' ? '🔴 *תנאי תשלום:* מזומן / אשראי מראש!' : '🟢 *תנאי תשלום:* שוטף מאושר'}`;
}
