import { DepotInfo, DeliveryRound, RouteStop } from '../types';

export interface RouteWaypoint {
  id: string;
  name: string;
  sublabel: string;
  lat: number;
  lng: number;
  isDepot: boolean;
  stopIndex: number;
  loadingOrder?: number;
  routeStop?: RouteStop;
}

export interface RouteSegment {
  index: number;
  from: RouteWaypoint;
  to: RouteWaypoint;
  distanceKm: number;
  bearingDeg: number;
  startDistanceKm: number;
  endDistanceKm: number;
  estimatedMinutes: number;
}

export interface RouteCircuitData {
  waypoints: RouteWaypoint[];
  segments: RouteSegment[];
  totalDistanceKm: number;
}

export interface InterpolatedTruckState {
  lat: number;
  lng: number;
  bearingDeg: number;
  currentSegment: RouteSegment;
  segmentProgress: number; // 0..1 in current segment
  overallProgress: number; // 0..1 in total route
  distanceCoveredKm: number;
  totalDistanceKm: number;
  statusHeadline: string;
  statusSubtext: string;
  isAtStop: boolean;
  activeStopIndex: number | null;
  traveledCoords: [number, number][];
}

/**
 * Calculates Haversine distance in km between two lat/lng pairs
 */
export function calculateCoordDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const rawDist = R * c;
  // Road network factor approximation (1.28x direct distance)
  return Math.round(rawDist * 1.28 * 10) / 10;
}

/**
 * Calculates geographic bearing in degrees (0..360) from point A to point B
 */
export function calculateBearingDeg(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

/**
 * Compiles all waypoints and segments for the active DeliveryRound
 */
export function buildRouteCircuitData(
  depot: DepotInfo,
  deliveryRound: DeliveryRound
): RouteCircuitData {
  const safeDepotLat = typeof depot?.lat === 'number' && !isNaN(depot.lat) && isFinite(depot.lat) ? depot.lat : 32.15574;
  const safeDepotLng = typeof depot?.lng === 'number' && !isNaN(depot.lng) && isFinite(depot.lng) ? depot.lng : 34.89668;

  const validStops = (deliveryRound?.stops || []).filter(
    (stop) => stop.client && typeof stop.client.lat === 'number' && !isNaN(stop.client.lat) && isFinite(stop.client.lat) &&
              typeof stop.client.lng === 'number' && !isNaN(stop.client.lng) && isFinite(stop.client.lng)
  );

  const waypoints: RouteWaypoint[] = [
    {
      id: 'depot-start',
      name: 'מגרש סבן (בסיס מוצא)',
      sublabel: `${depot?.address || 'רחוב החרש 10'}, ${depot?.city || 'הוד השרון'}`,
      lat: safeDepotLat,
      lng: safeDepotLng,
      isDepot: true,
      stopIndex: 0,
    },
    ...validStops.map((stop) => ({
      id: stop.id,
      name: `תחנה #${stop.stopIndex}: ${stop.client.name}`,
      sublabel: `${stop.client.address}, ${stop.client.city}`,
      lat: stop.client.lat,
      lng: stop.client.lng,
      isDepot: false,
      stopIndex: stop.stopIndex,
      loadingOrder: stop.loadingOrder,
      routeStop: stop,
    })),
    {
      id: 'depot-end',
      name: 'מגרש סבן (סיום סבב)',
      sublabel: 'סגירת מעגל וחזרה לבסיס',
      lat: safeDepotLat,
      lng: safeDepotLng,
      isDepot: true,
      stopIndex: validStops.length + 1,
    },
  ];

  const segments: RouteSegment[] = [];
  let cumDistance = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i];
    const to = waypoints[i + 1];
    const dist = calculateCoordDistanceKm(from.lat, from.lng, to.lat, to.lng);
    const bearing = calculateBearingDeg(from.lat, from.lng, to.lat, to.lng);
    const estMins = Math.round(dist * 1.5); // avg speed ~40 km/h

    segments.push({
      index: i,
      from,
      to,
      distanceKm: Math.max(0.5, dist),
      bearingDeg: bearing,
      startDistanceKm: cumDistance,
      endDistanceKm: cumDistance + Math.max(0.5, dist),
      estimatedMinutes: estMins,
    });

    cumDistance += Math.max(0.5, dist);
  }

  return {
    waypoints,
    segments,
    totalDistanceKm: cumDistance,
  };
}

/**
 * Interpolates current truck location, bearing, and segment info along the route
 */
export function interpolateTruckState(
  circuit: RouteCircuitData,
  progress: number // 0..1
): InterpolatedTruckState {
  const safeProgress = typeof progress === 'number' && !isNaN(progress) && isFinite(progress) ? progress : 0;
  const clampedProgress = Math.max(0, Math.min(1, safeProgress));
  const { segments, waypoints, totalDistanceKm } = circuit;

  const safeTotalDist = typeof totalDistanceKm === 'number' && !isNaN(totalDistanceKm) && isFinite(totalDistanceKm) ? totalDistanceKm : 0;

  if (!segments || segments.length === 0 || safeTotalDist <= 0) {
    const firstWp = waypoints && waypoints[0];
    const safeLat = firstWp && typeof firstWp.lat === 'number' && !isNaN(firstWp.lat) && isFinite(firstWp.lat) ? firstWp.lat : 32.15574;
    const safeLng = firstWp && typeof firstWp.lng === 'number' && !isNaN(firstWp.lng) && isFinite(firstWp.lng) ? firstWp.lng : 34.89668;
    return {
      lat: safeLat,
      lng: safeLng,
      bearingDeg: 0,
      currentSegment: (segments && segments[0]) ? segments[0] : ({} as RouteSegment),
      segmentProgress: 0,
      overallProgress: 0,
      distanceCoveredKm: 0,
      totalDistanceKm: 0,
      statusHeadline: 'אין מסלול פעיל',
      statusSubtext: '',
      isAtStop: true,
      activeStopIndex: 0,
      traveledCoords: [[safeLat, safeLng]],
    };
  }

  const currentDistanceKm = clampedProgress * safeTotalDist;

  // Find active segment
  let activeSegment = segments[0];
  for (let i = 0; i < segments.length; i++) {
    if (
      currentDistanceKm >= segments[i].startDistanceKm &&
      currentDistanceKm <= segments[i].endDistanceKm
    ) {
      activeSegment = segments[i];
      break;
    }
    if (i === segments.length - 1) {
      activeSegment = segments[i];
    }
  }

  // Fraction within active segment
  const segDist = (activeSegment.endDistanceKm ?? 0) - (activeSegment.startDistanceKm ?? 0);
  const segmentProgress =
    segDist > 0 && !isNaN(segDist)
      ? Math.max(
          0,
          Math.min(1, (currentDistanceKm - activeSegment.startDistanceKm) / segDist)
        )
      : 0;

  // Safe Lat / Lng linear interpolation
  const fromLat = typeof activeSegment.from.lat === 'number' && !isNaN(activeSegment.from.lat) && isFinite(activeSegment.from.lat) ? activeSegment.from.lat : 32.15574;
  const toLat = typeof activeSegment.to.lat === 'number' && !isNaN(activeSegment.to.lat) && isFinite(activeSegment.to.lat) ? activeSegment.to.lat : fromLat;
  const fromLng = typeof activeSegment.from.lng === 'number' && !isNaN(activeSegment.from.lng) && isFinite(activeSegment.from.lng) ? activeSegment.from.lng : 34.89668;
  const toLng = typeof activeSegment.to.lng === 'number' && !isNaN(activeSegment.to.lng) && isFinite(activeSegment.to.lng) ? activeSegment.to.lng : fromLng;

  const rawCurrLat = fromLat + segmentProgress * (toLat - fromLat);
  const rawCurrLng = fromLng + segmentProgress * (toLng - fromLng);

  const currLat = !isNaN(rawCurrLat) && isFinite(rawCurrLat) ? rawCurrLat : fromLat;
  const currLng = !isNaN(rawCurrLng) && isFinite(rawCurrLng) ? rawCurrLng : fromLng;

  // Status phrasing
  let statusHeadline = '';
  let statusSubtext = '';
  let isAtStop = false;
  let activeStopIndex: number | null = null;

  if (clampedProgress <= 0.005) {
    statusHeadline = 'מגרש סבן (הוד השרון)';
    statusSubtext = 'הכנת משאית לקראת יציאה לסבב';
    isAtStop = true;
    activeStopIndex = 0;
  } else if (clampedProgress >= 0.995) {
    statusHeadline = 'סיום סבב חלוקה 🏁';
    statusSubtext = 'משאית סבן חזרה לבסיס בהצלחה';
    isAtStop = true;
    activeStopIndex = waypoints.length - 1;
  } else if (segmentProgress < 0.08 && !activeSegment.from.isDepot) {
    statusHeadline = `פריקה ב${activeSegment.from.name}`;
    statusSubtext = `${activeSegment.from.sublabel} (LIFO #${activeSegment.from.loadingOrder ?? 1})`;
    isAtStop = true;
    activeStopIndex = activeSegment.from.stopIndex;
  } else if (segmentProgress > 0.92 && !activeSegment.to.isDepot) {
    statusHeadline = `הגעה ל${activeSegment.to.name}`;
    statusSubtext = activeSegment.to.sublabel;
    isAtStop = true;
    activeStopIndex = activeSegment.to.stopIndex;
  } else if (activeSegment.to.isDepot) {
    statusHeadline = 'חזרה לבסיס סבן (סיום סבב)';
    statusSubtext = `קטע אחרון: נותרו ${(
      (1 - segmentProgress) *
      activeSegment.distanceKm
    ).toFixed(1)} ק"מ`;
  } else {
    statusHeadline = `בדרך אל ${activeSegment.to.name}`;
    statusSubtext = `מקטע ${activeSegment.index + 1}/${segments.length} • נותרו ${(
      (1 - segmentProgress) *
      activeSegment.distanceKm
    ).toFixed(1)} ק"מ לתחנה`;
  }

  // Traveled coordinates for drawing path trail (ensuring no NaN values)
  const traveledCoords: [number, number][] = [];
  for (let i = 0; i <= activeSegment.index; i++) {
    const segFrom = segments[i]?.from;
    if (segFrom && typeof segFrom.lat === 'number' && !isNaN(segFrom.lat) && typeof segFrom.lng === 'number' && !isNaN(segFrom.lng)) {
      traveledCoords.push([segFrom.lat, segFrom.lng]);
    }
  }
  if (!isNaN(currLat) && !isNaN(currLng)) {
    traveledCoords.push([currLat, currLng]);
  }

  return {
    lat: currLat,
    lng: currLng,
    bearingDeg: activeSegment.bearingDeg,
    currentSegment: activeSegment,
    segmentProgress,
    overallProgress: clampedProgress,
    distanceCoveredKm: Math.round(currentDistanceKm * 10) / 10,
    totalDistanceKm: Math.round(safeTotalDist * 10) / 10,
    statusHeadline,
    statusSubtext,
    isAtStop,
    activeStopIndex,
    traveledCoords,
  };
}
