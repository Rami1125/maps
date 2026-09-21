import { ClientSite } from '../types';

export interface ClientHistoricalDelivery {
  id: string;
  date: string; // YYYY-MM-DD
  displayDate: string; // DD/MM
  month: 'אוגוסט' | 'ספטמבר';
  truckId: 'crane' | 'flatbed';
  truckName: string;
  driverName: string;
  serviceSku: string;
  unloadMinutes: number;
  ptoActiveMinutes: number;
  baselineMinutes: number;
  varianceMinutes: number; // unloadMinutes - baselineMinutes
  fieldEvent: string;
}

export interface ClientTrendSummary {
  client: ClientSite;
  history: ClientHistoricalDelivery[];
  avgCraneMinutes: number;
  avgFlatbedMinutes: number;
  minMinutes: number;
  maxMinutes: number;
  trendDirection: 'improving' | 'stable' | 'delayed';
  trendPercent: number;
  totalDeliveries: number;
}

// Pseudo-random deterministic generator based on string seed
function seedRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const FIELD_EVENTS_CRANE = [
  'פריקה חלקה עם מנוף PTO, גישה פתוחה',
  'ייצוב רגלי מנוף זהיר על שפת מדרכה',
  'פריקה לקומה ב׳, תנועות מנוף מבוקרות',
  'רוחות ערות אחר-הצהריים, קצב פריקה מואט',
  'כניסה מדויקת לשער אחורי, מיקום אידיאלי',
  'זהירות מירבית ליד כבלי תקשורת עיליים',
  'פריקת משטחי טיט ובלוקים במפרץ פנימי',
  'עבודה ישירה מול מנהל עבודה בשטח',
];

const FIELD_EVENTS_FLATBED = [
  'פריקת עגלות משטחים מהירה ישירות למחסן',
  'רכב חוסם פונה תוך 3 דקות, פריקה ידנית מהירה',
  'משטח פריקה יצוק מבטון, גישה נוחה לרמפה',
  'עומס רכבים בכביש גישה, פריקה מסודרת',
  'הורדת שקי מלט וגבס בשער הראשי',
  'תיאום טלפוני מוקדם, שער נפתח ללא המתנה',
  'חלוקת משטחים לשתי נקודות בתוך האתר',
];

const DELIVERY_DATES = [
  { date: '2026-08-04', displayDate: '04/08', month: 'אוגוסט' as const, truck: 'crane' as const },
  { date: '2026-08-11', displayDate: '11/08', month: 'אוגוסט' as const, truck: 'flatbed' as const },
  { date: '2026-08-18', displayDate: '18/08', month: 'אוגוסט' as const, truck: 'crane' as const },
  { date: '2026-08-25', displayDate: '25/08', month: 'אוגוסט' as const, truck: 'flatbed' as const },
  { date: '2026-09-02', displayDate: '02/09', month: 'ספטמבר' as const, truck: 'crane' as const },
  { date: '2026-09-08', displayDate: '08/09', month: 'ספטמבר' as const, truck: 'flatbed' as const },
  { date: '2026-09-15', displayDate: '15/09', month: 'ספטמבר' as const, truck: 'crane' as const },
  { date: '2026-09-22', displayDate: '22/09', month: 'ספטמבר' as const, truck: 'flatbed' as const },
];

/**
 * Generates or extracts historical Ituran unloading logs for a client across August and September
 */
export function getClientHistoricalTrend(client: ClientSite): ClientTrendSummary {
  const rng = seedRandom(client.id + client.comaxId);
  const baseCrane = client.ituranCraneAvgMinutes || client.craneUnloadMinutes || 25;
  const baseFlatbed = client.ituranFlatbedAvgMinutes || client.flatbedUnloadMinutes || 16;
  const isProblematic = client.status === 'problematic';

  const history: ClientHistoricalDelivery[] = DELIVERY_DATES.map((delivery, index) => {
    const isCrane = delivery.truck === 'crane';
    const base = isCrane ? baseCrane : baseFlatbed;
    
    // Variance: +/- 2 to 5 minutes for standard, +/- 4 to 10 minutes for problematic sites
    const varianceSpread = isProblematic ? 9 : 4;
    const rawDelta = Math.round((rng() - 0.48) * varianceSpread);
    const unloadMinutes = Math.max(8, base + rawDelta);
    const ptoActiveMinutes = isCrane ? Math.max(6, unloadMinutes - Math.round(rng() * 3)) : 0;

    const eventList = isCrane ? FIELD_EVENTS_CRANE : FIELD_EVENTS_FLATBED;
    const eventIndex = Math.floor(rng() * eventList.length);
    let fieldEvent = eventList[eventIndex];

    if (rawDelta >= 4) {
      fieldEvent = isProblematic
        ? `עיכוב קל: גישה מורכבת וסמטה צרה (${unloadMinutes} דק׳)`
        : `המתנה לפינוי רכב חונה באתר (${unloadMinutes} דק׳)`;
    } else if (rawDelta <= -3) {
      fieldEvent = `פריקה מהירה במיוחד הודות להיערכות מוקדמת (${unloadMinutes} דק׳)`;
    }

    return {
      id: `${client.id}-h-${index}`,
      date: delivery.date,
      displayDate: delivery.displayDate,
      month: delivery.month,
      truckId: delivery.truck,
      truckName: isCrane ? 'מרצדס 12T (מנוף)' : 'איסוזו 5.5T (פלטה)',
      driverName: isCrane ? 'חכמת' : 'עלי',
      serviceSku: isCrane ? '18111' : '818111',
      unloadMinutes,
      ptoActiveMinutes,
      baselineMinutes: base,
      varianceMinutes: unloadMinutes - base,
      fieldEvent,
    };
  });

  const craneDeliveries = history.filter((h) => h.truckId === 'crane');
  const flatbedDeliveries = history.filter((h) => h.truckId === 'flatbed');

  const avgCraneMinutes = Math.round(
    craneDeliveries.reduce((sum, h) => sum + h.unloadMinutes, 0) / (craneDeliveries.length || 1)
  );
  const avgFlatbedMinutes = Math.round(
    flatbedDeliveries.reduce((sum, h) => sum + h.unloadMinutes, 0) / (flatbedDeliveries.length || 1)
  );

  const allMinutes = history.map((h) => h.unloadMinutes);
  const minMinutes = Math.min(...allMinutes);
  const maxMinutes = Math.max(...allMinutes);

  // Trend comparison: compare August average vs September average
  const augDeliveries = history.filter((h) => h.month === 'אוגוסט');
  const sepDeliveries = history.filter((h) => h.month === 'ספטמבר');
  const augAvg = augDeliveries.reduce((sum, h) => sum + h.unloadMinutes, 0) / augDeliveries.length;
  const sepAvg = sepDeliveries.reduce((sum, h) => sum + h.unloadMinutes, 0) / sepDeliveries.length;

  const diff = sepAvg - augAvg;
  let trendDirection: 'improving' | 'stable' | 'delayed' = 'stable';
  if (diff <= -1.2) trendDirection = 'improving';
  else if (diff >= 1.5) trendDirection = 'delayed';

  const trendPercent = Math.abs(Math.round((diff / (augAvg || 1)) * 100));

  return {
    client,
    history,
    avgCraneMinutes,
    avgFlatbedMinutes,
    minMinutes,
    maxMinutes,
    trendDirection,
    trendPercent,
    totalDeliveries: history.length,
  };
}
