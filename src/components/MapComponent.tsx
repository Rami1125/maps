import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import { ClientSite, DepotInfo, DeliveryRound } from '../types';
import {
  buildRouteCircuitData,
  interpolateTruckState,
  RouteCircuitData,
  InterpolatedTruckState,
} from '../utils/routePlayback';
import { RoutePlaybackControl } from './RoutePlaybackControl';
import { Truck } from 'lucide-react';

interface MapComponentProps {
  depot: DepotInfo;
  clients: ClientSite[];
  selectedClient: ClientSite | null;
  onSelectClient: (client: ClientSite) => void;
  onSelectDepot: () => void;
  isDepotSelected: boolean;
  mapLayerType: 'standard' | 'voyager' | 'dark' | 'satellite';
  deliveryRound?: DeliveryRound | null;
  isRoutePlannerActive?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  onUpdateClientCoordinates?: (clientId: string, lat: number, lng: number) => void;
  isPinAdjustMode?: boolean;
}

export const MapComponent: React.FC<MapComponentProps> = ({
  depot,
  clients,
  selectedClient,
  onSelectClient,
  onSelectDepot,
  isDepotSelected,
  mapLayerType,
  deliveryRound,
  isRoutePlannerActive = false,
  onMapClick,
  onUpdateClientCoordinates,
  isPinAdjustMode = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const depotMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const multiStopPolylineRef = useRef<L.Polyline | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // --- Route Playback State & Refs ---
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [followCamera, setFollowCamera] = useState<boolean>(false);
  const [isPlaybackPanelVisible, setIsPlaybackPanelVisible] = useState<boolean>(true);

  const progressRef = useRef<number>(0);
  const playbackSpeedRef = useRef<number>(1);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const playbackTruckMarkerRef = useRef<L.Marker | null>(null);
  const traveledPolylineRef = useRef<L.Polyline | null>(null);

  // Sync refs with state for animation loop
  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  // Compute circuit data whenever deliveryRound changes
  const circuit: RouteCircuitData | null = useMemo(() => {
    if (!deliveryRound || deliveryRound.stops.length === 0) return null;
    return buildRouteCircuitData(depot, deliveryRound);
  }, [depot, deliveryRound]);

  // Interpolate current truck location and segment
  const truckState: InterpolatedTruckState | null = useMemo(() => {
    if (!circuit) return null;
    return interpolateTruckState(circuit, progress);
  }, [circuit, progress]);

  // Reset playback if deliveryRound is cleared or changed
  useEffect(() => {
    if (!deliveryRound || deliveryRound.stops.length === 0) {
      setIsPlaying(false);
      setProgress(0);
      progressRef.current = 0;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  }, [deliveryRound]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [depot.lat, depot.lng],
      zoom: 12,
      zoomControl: false,
      attributionControl: true,
    });

    // Add zoom control at bottom-left
    L.control.zoom({ position: 'bottomleft' }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [depot.lat, depot.lng]);

  // Handle Map Click & Pin Adjustment Mode
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
      if (isPinAdjustMode && selectedClient && onUpdateClientCoordinates) {
        onUpdateClientCoordinates(selectedClient.id, e.latlng.lat, e.latlng.lng);
      }
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [onMapClick, isPinAdjustMode, selectedClient, onUpdateClientCoordinates]);

  // Update Tile Layer based on layer type
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let url = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    let attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

    if (mapLayerType === 'standard') {
      url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
    } else if (mapLayerType === 'dark') {
      url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    } else if (mapLayerType === 'satellite') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS';
    }

    const tileLayer = L.tileLayer(url, {
      maxZoom: 19,
      attribution,
    }).addTo(map);

    tileLayerRef.current = tileLayer;
  }, [mapLayerType]);

  // Depot Marker Creation & Update
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (depotMarkerRef.current) {
      map.removeLayer(depotMarkerRef.current);
    }

    const depotIconHtml = `
      <div class="relative flex items-center justify-center cursor-pointer group">
        <div class="absolute w-12 h-12 rounded-full bg-amber-400 opacity-60 pulse-effect"></div>
        <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-900 border-2 border-amber-400 shadow-xl flex items-center justify-center text-white text-lg font-bold transform transition-transform hover:scale-110">
          🏗️
        </div>
        <div class="absolute -bottom-6 bg-blue-900/95 backdrop-blur-sm text-amber-300 font-bold text-[11px] px-2 py-0.5 rounded-full border border-amber-400/50 shadow-md whitespace-nowrap">
          מגרש סבן (בסיס מוצא)
        </div>
      </div>
    `;

    const depotIcon = L.divIcon({
      className: 'custom-depot-pin',
      html: depotIconHtml,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });

    const marker = L.marker([depot.lat, depot.lng], { icon: depotIcon })
      .addTo(map)
      .on('click', () => {
        onSelectDepot();
        map.flyTo([depot.lat, depot.lng], 14, { duration: 1 });
      });

    depotMarkerRef.current = marker;
  }, [depot, onSelectDepot]);

  // Client Markers Creation & Update
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove obsolete markers
    Object.values(markersRef.current).forEach((marker) => map.removeLayer(marker));
    markersRef.current = {};

    clients.forEach((client) => {
      const isSelected = selectedClient?.id === client.id;
      const isProblematic = client.status === 'problematic';

      // Check if client is part of the multi-stop delivery round
      const routeStop = deliveryRound?.stops.find((s) => s.client.id === client.id);

      let markerHtml = '';

      if (routeStop) {
        // Multi-stop waypoint marker (e.g. Stop #1, #2, #3)
        markerHtml = `
          <div class="relative flex flex-col items-center justify-center cursor-pointer transition-all duration-200">
            <div class="absolute -inset-2 rounded-full bg-blue-500 opacity-50 animate-pulse"></div>
            <div class="w-9 h-9 rounded-full bg-blue-600 border-2 border-white text-white shadow-xl flex items-center justify-center text-sm font-black ring-4 ring-blue-300 transform scale-110">
              ${routeStop.stopIndex}
            </div>
            <div class="mt-1 bg-neutral-900 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow border border-blue-400 max-w-[120px] truncate text-center pointer-events-none">
              תחנה #${routeStop.stopIndex}: ${client.name.split('/')[0]}
            </div>
          </div>
        `;
      } else {
        const bgClass = isProblematic
          ? 'bg-rose-600 border-rose-200'
          : 'bg-emerald-600 border-emerald-100';

        const iconEmoji = isProblematic ? '⚠️' : '📍';
        const glowRing = isSelected
          ? '<div class="absolute -inset-2.5 rounded-full bg-amber-400 opacity-80 animate-ping"></div>'
          : '';
        const ringBorder = isSelected
          ? 'ring-4 ring-amber-400 ring-offset-2 scale-115 shadow-2xl'
          : 'hover:scale-110';

        // Precise GPS Badge on Marker
        const gpsIndicator = client.hasExactGps
          ? '<span class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[9px] border border-white font-black shadow-sm" title="מיקום GPS מדויק 100%">🎯</span>'
          : '';

        const dragLabel = isSelected
          ? `<div class="mt-1 bg-amber-400 text-neutral-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow-lg border border-amber-600 flex items-center gap-1 cursor-grab active:cursor-grabbing whitespace-nowrap animate-bounce">
              <span>🎯 גרור לשער האתר</span>
            </div>`
          : `<div class="mt-1 bg-white/95 backdrop-blur-xs text-neutral-800 font-bold text-[10px] px-1.5 py-0.5 rounded shadow border border-neutral-200 max-w-[110px] truncate text-center pointer-events-none">
              ${client.name.split('/')[0]}
            </div>`;

        markerHtml = `
          <div class="relative flex flex-col items-center justify-center cursor-pointer transition-all duration-200">
            ${glowRing}
            <div class="relative w-8 h-8 rounded-full ${bgClass} ${ringBorder} text-white shadow-lg flex items-center justify-center text-xs font-black border-2 transition-transform">
              ${iconEmoji}
              ${gpsIndicator}
            </div>
            ${dragLabel}
          </div>
        `;
      }

      const isDraggable = isSelected && !routeStop;

      const customIcon = L.divIcon({
        className: 'custom-client-pin',
        html: markerHtml,
        iconSize: [42, 54],
        iconAnchor: [21, 24],
      });

      const marker = L.marker([client.lat, client.lng], {
        icon: customIcon,
        draggable: isDraggable,
        autoPan: true,
      })
        .addTo(map)
        .on('click', () => {
          onSelectClient(client);
        });

      if (isDraggable && onUpdateClientCoordinates) {
        marker.on('dragend', (event: L.LeafletEvent) => {
          const latLng = (event.target as L.Marker).getLatLng();
          onUpdateClientCoordinates(client.id, latLng.lat, latLng.lng);
        });
      }

      // Hover tooltip
      const gpsSourceText = client.gpsSource === 'sheet_col_p'
        ? '🎯 GPS מדויק 100% מעמודה P'
        : client.gpsSource === 'map_drag'
        ? '📍 נ.צ עודכן ידנית במפה'
        : client.hasExactGps
        ? '🎯 נ.צ מדויק'
        : '📍 מיקום משוער (ניתן לגרור לשער)';

      marker.bindTooltip(`
        <div class="p-1.5 text-right dir-rtl font-['Assistant']">
          <div class="font-bold text-xs text-neutral-900">${client.name}</div>
          <div class="text-[11px] text-neutral-600">${client.address}, ${client.city}</div>
          ${routeStop ? `<div class="mt-1 text-[10px] font-extrabold text-blue-600">🎯 תחנה #${routeStop.stopIndex} בסבב (LIFO העמסה #${routeStop.loadingOrder})</div>` : ''}
          <div class="mt-0.5 text-[10px] font-bold ${isProblematic ? 'text-rose-600' : 'text-emerald-600'}">
            ${isProblematic ? '⚠️ אתר בעייתי (+10% סיכון)' : '🟢 אתר תקין (שוטף)'}
          </div>
          <div class="mt-1 text-[10px] font-mono font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 inline-block">
            ${gpsSourceText}: ${client.lat.toFixed(6)}, ${client.lng.toFixed(6)}
          </div>
          ${isSelected ? '<div class="text-[9px] text-amber-700 font-bold mt-0.5">💡 גרור סיכה זו במפה לשער המדויק</div>' : ''}
        </div>
      `, { direction: 'top', offset: [0, -15], opacity: 0.95 });

      markersRef.current[client.id] = marker;
    });
  }, [clients, selectedClient, deliveryRound, onSelectClient, onUpdateClientCoordinates]);

  // Animation Loop (60fps requestAnimationFrame)
  useEffect(() => {
    if (!isPlaying || !circuit) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      lastTimeRef.current = null;
      return;
    }

    // Base total time at 1x is 28 seconds
    const BASE_DURATION_MS = 28000;

    const step = (timestamp: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }
      const deltaMs = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      const progressIncrement =
        (deltaMs / BASE_DURATION_MS) * playbackSpeedRef.current;
      const nextProg = Math.min(1, progressRef.current + progressIncrement);
      progressRef.current = nextProg;
      setProgress(nextProg);

      if (nextProg >= 1) {
        setIsPlaying(false);
        lastTimeRef.current = null;
        return;
      }

      animationFrameRef.current = requestAnimationFrame(step);
    };

    lastTimeRef.current = null;
    animationFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      lastTimeRef.current = null;
    };
  }, [isPlaying, circuit]);

  // Playback Control Handlers
  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      if (!prev && progressRef.current >= 0.995) {
        progressRef.current = 0;
        setProgress(0);
      }
      return !prev;
    });
  }, []);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    progressRef.current = 0;
    setProgress(0);
  }, []);

  const handleSeek = useCallback((newProgress: number) => {
    const clamped = Math.max(0, Math.min(1, newProgress));
    progressRef.current = clamped;
    setProgress(clamped);
  }, []);

  const handleJumpToWaypoint = useCallback(
    (wpIndex: number) => {
      if (!circuit) return;
      if (wpIndex <= 0) {
        handleSeek(0);
        return;
      }
      if (wpIndex >= circuit.waypoints.length - 1) {
        handleSeek(1);
        return;
      }
      // Target distance to start of segment wpIndex
      const targetDist = circuit.segments
        .slice(0, wpIndex)
        .reduce((acc, seg) => acc + seg.distanceKm, 0);
      const targetProgress =
        circuit.totalDistanceKm > 0 ? targetDist / circuit.totalDistanceKm : 0;
      handleSeek(targetProgress);
    },
    [circuit, handleSeek]
  );

  // Synchronize Moving Truck Marker & Traveled Polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!circuit || !truckState || !deliveryRound || deliveryRound.stops.length === 0) {
      if (playbackTruckMarkerRef.current) {
        map.removeLayer(playbackTruckMarkerRef.current);
        playbackTruckMarkerRef.current = null;
      }
      if (traveledPolylineRef.current) {
        map.removeLayer(traveledPolylineRef.current);
        traveledPolylineRef.current = null;
      }
      return;
    }

    // 1. Update or create Traveled Path Polyline (Emerald glow trail)
    if (!traveledPolylineRef.current) {
      const traveledPolyline = L.polyline(truckState.traveledCoords, {
        color: '#10b981', // Emerald-500
        weight: 6,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
      traveledPolylineRef.current = traveledPolyline;
    } else {
      traveledPolylineRef.current.setLatLngs(truckState.traveledCoords);
    }

    // 2. Animated Truck DivIcon with directional heading arrow & radar glow
    const truckIconHtml = `
      <div class="relative flex flex-col items-center justify-center cursor-pointer select-none pointer-events-none">
        <!-- Radar Pulse Glow -->
        <div class="absolute w-12 h-12 rounded-full bg-amber-400/40 animate-ping"></div>
        <div class="absolute w-9 h-9 rounded-full bg-blue-500/30 pulse-effect"></div>

        <!-- Direction Heading Arrow -->
        <div style="transform: rotate(${truckState.bearingDeg}deg) translateY(-20px);" class="absolute text-amber-400 text-xs font-black drop-shadow-md transition-transform duration-75">
          ▲
        </div>

        <!-- Truck Core Badge -->
        <div class="relative w-10 h-10 rounded-2xl bg-neutral-950 border-2 border-amber-400 shadow-2xl flex items-center justify-center text-lg text-white font-black ring-4 ring-neutral-900/60 transform hover:scale-110 transition-transform">
          🚛
        </div>

        <!-- Floating Status Label -->
        <div class="mt-1 bg-neutral-950/95 backdrop-blur-md text-amber-300 font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow-xl border border-amber-400/80 whitespace-nowrap max-w-[140px] truncate text-center pointer-events-none">
          ${truckState.statusHeadline}
        </div>
      </div>
    `;

    const truckIcon = L.divIcon({
      className: 'custom-playback-truck',
      html: truckIconHtml,
      iconSize: [44, 60],
      iconAnchor: [22, 28],
    });

    if (!playbackTruckMarkerRef.current) {
      const marker = L.marker([truckState.lat, truckState.lng], {
        icon: truckIcon,
        zIndexOffset: 2000,
      }).addTo(map);
      playbackTruckMarkerRef.current = marker;
    } else {
      playbackTruckMarkerRef.current.setLatLng([truckState.lat, truckState.lng]);
      playbackTruckMarkerRef.current.setIcon(truckIcon);
    }

    // 3. Follow Camera (Auto-Center on truck)
    if (followCamera && isPlaying) {
      map.panTo([truckState.lat, truckState.lng], { animate: true, duration: 0.25 });
    }
  }, [circuit, truckState, deliveryRound, followCamera, isPlaying]);

  // Clean up playback markers on unmount
  useEffect(() => {
    return () => {
      const map = mapInstanceRef.current;
      if (map) {
        if (playbackTruckMarkerRef.current) {
          map.removeLayer(playbackTruckMarkerRef.current);
          playbackTruckMarkerRef.current = null;
        }
        if (traveledPolylineRef.current) {
          map.removeLayer(traveledPolylineRef.current);
          traveledPolylineRef.current = null;
        }
      }
    };
  }, []);

  // Multi-Stop Circuit Polyline when in Route Planner mode or round active
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (multiStopPolylineRef.current) {
      map.removeLayer(multiStopPolylineRef.current);
      multiStopPolylineRef.current = null;
    }

    if (deliveryRound && deliveryRound.stops.length > 0) {
      // Build circuit: Depot -> Stop 1 -> Stop 2 -> ... -> Stop N -> Depot
      const circuitCoords: [number, number][] = [
        [depot.lat, depot.lng],
        ...deliveryRound.stops.map((s) => [s.client.lat, s.client.lng] as [number, number]),
        [depot.lat, depot.lng],
      ];

      const polyline = L.polyline(circuitCoords, {
        color: '#2563eb', // Blue-600
        weight: 5,
        opacity: isPlaying ? 0.6 : 0.9,
        dashArray: isPlaying ? '6, 6' : undefined,
        lineJoin: 'round',
      }).addTo(map);

      multiStopPolylineRef.current = polyline;

      // Fit bounds to show all circuit stops on initial load
      if (isRoutePlannerActive && !isPlaying && progress === 0) {
        try {
          map.fitBounds(polyline.getBounds(), { padding: [60, 60], maxZoom: 14 });
        } catch {
          // Fallback
        }
      }
    }
  }, [isRoutePlannerActive, deliveryRound, depot, isPlaying, progress]);

  // Single Route Polyline & FlyTo when selectedClient changes (if not in multi-stop mode)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }

    if (!isRoutePlannerActive && selectedClient) {
      const latlngs: [number, number][] = [
        [depot.lat, depot.lng],
        [selectedClient.lat, selectedClient.lng],
      ];

      const polyline = L.polyline(latlngs, {
        color: selectedClient.status === 'problematic' ? '#e11d48' : '#059669',
        weight: 4,
        opacity: 0.85,
        dashArray: '8, 8',
      }).addTo(map);

      routePolylineRef.current = polyline;

      const isDesktop = window.innerWidth >= 768;
      const targetLng = isDesktop ? selectedClient.lng + 0.015 : selectedClient.lng;

      map.flyTo([selectedClient.lat, targetLng], 14, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  }, [selectedClient, depot, isRoutePlannerActive]);

  return (
    <div className="relative w-full h-full">
      <div id="leaflet-map" ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Route Playback Controls on Map */}
      {circuit && truckState && deliveryRound && deliveryRound.stops.length > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[900] pointer-events-auto max-w-md md:max-w-lg w-[calc(100%-2rem)] md:w-auto flex justify-center">
          {isPlaybackPanelVisible ? (
            <RoutePlaybackControl
              deliveryRound={deliveryRound}
              circuit={circuit}
              truckState={truckState}
              isPlaying={isPlaying}
              playbackSpeed={playbackSpeed}
              followCamera={followCamera}
              onTogglePlay={handleTogglePlay}
              onReset={handleReset}
              onSeek={handleSeek}
              onChangeSpeed={setPlaybackSpeed}
              onToggleFollowCamera={() => setFollowCamera((prev) => !prev)}
              onJumpToWaypoint={handleJumpToWaypoint}
              onClose={() => {
                setIsPlaying(false);
                setIsPlaybackPanelVisible(false);
              }}
            />
          ) : (
            <button
              id="reopen-playback-btn"
              type="button"
              onClick={() => setIsPlaybackPanelVisible(true)}
              className="px-4 py-2.5 bg-neutral-950/95 backdrop-blur-md text-amber-300 hover:text-white border border-amber-400/80 rounded-2xl text-xs font-black flex items-center gap-2 shadow-2xl transition-all hover:scale-105 cursor-pointer animate-in fade-in slide-in-from-bottom-2"
            >
              <Truck className="w-4 h-4 text-amber-400" />
              <span>הפעל סימולציית נסיעה בסבב</span>
              <span className="bg-amber-400 text-neutral-950 px-2 py-0.5 rounded-full text-[10px] font-black">
                {deliveryRound.stops.length} תחנות
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
