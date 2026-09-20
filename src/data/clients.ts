import { ClientSite, DepotInfo, TruckConfig } from '../types';
import { HISTORICAL_63_CLIENTS } from './historicalClients';

export const DEPOT: DepotInfo = {
  name: 'מגרש סבן (בסיס מוצא)',
  fullName: 'ח. סבן חומרי בניין (1994) בע"מ',
  companyNumber: 'ח.פ 512014881',
  address: 'רחוב החרש 10, אזור התעשייה נווה נאמן, הוד השרון',
  city: 'הוד השרון',
  lat: 32.15574,
  lng: 34.89668,
  phone: '09-7452366',
  hours: 'א׳-ה׳: 06:30 - 17:00 | ו׳: 06:30 - 13:00',
};

export const TRUCKS: Record<'crane' | 'flatbed', TruckConfig> = {
  crane: {
    id: 'crane',
    name: 'חכמת (מרצדס מנוף 12 טון)',
    driverName: 'חכמת',
    vehicleModel: 'Mercedes-Benz Actros 2543 + מנוף Palfinger 12T',
    capacityTon: 12,
    fuelConsumptionKmPerL: 3.2,
    ptoFuelLitersPerHour: 4.5,
    serviceSku: '18111',
    extraKmRateNis: 12,
    baseIncludedKm: 15,
    baseSharonPriceNis: 480,
    baseCenterPriceNis: 620,
    baseOuterPriceNis: 780,
  },
  flatbed: {
    id: 'flatbed',
    name: 'עלי (איסוזו פלטה 5.5 טון)',
    driverName: 'עלי',
    vehicleModel: 'Isuzu Forward FSR 90 פלטה פתוחה 5.5T',
    capacityTon: 5.5,
    fuelConsumptionKmPerL: 6.0,
    ptoFuelLitersPerHour: 0.0,
    serviceSku: '818111',
    extraKmRateNis: 8,
    baseIncludedKm: 15,
    baseSharonPriceNis: 320,
    baseCenterPriceNis: 420,
    baseOuterPriceNis: 550,
  },
};

export const CLIENT_SITES: ClientSite[] = HISTORICAL_63_CLIENTS;

/**
 * Calculates straight line distance (Haversine formula in km)
 * and multiplies by standard road detour coefficient (1.28) to estimate driving distance.
 */
export function calculateDrivingDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): { distanceKm: number; travelMinutes: number } {
  const R = 6371; // Radius of Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const crowDistance = R * c;

  // Road factor for urban/suburban Israel road network
  const roadFactor = crowDistance < 5 ? 1.35 : crowDistance < 20 ? 1.28 : 1.22;
  const distanceKm = Math.max(1.5, Math.round(crowDistance * roadFactor * 10) / 10);

  // Average commercial truck speed in Israel: ~32 km/h urban/suburban
  const avgSpeedKmH = distanceKm < 8 ? 26 : distanceKm < 25 ? 36 : 48;
  const travelMinutes = Math.max(6, Math.round((distanceKm / avgSpeedKmH) * 60));

  return { distanceKm, travelMinutes };
}
