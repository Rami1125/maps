import { District, GeocodedAddress, ClientSite, ClientStatus } from '../types';
import { DEPOT, calculateDrivingDistanceKm } from '../data/clients';
import { normalizeDistrict } from './sheetsService';

export async function searchAddressOnline(query: string): Promise<GeocodedAddress[]> {
  if (!query || query.trim().length < 3) return [];

  try {
    const encoded = encodeURIComponent(`${query.trim()}, ישראל`);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&countrycodes=il&accept-language=he&addressdetails=1&limit=5`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];

    const items = await res.json();
    if (!Array.isArray(items)) return [];

    return items.map((item: any) => {
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);
      const city =
        item.address?.city ||
        item.address?.town ||
        item.address?.suburb ||
        item.address?.village ||
        'ישראל';
      const district = normalizeDistrict(item.address?.state || item.address?.county || '', city);
      const { distanceKm } = calculateDrivingDistanceKm(DEPOT.lat, DEPOT.lng, lat, lng);

      // Determine SKU barcode by district
      const skuSuffix = district === 'השרון' ? '111' : district === 'תל אביב' ? '211' : district === 'מרכז' ? '311' : district === 'שפלה / מודיעין' ? '411' : '511';

      return {
        address: item.display_name.split(',')[0] || query,
        displayName: item.display_name,
        city,
        district,
        lat,
        lng,
        distanceKm,
        suggestedCraneSku: `18${skuSuffix}`,
        suggestedFlatbedSku: `818${skuSuffix}`,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Converts a geocoded address into a ClientSite object ready for dispatching and route planning
 */
export function createClientFromGeocoded(
  geo: GeocodedAddress,
  name: string,
  contactPhone: string,
  isProblematic: boolean,
  notes?: string
): ClientSite {
  const comaxId = `9${Math.floor(1000 + Math.random() * 9000)}`;
  const status: ClientStatus = isProblematic ? 'problematic' : 'standard';

  let basePrice = 480;
  if (geo.district === 'תל אביב' || geo.district === 'מרכז') basePrice = 620;
  if (geo.district === 'שפלה / מודיעין' || geo.district === 'יהודה ושומרון') basePrice = 780;

  return {
    id: `custom-${Date.now()}`,
    name: name.trim() || `יעד חדש (${geo.address})`,
    comaxId,
    district: geo.district,
    address: geo.address,
    city: geo.city,
    lat: geo.lat,
    lng: geo.lng,
    status,
    contactName: name.trim() || 'איש קשר באתר',
    contactPhone: contactPhone.trim() || '050-0000000',
    craneUnloadMinutes: isProblematic ? 40 : 25,
    flatbedUnloadMinutes: isProblematic ? 25 : 18,
    distanceKm: geo.distanceKm,
    craneBarcode: geo.suggestedCraneSku,
    flatbedBarcode: geo.suggestedFlatbedSku,
    paymentTerms: isProblematic ? 'מזומן / אשראי מראש' : 'שוטף + 30',
    surchargePercent: isProblematic ? 10 : 0,
    basePriceNis: basePrice,
    observations: notes?.trim() || 'יעד חדש שנוסף ידנית דרך איתור כתובת גיאוגרפי.',
    riskDetails: isProblematic ? 'הוגדר ידנית כאתר בעייתי/סיכון גבוה.' : undefined,
    isCustomGeocoded: true,
  };
}
