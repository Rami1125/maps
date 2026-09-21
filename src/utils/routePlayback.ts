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
  const waypoints: RouteWaypoint[] = [
    {
      id: 'depot-start',
      name: 'מגרש סבן (בסיס מוצא)',
      sublabel: `${depot.address}, ${depot.city}`,
      lat: depot.lat,
      lng: depot.lng,
      isDepot: true,
      stopIndex: 0,
    },
    ...deliveryRound.stops.map((stop) => ({
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
      lat: depot.lat,
      lng: depot.lng,
      isDepot: true,
      stopIndex: deliveryRound.stops.length + 1,
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
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const { segments, waypoints, totalDistanceKm } = circuit;

  if (segments.length === 0) {
    const firstWp = waypoints[0];
    return {
      lat: firstWp?.lat ?? 32.14,
      lng: firstWp?.lng ?? 34.89,
      bearingDeg: 0,
      currentSegment: {} as RouteSegment,
      segmentProgress: 0,
      overallProgress: 0,
      distanceCoveredKm: 0,
      totalDistanceKm: 0,
      statusHeadline: 'אין מסלול פעיל',
      statusSubtext: '',
      isAtStop: true,
      activeStopIndex: 0,
      traveledCoords: [],
    };
  }

  const currentDistanceKm = clampedProgress * totalDistanceKm;

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
  const segDist = activeSegment.endDistanceKm - activeSegment.startDistanceKm;
  const segmentProgress =
    segDist > 0
      ? Math.max(
          0,
          Math.min(1, (currentDistanceKm - activeSegment.startDistanceKm) / segDist)
        )
      : 0;

  // Lat / Lng linear interpolation
  const currLat =
    activeSegment.from.lat +
    segmentProgress * (activeSegment.to.lat - activeSegment.from.lat);
  const currLng =
    activeSegment.from.lng +
    segmentProgress * (activeSegment.to.lng - activeSegment.from.lng);

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

  // Traveled coordinates for drawing path trail
  const traveledCoords: [number, number][] = [];
  for (let i = 0; i <= activeSegment.index; i++) {
    traveledCoords.push([segments[i].from.lat, segments[i].from.lng]);
  }
  traveledCoords.push([currLat, currLng]);

  return {
    lat: currLat,
    lng: currLng,
    bearingDeg: activeSegment.bearingDeg,
    currentSegment: activeSegment,
    segmentProgress,
    overallProgress: clampedProgress,
    distanceCoveredKm: Math.round(currentDistanceKm * 10) / 10,
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    statusHeadline,
    statusSubtext,
    isAtStop,
    activeStopIndex,
    traveledCoords,
  };
}
