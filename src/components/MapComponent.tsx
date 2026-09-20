import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { ClientSite, DepotInfo } from '../types';

interface MapComponentProps {
  depot: DepotInfo;
  clients: ClientSite[];
  selectedClient: ClientSite | null;
  onSelectClient: (client: ClientSite) => void;
  onSelectDepot: () => void;
  isDepotSelected: boolean;
  mapLayerType: 'standard' | 'voyager' | 'dark' | 'satellite';
}

export const MapComponent: React.FC<MapComponentProps> = ({
  depot,
  clients,
  selectedClient,
  onSelectClient,
  onSelectDepot,
  isDepotSelected,
  mapLayerType,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const depotMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [depot.lat, depot.lng],
      zoom: 12,
      zoomControl: false, // We'll reposition zoom control to bottom-left to not clash with top floating bars
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

  // Update Tile Layer based on layer type
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let url = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    let attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

    if (mapLayerType === 'standard') {
      url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
    } else if (mapLayerType === 'dark') {
      url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    } else if (mapLayerType === 'satellite') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
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
        <div class="absolute -bottom-6 bg-blue-900/90 backdrop-blur-sm text-amber-300 font-bold text-[11px] px-2 py-0.5 rounded-full border border-amber-400/50 shadow-md whitespace-nowrap">
          מגרש סבן (בסיס)
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

      const bgClass = isProblematic
        ? 'bg-rose-600 border-rose-200'
        : 'bg-emerald-600 border-emerald-100';

      const iconEmoji = isProblematic ? '⚠️' : '📍';
      const glowRing = isSelected
        ? '<div class="absolute -inset-2 rounded-full bg-amber-400 opacity-70 animate-ping"></div>'
        : '';
      const ringBorder = isSelected
        ? 'ring-4 ring-amber-400 ring-offset-2 scale-110'
        : 'hover:scale-110';

      const markerHtml = `
        <div class="relative flex flex-col items-center justify-center cursor-pointer transition-all duration-200">
          ${glowRing}
          <div class="w-8 h-8 rounded-full ${bgClass} ${ringBorder} text-white shadow-lg flex items-center justify-center text-xs font-black border-2 transition-transform">
            ${iconEmoji}
          </div>
          <div class="mt-1 bg-white/95 backdrop-blur-xs text-neutral-800 font-bold text-[10px] px-1.5 py-0.5 rounded shadow border border-neutral-200 max-w-[110px] truncate text-center pointer-events-none">
            ${client.name.split('/')[0]}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-client-pin',
        html: markerHtml,
        iconSize: [36, 48],
        iconAnchor: [18, 20],
      });

      const marker = L.marker([client.lat, client.lng], { icon: customIcon })
        .addTo(map)
        .on('click', () => {
          onSelectClient(client);
        });

      // Simple hover tooltip
      marker.bindTooltip(`
        <div class="p-1 text-right dir-rtl font-['Assistant']">
          <div class="font-bold text-xs text-neutral-900">${client.name}</div>
          <div class="text-[11px] text-neutral-600">${client.address}, ${client.city}</div>
          <div class="mt-0.5 text-[10px] font-bold ${isProblematic ? 'text-rose-600' : 'text-emerald-600'}">
            ${isProblematic ? '⚠️ אתר בעייתי (+10% סיכון)' : '🟢 אתר תקין (שוטף)'}
          </div>
        </div>
      `, { direction: 'top', offset: [0, -15], opacity: 0.95 });

      markersRef.current[client.id] = marker;
    });
  }, [clients, selectedClient, onSelectClient]);

  // Route Polyline & FlyTo when selectedClient changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }

    if (selectedClient) {
      const latlngs: [number, number][] = [
        [depot.lat, depot.lng],
        [selectedClient.lat, selectedClient.lng],
      ];

      // Draw direct connecting route line
      const polyline = L.polyline(latlngs, {
        color: selectedClient.status === 'problematic' ? '#e11d48' : '#059669',
        weight: 4,
        opacity: 0.85,
        dashArray: '8, 8',
      }).addTo(map);

      routePolylineRef.current = polyline;

      // Fly to view both or center on client with offset for floating right card
      // In RTL desktop, the card is on the right, so we offset slightly left
      const isDesktop = window.innerWidth >= 768;
      const targetLng = isDesktop ? selectedClient.lng + 0.015 : selectedClient.lng;

      map.flyTo([selectedClient.lat, targetLng], 14, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  }, [selectedClient, depot]);

  return (
    <div className="relative w-full h-full">
      <div id="leaflet-map" ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
