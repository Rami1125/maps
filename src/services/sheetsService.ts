import { ClientSite, District, ClientStatus } from '../types';
import { HISTORICAL_63_CLIENTS } from '../data/historicalClients';
import { DEPOT, calculateDrivingDistanceKm } from '../data/clients';

export const GOOGLE_SHEET_ID = '1Ie7gKql_EDdrIN9HqunJc9Ey5k0WXXfPRxs0Vp1Bs2c';
export const SHEET_TAB_NAME = 'מאגר_יעדים_וזמני_פריקה';
export const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/j1kfxfn5y4goe1lud3dk1phkw4bkjvyr';
export const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxVkGrH0dYFyFmj4k1S0-rloPJ0aeRkQTF8e41b_bvhRdchLO4MDhxTCr5dYXuTemzb/exec';

export interface SyncStatus {
  source: 'google_sheets' | 'local_database';
  syncedAt: Date;
  count: number;
  message: string;
  isLive: boolean;
  scriptError?: string;
  scriptUrl?: string;
}

/**
 * Parses GPS coordinates in the format "lat, lng" (e.g. "32.1848059787923, 34.86905067610266")
 * Supports comma, space, or semicolon separation.
 */
export function parseGpsCoordinates(raw: any): { lat: number; lng: number } | null {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str) return null;

  // Clean parenthesis, brackets, quotes
  const cleaned = str.replace(/[()[\]{}"'\\/]/g, '').trim();
  const parts = cleaned
    .split(/[,;\s]+/)
    .map((p) => parseFloat(p.trim()))
    .filter((n) => !isNaN(n));

  if (parts.length >= 2) {
    let lat = parts[0];
    let lng = parts[1];

    // Smart correction if someone entered lng, lat (Israel: lat is ~31.0 to 33.5, lng is ~34.2 to 35.9)
    if (lat > 33.8 && lat < 36.5 && lng > 29.0 && lng < 33.8) {
      const temp = lat;
      lat = lng;
      lng = temp;
    }

    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && (lat !== 0 || lng !== 0)) {
      return { lat, lng };
    }
  }

  return null;
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
 * Uses Google Apps Script Web App as primary or GViz as fallback,
 * and falls back to the preloaded 63 clients if offline or API is inaccessible.
 */
export async function fetchClientsFromSheets(
  customScriptUrl?: string
): Promise<{ clients: ClientSite[]; status: SyncStatus }> {
  const targetScriptUrl = (customScriptUrl && customScriptUrl.trim()) ? customScriptUrl.trim() : DEFAULT_APPS_SCRIPT_URL;
  let scriptErrorMessage: string | undefined;

  // 1. Attempt Google Apps Script Web App
  if (targetScriptUrl) {
    try {
      const resp = await fetch(targetScriptUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json && json.error) {
          scriptErrorMessage = String(json.error);
        } else {
          const rawList = Array.isArray(json)
            ? json
            : json.data || json.records || json.clients || json.rows || json.values;
          if (Array.isArray(rawList) && rawList.length > 0) {
            const parsed = parseRawSheetRows(rawList);
            if (parsed.length > 0) {
              return {
                clients: parsed,
                status: {
                  source: 'google_sheets',
                  syncedAt: new Date(),
                  count: parsed.length,
                  message: `סונכרן בהצלחה דרך Google Apps Script Web App (${parsed.length} יעדים)`,
                  isLive: true,
                  scriptUrl: targetScriptUrl,
                },
              };
            }
          }
        }
      }
    } catch (e: any) {
      scriptErrorMessage = e?.message || 'שגיאת רשת בחיבור ל-Google Apps Script';
    }
  }

  // 2. Attempt Google Sheets Visualization API (Public / Domain Shared)
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
                scriptUrl: targetScriptUrl,
              },
            };
          }
        }
      }
    }
  } catch {
    // Network / CORS / Private Sheet error - fallback gracefully
  }

  // 3. Fallback to local 63 historical clients
  const fallbackMessage = scriptErrorMessage
    ? `Apps Script מחובר אך החזיר: "${scriptErrorMessage}". טעון מאגר 63 יעדים היסטוריים מדויקים.`
    : `מאגר מקומי טעון (63 לקוחות היסטוריים ומדויקים של ח. סבן חומרי בניין)`;

  return {
    clients: HISTORICAL_63_CLIENTS,
    status: {
      source: 'local_database',
      syncedAt: new Date(),
      count: HISTORICAL_63_CLIENTS.length,
      message: fallbackMessage,
      isLive: false,
      scriptError: scriptErrorMessage,
      scriptUrl: targetScriptUrl,
    },
  };
}

/**
 * Parses gviz table schema
 */
function parseGvizTable(table: { cols: { label?: string }[]; rows: { c: ({ v?: any; f?: string } | null)[] }[] }): ClientSite[] {
  const clients: ClientSite[] = [];
  const cols = table.cols.map((col) => (col.label || '').toLowerCase().trim());

  // Find column index for GPS Coordinates (Column P is index 15 in standard sheet)
  const gpsColIndex = cols.findIndex((col) => {
    return (
      col.includes('קואורדינטות') ||
      col.includes('gps') ||
      col.includes('lat') ||
      col.includes('lng') ||
      col.includes('נ.צ')
    );
  });

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

    // Read Column P (index 15) or detected GPS column
    const rawGpsValue = gpsColIndex !== -1 ? getVal(gpsColIndex) : (getVal(15) || '');
    const exactGps = parseGpsCoordinates(rawGpsValue);

    // Approximate coordinates if not in sheet by mapping city or fallback
    const fallbackClient = HISTORICAL_63_CLIENTS.find(
      (c) => c.comaxId === comaxId || c.name === name || c.address.includes(address)
    );

    const lat = exactGps ? exactGps.lat : (fallbackClient ? fallbackClient.lat : DEPOT.lat + (Math.random() - 0.5) * 0.1);
    const lng = exactGps ? exactGps.lng : (fallbackClient ? fallbackClient.lng : DEPOT.lng + (Math.random() - 0.5) * 0.1);
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
      distanceKm: exactGps ? distanceKm : (rawDistance || distanceKm),
      paymentTerms,
      surchargePercent: status === 'problematic' ? 10 : 0,
      basePriceNis: 480,
      observations,
      hasExactGps: !!exactGps,
      gpsCoordinates: exactGps ? `${exactGps.lat.toFixed(7)}, ${exactGps.lng.toFixed(7)}` : undefined,
      gpsSource: exactGps ? 'sheet_col_p' : undefined,
    });
  });

  return clients.length > 0 ? clients : HISTORICAL_63_CLIENTS;
}

/**
 * Parses raw JSON rows from Google Apps Script endpoint
 */
function parseRawSheetRows(rows: any[]): ClientSite[] {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  // If rows is a 2D array (e.g. getDataRange().getValues()), convert to object array
  let itemRows = rows;
  if (Array.isArray(rows[0])) {
    const headers = rows[0].map((h: any) => String(h || '').trim());
    const converted: any[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row) || row.length === 0) continue;
      // Skip totally blank rows
      if (!row[0] && !row[1] && !row[2]) continue;

      const obj: Record<string, any> = {};
      headers.forEach((hdr: string, colIdx: number) => {
        if (hdr) obj[hdr] = row[colIdx];
      });
      // Also map by column index as fallbacks
      obj.comaxId = row[0] ?? obj.comaxId;
      obj.name = row[1] ?? obj.name;
      obj.district = row[2] ?? obj.district;
      obj.address = row[3] ?? obj.address;
      obj.city = row[4] ?? obj.city;
      obj.contactName = row[5] ?? obj.contactName;
      obj.contactPhone = row[6] ?? obj.contactPhone;
      obj.craneBarcode = row[7] ?? obj.craneBarcode;
      obj.flatbedBarcode = row[8] ?? obj.flatbedBarcode;
      obj.craneUnloadMinutes = row[9] ?? obj.craneUnloadMinutes;
      obj.flatbedUnloadMinutes = row[10] ?? obj.flatbedUnloadMinutes;
      obj.status = row[11] ?? obj.status;
      obj.distanceKm = row[12] ?? obj.distanceKm;
      obj.observations = row[13] ?? obj.observations;
      obj.paymentTerms = row[14] ?? obj.paymentTerms;
      obj.P = row[15] ?? obj['קואורדינטות GPS (Lat, Lng)'];
      converted.push(obj);
    }
    itemRows = converted;
  }

  return itemRows.map((r, idx) => {
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

    // Check Column P GPS
    const rawGps =
      r['קואורדינטות GPS (Lat, Lng)'] ||
      r['קואורדינטות GPS'] ||
      r['קואורדינטות'] ||
      r['GPS'] ||
      r['gps'] ||
      r['coords'] ||
      r['latLng'] ||
      r['lat_lng'] ||
      r['P'] ||
      (r.lat && r.lng ? `${r.lat}, ${r.lng}` : null);

    const exactGps = parseGpsCoordinates(rawGps);
    const lat = exactGps ? exactGps.lat : (Number(r.lat) || DEPOT.lat + (Math.random() - 0.5) * 0.08);
    const lng = exactGps ? exactGps.lng : (Number(r.lng) || DEPOT.lng + (Math.random() - 0.5) * 0.08);
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
      hasExactGps: !!exactGps,
      gpsCoordinates: exactGps ? `${exactGps.lat.toFixed(7)}, ${exactGps.lng.toFixed(7)}` : undefined,
      gpsSource: exactGps ? 'sheet_col_p' : undefined,
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
