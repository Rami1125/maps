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
  distanceKm?: number;
  craneBarcode?: string; // e.g. '18111', '18000'
  flatbedBarcode?: string; // e.g. '818111', '818000'
  paymentTerms?: string; // 'שוטף + 30' / 'מזומן / אשראי מראש'
  surchargePercent?: number; // 10%
  basePriceNis?: number;
  observations: string;
  riskDetails?: string;
  preferredDeliveryHours?: string;
  isCustomGeocoded?: boolean;
  hasExactGps?: boolean;
  gpsCoordinates?: string;
  gpsSource?: 'sheet_col_p' | 'map_drag' | 'geocoded' | 'estimated';
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

export interface RouteStop {
  id: string;
  client: ClientSite;
  stopIndex: number; // 1, 2, 3...
  distanceFromPrevKm: number;
  travelMinutesFromPrev: number;
  loadingOrder: number; // LIFO: total stops - stopIndex + 1
  loadingPositionDescription: string;
  packageNotes?: string;
}

export interface DeliveryRound {
  id: string;
  name: string;
  truckType: TruckType;
  stops: RouteStop[];
  totalCircuitDistanceKm: number;
  totalTravelMinutes: number;
  totalUnloadMinutes: number;
  totalDieselCostNis: number;
  totalPtoCostNis: number;
  totalDirectCostNis: number;
  totalPriceBeforeVat: number;
  totalVatAmountNis: number;
  totalPriceWithVat: number;
}

export interface GeocodedAddress {
  address: string;
  displayName: string;
  city: string;
  district: District;
  lat: number;
  lng: number;
  distanceKm: number;
  suggestedCraneSku: string;
  suggestedFlatbedSku: string;
}
