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
  // Columns I, J, L, P Cross-Validation Fields
  verificationStamp?: string; // עמודה L: חותמת אימות רב-חודשית (הצלבת נתוני שטח עלי + חכמת)
  ituranCraneAvgMinutes?: number; // עמודה I: כיול זמן פריקת מנוף PTO על פי ממוצעי אמת אוג׳-ספט׳
  ituranFlatbedAvgMinutes?: number; // עמודה J: הזרקת זמן פריקה בפועל איסוזו עלי מדוחות איתוראן
  crossValidationNote?: string; // פירוט הצלבת השטח בין שני הנהגים ושתי המשאיות
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

// Item parsed from raw item string in דשבורד_הזמנות
export interface HistoricalOrderItem {
  itemNumber: number;
  sku: string; // מק"ט
  name: string; // שם מוצר
  quantity: number; // כמות
  unit?: string;
}

// Order record from Google Sheets tab: דשבורד_הזמנות
export interface DashboardOrder {
  id: string; // unique internal key
  orderDate: string; // e.g. "2026-08-14 11:34"
  orderNumber: string; // מזהה הזמנה (e.g. "6214906")
  comaxId: string; // קוד לקוח בקומקס (e.g. "612108")
  clientName: string; // שם לקוח / אתר
  warehouse: string; // מחסן (e.g. "🏭 4️⃣(החרש)")
  deliveryAddress: string; // כתובת אספקה
  rawItemsString: string; // raw string from sheet
  items: HistoricalOrderItem[]; // parsed items array
  balesDeposit: string; // פקדון בלות (e.g. "15 בלות", "פטור")
  palletsDeposit: string; // פקדון משטחים (e.g. "1 משטח", "פטור")
  assignedDriver: string; // נהג משוייך (e.g. "חכמת/עלי", "עלי", "חכמת (נהג ראשי)")
  supplyStatus: string; // סטטוס אספקה נוכחי (e.g. "סופק במלואו", "בסידור עבודה")
  deliveryNoteStatus: string; // תעודת משלוח (e.g. "✅ כן", "⏳ טרם")
  totalItemsCount: number;
}

