import { ClientSite, DeliveryRound, RouteStop, TruckConfig } from '../types';
import { DEPOT, calculateDrivingDistanceKm } from '../data/clients';

/**
 * Calculates a complete multi-stop delivery round with LIFO loading order
 */
export function buildDeliveryRound(
  stopsClients: ClientSite[],
  truck: TruckConfig,
  fuelRateNis: number,
  roundName: string = 'סבב חלוקה מרוכז'
): DeliveryRound {
  const totalStops = stopsClients.length;
  const stops: RouteStop[] = [];

  let prevLat = DEPOT.lat;
  let prevLng = DEPOT.lng;
  let accumulatedDrivingKm = 0;
  let accumulatedTravelMinutes = 0;
  let accumulatedUnloadMinutes = 0;
  let totalBasePrice = 0;
  let totalRiskMarkup = 0;

  // Build each stop
  stopsClients.forEach((client, index) => {
    const stopIndex = index + 1; // 1-based
    const { distanceKm, travelMinutes } = calculateDrivingDistanceKm(
      prevLat,
      prevLng,
      client.lat,
      client.lng
    );

    accumulatedDrivingKm += distanceKm;
    accumulatedTravelMinutes += travelMinutes;

    const unloadMins =
      truck.id === 'crane' ? client.craneUnloadMinutes : client.flatbedUnloadMinutes;
    accumulatedUnloadMinutes += unloadMins;

    // LIFO loading order: Stop 1 is unloaded first -> loaded LAST
    const loadingOrder = totalStops - stopIndex + 1;
    let loadingPositionDescription = '';
    if (stopIndex === 1) {
      loadingPositionDescription = 'קצה אחורי של המשאית (גישה ראשונה מיידית לפריקה ללא הזזת משטחים)';
    } else if (stopIndex === totalStops) {
      loadingPositionDescription = 'עמוק בפנים בצמוד לקבינה / חזית הארגז (ייפרק אחרון בסבב)';
    } else {
      loadingPositionDescription = `מרכז משטח המשאית (שלב העמסה #${loadingOrder} במגרש סבן)`;
    }

    // Base price & risk calculation
    let baseCatalogPrice = truck.baseSharonPriceNis;
    if (client.district === 'תל אביב' || client.district === 'מרכז') {
      baseCatalogPrice = truck.baseCenterPriceNis;
    } else if (client.district === 'שפלה / מודיעין' || client.district === 'יהודה ושומרון') {
      baseCatalogPrice = truck.baseOuterPriceNis;
    }
    totalBasePrice += baseCatalogPrice;
    if (client.status === 'problematic') {
      totalRiskMarkup += Math.round(baseCatalogPrice * 0.1);
    }

    stops.push({
      id: `stop-${stopIndex}-${client.id}`,
      client,
      stopIndex,
      distanceFromPrevKm: distanceKm,
      travelMinutesFromPrev: travelMinutes,
      loadingOrder,
      loadingPositionDescription,
    });

    prevLat = client.lat;
    prevLng = client.lng;
  });

  // Return leg from final stop back to Depot
  const lastClient = stopsClients[totalStops - 1];
  const returnToDepot = lastClient
    ? calculateDrivingDistanceKm(lastClient.lat, lastClient.lng, DEPOT.lat, DEPOT.lng)
    : { distanceKm: 0, travelMinutes: 0 };

  const totalCircuitDistanceKm = Math.round((accumulatedDrivingKm + returnToDepot.distanceKm) * 10) / 10;
  const totalTravelMinutes = accumulatedTravelMinutes + returnToDepot.travelMinutes;

  // Fuel calculations for the round
  const dieselConsumptionLiters = totalCircuitDistanceKm / truck.fuelConsumptionKmPerL;
  const totalDieselCostNis = Math.round(dieselConsumptionLiters * fuelRateNis);

  // PTO fuel for all crane unloads
  const ptoConsumptionLiters =
    truck.id === 'crane'
      ? (accumulatedUnloadMinutes / 60) * truck.ptoFuelLitersPerHour
      : 0;
  const totalPtoCostNis = Math.round(ptoConsumptionLiters * fuelRateNis);

  const totalDirectCostNis = totalDieselCostNis + totalPtoCostNis;

  // Extra km surcharge if total round exceeds base allowance
  const baseIncludedForRound = truck.baseIncludedKm * Math.max(1, totalStops * 0.75);
  const extraKm = Math.max(0, totalCircuitDistanceKm - baseIncludedForRound);
  const extraKmCost = Math.round(extraKm * truck.extraKmRateNis);

  const rawPriceBeforeVat = totalBasePrice + totalRiskMarkup + extraKmCost;
  // Multi-stop bundle incentive: ensure we cover direct costs + 55% margin
  const minFlooredPrice = Math.max(rawPriceBeforeVat, Math.round(totalDirectCostNis * 1.55));
  const totalPriceBeforeVat = minFlooredPrice;
  const totalVatAmountNis = Math.round(totalPriceBeforeVat * 0.18);
  const totalPriceWithVat = totalPriceBeforeVat + totalVatAmountNis;

  return {
    id: `round-${Date.now()}`,
    name: roundName,
    truckType: truck.id,
    stops,
    totalCircuitDistanceKm,
    totalTravelMinutes,
    totalUnloadMinutes: accumulatedUnloadMinutes,
    totalDieselCostNis,
    totalPtoCostNis,
    totalDirectCostNis,
    totalPriceBeforeVat,
    totalVatAmountNis,
    totalPriceWithVat,
  };
}

/**
 * Optimizes the stop sequence using a Nearest-Neighbor TSP heuristic
 * starting from Depot to minimize total driving distance.
 */
export function optimizeStopsSequence(clients: ClientSite[]): ClientSite[] {
  if (clients.length <= 2) return [...clients];

  const unvisited = [...clients];
  const ordered: ClientSite[] = [];
  let currentLat = DEPOT.lat;
  let currentLng = DEPOT.lng;

  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let shortestDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const candidate = unvisited[i];
      const { distanceKm } = calculateDrivingDistanceKm(
        currentLat,
        currentLng,
        candidate.lat,
        candidate.lng
      );
      if (distanceKm < shortestDistance) {
        shortestDistance = distanceKm;
        nearestIndex = i;
      }
    }

    const nextStop = unvisited.splice(nearestIndex, 1)[0];
    ordered.push(nextStop);
    currentLat = nextStop.lat;
    currentLng = nextStop.lng;
  }

  return ordered;
}

/**
 * Calculates comparative savings of doing a multi-stop round vs separate individual trips
 */
export function calculateRoundSavings(
  clients: ClientSite[],
  round: DeliveryRound,
  truck: TruckConfig,
  fuelRateNis: number
): { savedKm: number; savedFuelNis: number; percentSaved: number } {
  let separateDistanceKm = 0;
  clients.forEach((c) => {
    const { distanceKm } = calculateDrivingDistanceKm(DEPOT.lat, DEPOT.lng, c.lat, c.lng);
    separateDistanceKm += distanceKm * 2; // round-trip for each
  });

  const savedKm = Math.max(0, Math.round((separateDistanceKm - round.totalCircuitDistanceKm) * 10) / 10);
  const savedLiters = savedKm / truck.fuelConsumptionKmPerL;
  const savedFuelNis = Math.round(savedLiters * fuelRateNis);
  const percentSaved = separateDistanceKm > 0 ? Math.round((savedKm / separateDistanceKm) * 100) : 0;

  return { savedKm, savedFuelNis, percentSaved };
}

/**
 * Generates formatted WhatsApp itinerary for multi-stop round
 */
export function generateMultiStopWhatsAppMessage(
  round: DeliveryRound,
  truck: TruckConfig,
  fuelRateNis: number,
  timeEstimation?: RoundTimeEstimation
): string {
  const dateStr = new Date().toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
  });

  let stopsText = '';
  round.stops.forEach((stop) => {
    const wazeUrl = `https://waze.com/ul?ll=${stop.client.lat},${stop.client.lng}&navigate=yes`;
    const legEst = timeEstimation?.legs.find((l) => l.stopIndex === stop.stopIndex);
    const scheduleStr = legEst
      ? `\n⏰ לו"ז משוער: הגעה ב-${legEst.arrivalTime} | יציאה ב-${legEst.departureTime} (שהייה: ${legEst.totalStopMinutes} דק')`
      : '';

    stopsText += `
*תחנה #${stop.stopIndex}: ${stop.client.name}* (קומקס: #${stop.client.comaxId})
📍 כתובת: ${stop.client.address}, ${stop.client.city}
📞 איש קשר: ${stop.client.contactName} (${stop.client.contactPhone})
⏱️ זמן פריקה: ${truck.id === 'crane' ? stop.client.craneUnloadMinutes : stop.client.flatbedUnloadMinutes} דק' (+${timeEstimation?.stopOverheadMinutes || 8} דק' שער ותמרון)${scheduleStr}
⚠️ הערות: ${stop.client.observations}
🧭 Waze: ${wazeUrl}
`;
  });

  let lifoPlanText = '';
  // Loading plan in ascending order of loading (which is reverse of unloading)
  const sortedByLoading = [...round.stops].sort((a, b) => a.loadingOrder - b.loadingOrder);
  sortedByLoading.forEach((s) => {
    lifoPlanText += `• שלב העמסה #${s.loadingOrder}: *${s.client.name}* (${s.loadingPositionDescription})\n`;
  });

  const durationSummaryText = timeEstimation
    ? `• משך סבב משוער כולל: *${timeEstimation.totalRoundFormatted}* (יציאה: ${timeEstimation.departureTime} ⟵ חזרה: ${timeEstimation.estimatedReturnTime})
• זמן נסיעה בדרכים: ~${timeEstimation.transitHoursFormatted} (לפי מהירות ממוצעת ${timeEstimation.transitSpeedKmH} קמ"ש)
• זמן פריקה ושהייה באתרים (${timeEstimation.stopsCount} תחנות): ${timeEstimation.totalUnloadMinutes + timeEstimation.totalStopOverheadMinutes} דק'`
    : `• זמן נסיעה משוער: ~${round.totalTravelMinutes} דק'
• סה"כ זמן פריקה: ${round.totalUnloadMinutes} דקות`;

  return `🚛 *סבב חלוקה רב-יעדי — ח. סבן חומרי בניין (1994) בע"מ*
📅 תאריך: ${dateStr}
👤 *נהג:* ${truck.driverName} (${truck.name})
🏷️ *מק"ט:* ${truck.serviceSku}
---------------------------------
📊 *סיכום סבב חלוקה (${round.stops.length} יעדים):*
• מרחק כולל: ${round.totalCircuitDistanceKm} ק"מ
${durationSummaryText}

🧱 *הוראות העמסה במגרש בשיטת LIFO (Last-In First-Out):*
${lifoPlanText}
---------------------------------
📋 *סדר התחנות ולו"ז בפריקה:*
${stopsText}
_ח. סבן — נסיעה בטוחה ופריקה זהירה!_`;
}

export interface RoundScheduleLeg {
  stopIndex: number;
  clientName: string;
  city: string;
  address: string;
  distanceFromPrevKm: number;
  travelMinutesFromPrev: number;
  arrivalTime: string;
  unloadMinutes: number;
  maneuveringMinutes: number;
  totalStopMinutes: number;
  departureTime: string;
}

export interface RoundTimeEstimation {
  transitSpeedKmH: number;
  stopOverheadMinutes: number;
  depotPrepMinutes: number;
  departureTime: string;
  totalTransitMinutes: number;
  totalUnloadMinutes: number;
  totalStopOverheadMinutes: number;
  totalRoundMinutes: number;
  totalRoundFormatted: string;
  transitHoursFormatted: string;
  estimatedReturnTime: string;
  stopsCount: number;
  legs: RoundScheduleLeg[];
  returnLegDistanceKm: number;
  returnLegTravelMinutes: number;
}

export function formatMinutes(totalMins: number): string {
  const rounded = Math.round(totalMins);
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (hours === 0) return `${mins} דק'`;
  if (mins === 0) return `${hours} שעות`;
  return `${hours} שעות ו-${mins} דק'`;
}

export function addMinutesToTimeString(timeStr: string, minutesToAdd: number): string {
  const [hStr, mStr] = (timeStr || '07:30').split(':');
  let totalMins = (parseInt(hStr, 10) || 0) * 60 + (parseInt(mStr, 10) || 0) + Math.round(minutesToAdd);
  totalMins = ((totalMins % 1440) + 1440) % 1440;
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Calculates accurate total time duration for the delivery round
 * based on customizable average transit speed, stop overhead buffer,
 * active unloading duration, and depot loading prep.
 */
export function calculateRoundTimeEstimation(
  round: DeliveryRound,
  truck: TruckConfig,
  transitSpeedKmH: number = 42,
  stopOverheadMinutes: number = 8,
  depotPrepMinutes: number = 15,
  departureTime: string = '07:30'
): RoundTimeEstimation {
  const legs: RoundScheduleLeg[] = [];
  const safeSpeed = Math.max(15, Math.min(90, transitSpeedKmH));
  const stopsCount = round.stops.length;
  const totalStopOverheadMinutes = stopsCount * stopOverheadMinutes;

  let currentTime = addMinutesToTimeString(departureTime, depotPrepMinutes);
  let totalTransitMinutes = 0;
  let totalUnloadMinutes = 0;

  round.stops.forEach((stop) => {
    const dist = stop.distanceFromPrevKm;
    const legTransitMins = Math.max(2, Math.round((dist / safeSpeed) * 60));
    totalTransitMinutes += legTransitMins;

    const arrivalTime = addMinutesToTimeString(currentTime, legTransitMins);
    const unloadMins =
      truck.id === 'crane' ? stop.client.craneUnloadMinutes : stop.client.flatbedUnloadMinutes;
    totalUnloadMinutes += unloadMins;

    const totalAtStop = unloadMins + stopOverheadMinutes;
    const legDepartureTime = addMinutesToTimeString(arrivalTime, totalAtStop);

    legs.push({
      stopIndex: stop.stopIndex,
      clientName: stop.client.name,
      city: stop.client.city,
      address: stop.client.address,
      distanceFromPrevKm: dist,
      travelMinutesFromPrev: legTransitMins,
      arrivalTime,
      unloadMinutes: unloadMins,
      maneuveringMinutes: stopOverheadMinutes,
      totalStopMinutes: totalAtStop,
      departureTime: legDepartureTime,
    });

    currentTime = legDepartureTime;
  });

  // Return leg from final stop to Depot
  const lastStop = round.stops[round.stops.length - 1];
  let returnLegDistanceKm = 0;
  if (lastStop) {
    const { distanceKm } = calculateDrivingDistanceKm(
      lastStop.client.lat,
      lastStop.client.lng,
      DEPOT.lat,
      DEPOT.lng
    );
    returnLegDistanceKm = distanceKm;
  }
  const returnLegTravelMinutes = Math.max(2, Math.round((returnLegDistanceKm / safeSpeed) * 60));
  totalTransitMinutes += returnLegTravelMinutes;

  const estimatedReturnTime = addMinutesToTimeString(currentTime, returnLegTravelMinutes);
  const totalRoundMinutes =
    depotPrepMinutes + totalTransitMinutes + totalUnloadMinutes + totalStopOverheadMinutes;

  return {
    transitSpeedKmH: safeSpeed,
    stopOverheadMinutes,
    depotPrepMinutes,
    departureTime,
    totalTransitMinutes,
    totalUnloadMinutes,
    totalStopOverheadMinutes,
    totalRoundMinutes,
    totalRoundFormatted: formatMinutes(totalRoundMinutes),
    transitHoursFormatted: formatMinutes(totalTransitMinutes),
    estimatedReturnTime,
    stopsCount,
    legs,
    returnLegDistanceKm,
    returnLegTravelMinutes,
  };
}
