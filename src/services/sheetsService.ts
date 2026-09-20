import { ClientSite, District, ClientStatus } from '../types';
import { HISTORICAL_63_CLIENTS } from '../data/historicalClients';
import { DEPOT, calculateDrivingDistanceKm } from '../data/clients';

export const GOOGLE_SHEET_ID = '1Ie7gKql_EDdrIN9HqunJc9Ey5k0WXXfPRxs0Vp1Bs2c';
export const SHEET_TAB_NAME = 'מאגר_יעדים_וזמני_פריקה';
export const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/j1kfxfn5y4goe1lud3dk1phkw4bkjvyr';

export interface SyncStatus {
  source: 'google_sheets' | 'local_database';
  syncedAt: Date;
  count: number;
  message: string;
  isLive: boolean;
}

/**
 * Normalizes city/district names to the application's supported District type
 */
export function normalizeDistrict(rawDistrict: string, city: string): District {
  const d = (rawDistrict || city || '').trim();
  if (d.includes('שרון') || d.includes('רעננה') || d.includes('הוד') || d.includes('הרצליה') || d.includes('כפר סבא')) {
    return 'השרון';
  }
  if (d.includes('תל אביב') || d.includes('יפו') || d.includes('אביב')) {
    return 'תל אביב';
  }
  if (d.includes('שומרון') || d.includes('אריאל') || d.includes('ברקן') || d.includes('אלפי') || d.includes('קרני') || d.includes('עלי')) {
    return 'יהודה ושומרון';
  }
  if (d.includes('מודיעין') || d.includes('שהם') || d.includes('שוהם') || d.includes('רמלה') || d.includes('לוד') || d.includes('רחובות') || d.includes('שפלה')) {
    return 'שפלה / מודיעין';
  }
  return 'מרכז';
}

/**
 * Fetches clients from Google Sheets (tab: מאגר_יעדים_וזמני_פריקה).
 * Falls back to the preloaded 63 clients if offline or API is inaccessible.
 */
export async function fetchClientsFromSheets(
  customScriptUrl?: string
): Promise<{ clients: ClientSite[]; status: SyncStatus }> {
  // If custom Google Apps Script Web App URL is provided
  if (customScriptUrl && customScriptUrl.trim()) {
    try {
      const resp = await fetch(customScriptUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (resp.ok) {
        const json = await resp.json();
        const rows = Array.isArray(json) ? json : json.data || json.records;
        if (Array.isArray(rows) && rows.length > 0) {
          const parsed = parseRawSheetRows(rows);
          return {
            clients: parsed,
            status: {
              source: 'google_sheets',
              syncedAt: new Date(),
              count: parsed.length,
              message: `סונכרן בהצלחה דרך Google Apps Script Web App (${parsed.length} יעדים)`,
              isLive: true,
            },
          };
        }
      }
    } catch {
      // Continue to try public gviz endpoint
    }
  }

  // Attempt Google Sheets Visualization API (Public / Domain Shared)
  try {
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
      SHEET_TAB_NAME
    )}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(gvizUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const text = await res.text();
      // gviz returns: /*O_o*/\ngoogle.visualization.Query.setResponse({...});
      const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
      if (match && match[1]) {
        const data = JSON.parse(match[1]);
        const table = data.table;
        if (table && table.rows && table.rows.length > 0) {
          const parsedClients = parseGvizTable(table);
          if (parsedClients.length > 0) {
            return {
              clients: parsedClients,
              status: {
                source: 'google_sheets',
                syncedAt: new Date(),
                count: parsedClients.length,
                message: `סונכרן ישירות עם Google Sheets (${parsedClients.length} יעדים מטאב "${SHEET_TAB_NAME}")`,
                isLive: true,
              },
            };
          }
        }
      }
    }
  } catch {
    // Network / CORS / Private Sheet error - fallback gracefully
  }

  // Fallback to local 63 historical clients
  return {
    clients: HISTORICAL_63_CLIENTS,
    status: {
      source: 'local_database',
      syncedAt: new Date(),
      count: HISTORICAL_63_CLIENTS.length,
      message: `מאגר מקומי טעון (63 לקוחות היסטוריים ומדויקים של ח. סבן חומרי בניין)`,
      isLive: false,
    },
  };
}

/**
 * Parses gviz table schema
 */
function parseGvizTable(table: { cols: { label?: string }[]; rows: { c: ({ v?: any; f?: string } | null)[] }[] }): ClientSite[] {
  const clients: ClientSite[] = [];
  const cols = table.cols.map((col) => (col.label || '').toLowerCase().trim());

  table.rows.forEach((row, idx) => {
    const cells = row.c || [];
    const getVal = (colIndex: number): string => {
      const cell = cells[colIndex];
      if (!cell) return '';
      return (cell.f || cell.v || '').toString().trim();
    };

    // If first row is headers, skip
    const firstCell = getVal(0);
    if (!firstCell || firstCell.includes('קוד') || firstCell.includes('לקוח') || firstCell.includes('ID')) {
      return;
    }

    const comaxId = getVal(0) || `100${idx + 1}`;
    const name = getVal(1) || `לקוח #${comaxId}`;
    const address = getVal(2) || 'כתובת כללית';
    const city = getVal(3) || 'הוד השרון';
    const rawDistrict = getVal(4) || 'השרון';
    const contactPhone = getVal(5) || '050-0000000';
    const contactName = getVal(6) || name;
    const craneBarcode = getVal(7) || '18111';
    const flatbedBarcode = getVal(8) || '818111';
    const rawDistance = parseFloat(getVal(9)) || 0;
    const craneUnloadMinutes = parseInt(getVal(10), 10) || 25;
    const flatbedUnloadMinutes = parseInt(getVal(11), 10) || 18;
    const rawStatus = getVal(12).toLowerCase();
    const status: ClientStatus = rawStatus.includes('בעייתי') || rawStatus.includes('risk') || rawStatus.includes('סיכון') ? 'problematic' : 'standard';
    const observations = getVal(13) || 'פריקה רגילה באתר';
    const paymentTerms = getVal(14) || (status === 'problematic' ? 'מזומן / אשראי מראש' : 'שוטף + 30');

    // Approximate coordinates if not in sheet by mapping city or fallback
    const fallbackClient = HISTORICAL_63_CLIENTS.find(
      (c) => c.comaxId === comaxId || c.name === name || c.address.includes(address)
    );

    const lat = fallbackClient ? fallbackClient.lat : DEPOT.lat + (Math.random() - 0.5) * 0.1;
    const lng = fallbackClient ? fallbackClient.lng : DEPOT.lng + (Math.random() - 0.5) * 0.1;
    const { distanceKm } = calculateDrivingDistanceKm(DEPOT.lat, DEPOT.lng, lat, lng);

    clients.push({
      id: `sheet-${idx}-${comaxId}`,
      name,
      comaxId,
      district: normalizeDistrict(rawDistrict, city),
      address,
      city,
      lat,
      lng,
      status,
      contactName,
      contactPhone,
      craneBarcode,
      flatbedBarcode,
      craneUnloadMinutes,
      flatbedUnloadMinutes,
      distanceKm: rawDistance || distanceKm,
      paymentTerms,
      surchargePercent: status === 'problematic' ? 10 : 0,
      basePriceNis: 480,
      observations,
    });
  });

  return clients.length > 0 ? clients : HISTORICAL_63_CLIENTS;
}

/**
 * Parses raw JSON rows from Google Apps Script endpoint
 */
function parseRawSheetRows(rows: any[]): ClientSite[] {
  return rows.map((r, idx) => {
    const comaxId = String(r['קוד קומקס'] || r.comaxId || r['Customer ID'] || `200${idx}`);
    const name = String(r['שם לקוח'] || r.name || r['Client Name'] || `לקוח ${comaxId}`);
    const address = String(r['כתובת'] || r.address || 'רחוב כללי');
    const city = String(r['עיר'] || r.city || 'הוד השרון');
    const district = normalizeDistrict(String(r['אזור'] || r.district || ''), city);
    const contactName = String(r['איש קשר'] || r.contactName || name);
    const contactPhone = String(r['טלפון'] || r.contactPhone || '050-0000000');
    const craneBarcode = String(r['מק"ט מנוף'] || r['Crane Barcode 18000'] || r.craneBarcode || '18111');
    const flatbedBarcode = String(r['מק"ט פלטה'] || r['Flatbed Barcode 818000'] || r.flatbedBarcode || '818111');
    const craneUnloadMinutes = Number(r['זמן פריקה מנוף'] || r.craneUnloadMinutes || 25);
    const flatbedUnloadMinutes = Number(r['זמן פריקה פלטה'] || r.flatbedUnloadMinutes || 18);
    const statusStr = String(r['סטטוס'] || r.status || '').toLowerCase();
    const status: ClientStatus = statusStr.includes('בעייתי') || statusStr.includes('risk') ? 'problematic' : 'standard';
    const observations = String(r['הערות שטח'] || r.observations || 'פריקה רגילה');
    const paymentTerms = String(r['תנאי תשלום'] || r.paymentTerms || (status === 'problematic' ? 'מזומן / אשראי מראש' : 'שוטף + 30'));

    const lat = Number(r.lat) || DEPOT.lat + (Math.random() - 0.5) * 0.08;
    const lng = Number(r.lng) || DEPOT.lng + (Math.random() - 0.5) * 0.08;
    const { distanceKm } = calculateDrivingDistanceKm(DEPOT.lat, DEPOT.lng, lat, lng);

    return {
      id: `live-${idx}-${comaxId}`,
      name,
      comaxId,
      district,
      address,
      city,
      lat,
      lng,
      status,
      contactName,
      contactPhone,
      craneBarcode,
      flatbedBarcode,
      craneUnloadMinutes,
      flatbedUnloadMinutes,
      distanceKm,
      paymentTerms,
      surchargePercent: status === 'problematic' ? 10 : 0,
      basePriceNis: 480,
      observations,
    };
  });
}

/**
 * Dispatches a single mission or multi-stop route to Make.com Webhook
 */
export async function dispatchToMakeWebhook(payload: Record<string, any>): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        dispatchedAt: new Date().toISOString(),
        system: 'SabanOS Live Dispatch v2.0',
        senderCompany: 'ח. סבן חומרי בניין (1994) בע"מ',
      }),
    });

    if (response.ok) {
      return { success: true, message: 'המשימה שודרה בהצלחה ל-Make.com ולוואטסאפ של הנהג!' };
    } else {
      return {
        success: false,
        message: `Make.com החזיר סטטוס שגיאה ${response.status}`,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `שגיאת חיבור ל-Make.com: ${error?.message || 'אנא ודא חיבור אינטרנט'}`,
    };
  }
}
