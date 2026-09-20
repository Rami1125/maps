export type ClientStatus = 'standard' | 'problematic';

export type District = 'השרון' | 'תל אביב' | 'מרכז' | 'שפלה / מודיעין' | 'יהודה ושומרון';

export interface ClientSite {
  id: string;
  name: string;
  comaxId: string;
  district: District;
  address: string;
  city: string;
  lat: number;
  lng: number;
  status: ClientStatus;
  contactName: string;
  contactPhone: string;
  craneUnloadMinutes: number;
  flatbedUnloadMinutes: number;
  baseDistanceKm?: number;
  observations: string;
  riskDetails?: string;
  preferredDeliveryHours?: string;
}

export type TruckType = 'crane' | 'flatbed';

export interface TruckConfig {
  id: TruckType;
  name: string;
  driverName: string;
  vehicleModel: string;
  capacityTon: number;
  fuelConsumptionKmPerL: number; // 3.2 for crane, 6.0 for flatbed
  ptoFuelLitersPerHour: number; // 4.5 for crane, 0 for flatbed
  serviceSku: string; // 18111 for crane, 818111 for flatbed
  extraKmRateNis: number; // 12 for crane, 8 for flatbed
  baseIncludedKm: number; // 15 km included in base price
  baseSharonPriceNis: number;
  baseCenterPriceNis: number;
  baseOuterPriceNis: number;
}

export interface PricingBreakdown {
  oneWayDistanceKm: number;
  roundTripDistanceKm: number;
  travelMinutes: number;
  fuelRateNis: number;
  dieselConsumptionLiters: number;
  roundTripDieselCostNis: number;
  ptoMinutes: number;
  ptoConsumptionLiters: number;
  ptoCostNis: number;
  totalDirectDeliveryCostNis: number;
  basePriceNis: number;
  extraKm: number;
  extraKmCostNis: number;
  riskMarkupNis: number;
  isProblematic: boolean;
  recommendedPriceBeforeVat: number;
  vatAmountNis: number;
  totalPriceWithVat: number;
}

export interface DepotInfo {
  name: string;
  fullName: string;
  companyNumber: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  phone: string;
  hours: string;
}
