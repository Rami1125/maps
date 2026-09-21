import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ClientSite, TruckType, District, DeliveryRound } from './types';
import { CLIENT_SITES, DEPOT, TRUCKS, calculateDrivingDistanceKm } from './data/clients';
import { calculateDeliveryCostAndPrice } from './utils/pricing';
import { buildDeliveryRound } from './utils/routePlanner';
import { fetchClientsFromSheets, SyncStatus, DEFAULT_APPS_SCRIPT_URL } from './services/sheetsService';
import { MapComponent } from './components/MapComponent';
import { SearchBar } from './components/SearchBar';
import { TruckToolbar } from './components/TruckToolbar';
import { ClientDetailsCard } from './components/ClientDetailsCard';
import { DepotDetailsCard } from './components/DepotDetailsCard';
import { WhatsAppModal } from './components/WhatsAppModal';
import { MapControls } from './components/MapControls';
import { RoutePlanner } from './components/RoutePlanner';
import { AddClientModal } from './components/AddClientModal';
import { SyncSettingsModal } from './components/SyncSettingsModal';
import { UnifiedAuditModal } from './components/UnifiedAuditModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { playSelectionChime } from './utils/audioChime';
import {
  Building2,
  Sparkles,
  Navigation,
  Layers,
  Route,
  RefreshCw,
  Plus,
  FileSpreadsheet,
  CheckCircle2,
  Scale,
} from 'lucide-react';

export default function App() {
  const [clients, setClients] = useState<ClientSite[]>(CLIENT_SITES);
  const [selectedClient, setSelectedClient] = useState<ClientSite | null>(() => {
    return CLIENT_SITES[0] || null;
  });
  const [isDepotSelected, setIsDepotSelected] = useState<boolean>(false);
  const [currentTruckType, setCurrentTruckType] = useState<TruckType>('crane');
  const [fuelRateNis, setFuelRateNis] = useState<number>(6.5);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [mapLayerType, setMapLayerType] = useState<'standard' | 'voyager' | 'dark' | 'satellite'>(() => {
    try {
      const saved = localStorage.getItem('saban_map_layer');
      if (saved === 'standard' || saved === 'voyager' || saved === 'dark' || saved === 'satellite') {
        return saved;
      }
    } catch {
      // fallback to standard
    }
    return 'standard';
  });

  useEffect(() => {
    try {
      localStorage.setItem('saban_map_layer', mapLayerType);
    } catch {
      // ignore
    }
  }, [mapLayerType]);

  // Modals state
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState<boolean>(false);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState<boolean>(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [isRoutePlannerOpen, setIsRoutePlannerOpen] = useState<boolean>(false);
  const [isUnifiedAuditOpen, setIsUnifiedAuditOpen] = useState<boolean>(false);
  const [auditInitialTab, setAuditInitialTab] = useState<'matrix' | 'trends' | 'delivery_note' | 'methodology'>('matrix');
  const [auditInitialOrderNumber, setAuditInitialOrderNumber] = useState<string | undefined>(undefined);

  // Multi-Stop Route Planner state (2-5 stops)
  const [routeStops, setRouteStops] = useState<ClientSite[]>([]);

  // Smart Search & Dynamic GIS Interaction State
  const [searchMatchingClients, setSearchMatchingClients] = useState<ClientSite[] | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleSearchResultsChange = useCallback((matching: ClientSite[], q: string) => {
    if (q.trim().length >= 3) {
      setSearchMatchingClients(matching);
      setSearchQuery(q);
    } else {
      setSearchMatchingClients(null);
      setSearchQuery('');
    }
  }, []);

  // Google Sheets Sync State
  const [customScriptUrl, setCustomScriptUrl] = useState<string>(() => {
    return localStorage.getItem('saban_custom_script_url') || DEFAULT_APPS_SCRIPT_URL;
  });
  const [isSyncLoading, setIsSyncLoading] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    source: 'local_database',
    syncedAt: new Date(),
    count: CLIENT_SITES.length,
    message: 'מאגר מקומי טעון (63 לקוחות היסטוריים ומדויקים של ח. סבן חומרי בניין)',
    isLive: false,
  });

  const currentTruck = TRUCKS[currentTruckType];

  // Try initial sync with Google Sheets on load
  useEffect(() => {
    let isMounted = true;
    const syncInitial = async () => {
      setIsSyncLoading(true);
      const result = await fetchClientsFromSheets(customScriptUrl);
      if (isMounted) {
        if (result.status.isLive && result.clients.length > 0) {
          setClients(result.clients);
        }
        setSyncStatus(result.status);
        setIsSyncLoading(false);
      }
    };

    syncInitial();
    return () => {
      isMounted = false;
    };
  }, [customScriptUrl]);

  // Handle Manual Google Sheets Refresh
  const handleRefreshSheets = async () => {
    setIsSyncLoading(true);
    const result = await fetchClientsFromSheets(customScriptUrl);
    if (result.clients && result.clients.length > 0) {
      setClients(result.clients);
    }
    setSyncStatus(result.status);
    setIsSyncLoading(false);
  };

  const handleUpdateScriptUrl = (url: string) => {
    setCustomScriptUrl(url);
    localStorage.setItem('saban_custom_script_url', url);
  };

  // Filter clients based on filter chips
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      if (activeFilter === 'standard') return client.status === 'standard';
      if (activeFilter === 'problematic') return client.status === 'problematic';
      if (activeFilter === 'sharon') return client.district === 'השרון';
      if (activeFilter === 'telaviv') return client.district === 'תל אביב';
      return true;
    });
  }, [clients, activeFilter]);

  // Recalculate dynamic pricing for selected client
  const activePricing = useMemo(() => {
    if (!selectedClient) return null;
    return calculateDeliveryCostAndPrice(selectedClient, currentTruck, fuelRateNis);
  }, [selectedClient, currentTruck, fuelRateNis]);

  // Multi-stop delivery round calculation
  const deliveryRound: DeliveryRound | null = useMemo(() => {
    if (routeStops.length === 0) return null;
    return buildDeliveryRound(routeStops, currentTruck, fuelRateNis);
  }, [routeStops, currentTruck, fuelRateNis]);

  // Route stop operations
  const handleAddStopToRoute = useCallback((client: ClientSite) => {
    setRouteStops((prev) => {
      if (prev.some((s) => s.id === client.id)) return prev;
      if (prev.length >= 5) return prev; // max 5 stops
      return [...prev, client];
    });
    setIsRoutePlannerOpen(true);
  }, []);

  const handleRemoveStopFromRoute = useCallback((clientId: string) => {
    setRouteStops((prev) => prev.filter((s) => s.id !== clientId));
  }, []);

  const handleReorderRouteStops = useCallback((newStops: ClientSite[]) => {
    setRouteStops(newStops);
  }, []);

  const handleClearAllRouteStops = useCallback(() => {
    setRouteStops([]);
  }, []);

  const handleSelectClient = useCallback((client: ClientSite) => {
    playSelectionChime();
    setSelectedClient(client);
    setIsDepotSelected(false);
  }, []);

  const handleSelectDepot = useCallback(() => {
    setIsDepotSelected(true);
    setSelectedClient(null);
    setSearchMatchingClients(null);
    setSearchQuery('');
  }, []);

  const handleCloseCard = useCallback(() => {
    setSelectedClient(null);
    setIsDepotSelected(false);
  }, []);

  // Update Client Coordinates on Map Pin Drag (Precision Gate Location)
  const handleUpdateClientCoordinates = useCallback((clientId: string, newLat: number, newLng: number) => {
    const { distanceKm } = calculateDrivingDistanceKm(DEPOT.lat, DEPOT.lng, newLat, newLng);

    const updateFn = (c: ClientSite): ClientSite => {
      if (c.id !== clientId) return c;
      return {
        ...c,
        lat: newLat,
        lng: newLng,
        distanceKm,
        hasExactGps: true,
        gpsCoordinates: `${newLat.toFixed(7)}, ${newLng.toFixed(7)}`,
        gpsSource: 'map_drag',
      };
    };

    setClients((prev) => prev.map(updateFn));
    setSelectedClient((prev) => (prev && prev.id === clientId ? updateFn(prev) : prev));
    setRouteStops((prev) => prev.map(updateFn));
  }, []);

  // When a newly geocoded client is added
  const handleClientAdded = useCallback((newClient: ClientSite) => {
    setClients((prev) => [newClient, ...prev]);
    setSelectedClient(newClient);
    setIsDepotSelected(false);
    setIsAddClientModalOpen(false);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-neutral-100 font-['Assistant',sans-serif] text-neutral-900 dir-rtl">
      {/* 1. Full Screen Interactive Map */}
      <div className="absolute inset-0 z-0">
        <MapComponent
          depot={DEPOT}
          clients={filteredClients}
          selectedClient={selectedClient}
          onSelectClient={handleSelectClient}
          onSelectDepot={handleSelectDepot}
          isDepotSelected={isDepotSelected}
          mapLayerType={mapLayerType}
          deliveryRound={deliveryRound}
          isRoutePlannerActive={isRoutePlannerOpen}
          onUpdateClientCoordinates={handleUpdateClientCoordinates}
          searchMatchingClients={searchMatchingClients}
          searchQuery={searchQuery}
        />
      </div>

      {/* 2. Top Floating Navigation & Search Bar (Google Maps Style) */}
      <div className="absolute top-3 inset-x-3 md:top-4 md:inset-x-4 z-20 pointer-events-none flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-3">
        {/* Right Section in RTL: Brand & Google Maps Floating Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          {/* Company Brand Logo Pill */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/80 px-3 py-1.5 md:py-2 flex items-center justify-between sm:justify-start gap-2.5 pointer-events-auto shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center font-black text-xs md:text-sm text-neutral-950 shadow-xs shrink-0">
                סבן
              </div>
              <div>
                <h1 className="font-extrabold text-xs md:text-sm tracking-tight text-neutral-900 leading-none truncate">
                  ח. סבן חומרי בניין (1994) בע״מ
                </h1>
                <p className="text-[10px] md:text-[11px] font-bold text-sky-700 leading-tight mt-0.5">
                  SabanOS Maps — ניהול הובלות
                </p>
              </div>
            </div>
          </div>

          {/* Floating Search Bar with Smart Filter dropdown */}
          <SearchBar
            clients={clients}
            selectedClient={selectedClient}
            onSelectClient={handleSelectClient}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            onResetToDepot={handleSelectDepot}
            onOpenAddClientModal={() => setIsAddClientModalOpen(true)}
            onSearchResultsChange={handleSearchResultsChange}
          />
        </div>

        {/* Left Section in RTL: Action Controls Ribbon */}
        <div className="w-full md:w-auto overflow-x-auto no-scrollbar py-0.5 flex items-center gap-1.5 pointer-events-auto">
          {/* PWA App Install Button */}
          <PWAInstallButton />

          {/* Unified System - Orders, Delivery Notes & Cross-Validation */}
          <button
            type="button"
            onClick={() => {
              setAuditInitialTab('matrix');
              setIsUnifiedAuditOpen(true);
            }}
            title="מערכת מאוחדת - הזמנות, תעודות משלוח והצלבה (דוחות איתוראן אוג׳-ספט׳)"
            className="min-h-[36px] px-3 py-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-amber-500 hover:to-orange-500 text-neutral-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md border border-amber-300 transition-all cursor-pointer whitespace-nowrap active:scale-95 shrink-0"
          >
            <span className="text-xs">⚖️</span>
            <span>הצלבה ומערכת מאוחדת</span>
          </button>

          {/* Multi-Stop Route Planner Toggle Button */}
          <button
            type="button"
            onClick={() => setIsRoutePlannerOpen(!isRoutePlannerOpen)}
            className={`min-h-[36px] px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer whitespace-nowrap active:scale-95 shrink-0 ${
              isRoutePlannerOpen
                ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                : routeStops.length > 0
                ? 'bg-white text-blue-700 border border-blue-300 animate-pulse'
                : 'bg-white/95 text-neutral-800 hover:bg-neutral-100 border border-neutral-200'
            }`}
          >
            <Route className="w-3.5 h-3.5 text-blue-500" />
            <span>סבב חלוקה {routeStops.length > 0 ? `(${routeStops.length})` : ''}</span>
          </button>

          {/* Add Client / Geocoding button */}
          <button
            type="button"
            onClick={() => setIsAddClientModalOpen(true)}
            title="איתור גיאוגרפי של כתובת חדשה"
            className="min-h-[36px] px-2.5 py-1.5 bg-white/95 text-neutral-800 hover:bg-neutral-100 border border-neutral-200 rounded-xl text-xs font-bold flex items-center gap-1 shadow-md transition-colors cursor-pointer whitespace-nowrap active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            <span>יעד חדש</span>
          </button>

          {/* Google Sheets Sync Pill */}
          <button
            type="button"
            onClick={() => setIsSyncModalOpen(true)}
            title="הגדרות סנכרון Google Sheets ו-Make.com"
            className={`min-h-[36px] px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md border transition-all cursor-pointer whitespace-nowrap active:scale-95 shrink-0 ${
              syncStatus.scriptError
                ? 'bg-amber-950/90 text-amber-300 border-amber-500'
                : 'bg-neutral-900/90 text-white border-neutral-700'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                syncStatus.isLive
                  ? 'bg-emerald-400 animate-ping'
                  : syncStatus.scriptError
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-blue-400'
              }`}
            />
            <span className="text-[11px]">
              {syncStatus.isLive ? 'Sheets חי' : 'מאגר 63'}
            </span>
          </button>

          {/* Truck Switcher on Desktop (on mobile, driver switcher is inside the Bottom Sheet) */}
          <div className="hidden lg:flex items-center shrink-0">
            <TruckToolbar
              currentTruck={currentTruck}
              trucks={TRUCKS}
              onSelectTruck={setCurrentTruckType}
              fuelRateNis={fuelRateNis}
              onUpdateFuelRate={setFuelRateNis}
            />
          </div>
        </div>
      </div>

      {/* 3. Bottom Sheet (Mobile) & Floating Side Drawer (Desktop) */}
      <div className="fixed inset-x-0 bottom-0 z-30 pointer-events-none md:static md:z-20 flex flex-col justify-end md:fixed md:top-24 md:right-4 md:bottom-6 md:w-[460px]">
        {/* If Route Planner is open, prioritize it */}
        {isRoutePlannerOpen ? (
          <RoutePlanner
            allClients={clients}
            selectedStops={routeStops}
            deliveryRound={deliveryRound}
            truck={currentTruck}
            fuelRateNis={fuelRateNis}
            onAddStop={handleAddStopToRoute}
            onRemoveStop={handleRemoveStopFromRoute}
            onReorderStops={handleReorderRouteStops}
            onClearAllStops={handleClearAllRouteStops}
            onClose={() => setIsRoutePlannerOpen(false)}
          />
        ) : selectedClient && activePricing ? (
          <ClientDetailsCard
            client={selectedClient}
            truck={currentTruck}
            pricing={activePricing}
            onClose={handleCloseCard}
            onOpenWhatsAppModal={() => setIsWhatsAppModalOpen(true)}
            onAddToRoute={handleAddStopToRoute}
            isInRoute={routeStops.some((s) => s.id === selectedClient.id)}
            onSelectTruck={setCurrentTruckType}
            allTrucks={TRUCKS}
            onOpenTrends={(c) => {
              setSelectedClient(c);
              setAuditInitialTab('trends');
              setIsUnifiedAuditOpen(true);
            }}
            onOpenDeliveryNote={(c, order) => {
              setSelectedClient(c);
              setAuditInitialTab('delivery_note');
              setAuditInitialOrderNumber(order?.orderNumber);
              setIsUnifiedAuditOpen(true);
            }}
          />
        ) : isDepotSelected ? (
          <DepotDetailsCard
            depot={DEPOT}
            trucks={TRUCKS}
            onClose={handleCloseCard}
            onFocusDepot={() => {}}
          />
        ) : null}
      </div>

      {/* 4. Map Tool Controls (Layer z-10, positioned out of way of cards & bottom sheets) */}
      <div className="absolute top-24 left-3 md:top-auto md:bottom-6 md:left-6 z-10 pointer-events-none">
        <MapControls
          mapLayerType={mapLayerType}
          onChangeLayer={setMapLayerType}
          onCenterDepot={handleSelectDepot}
          onFitAll={() => {
            handleCloseCard();
          }}
          clientsCount={clients.length}
          problematicCount={clients.filter((c) => c.status === 'problematic').length}
        />
      </div>

      {/* 5. WhatsApp Export & Webhook Modal */}
      {isWhatsAppModalOpen && selectedClient && activePricing && (
        <WhatsAppModal
          client={selectedClient}
          truck={currentTruck}
          pricing={activePricing}
          onClose={() => setIsWhatsAppModalOpen(false)}
        />
      )}

      {/* 6. Add Client / Geocoding Modal */}
      {isAddClientModalOpen && (
        <AddClientModal
          onClientAdded={handleClientAdded}
          onClose={() => setIsAddClientModalOpen(false)}
        />
      )}

      {/* 7. Google Sheets & Make.com Sync Settings Modal */}
      {isSyncModalOpen && (
        <SyncSettingsModal
          syncStatus={syncStatus}
          customScriptUrl={customScriptUrl}
          onUpdateScriptUrl={handleUpdateScriptUrl}
          onRefreshFromSheets={handleRefreshSheets}
          isLoading={isSyncLoading}
          onClose={() => setIsSyncModalOpen(false)}
        />
      )}

      {/* 8. Unified System - Orders, Delivery Notes & Cross-Validation Modal */}
      <UnifiedAuditModal
        isOpen={isUnifiedAuditOpen}
        onClose={() => setIsUnifiedAuditOpen(false)}
        clients={clients}
        onSelectClient={handleSelectClient}
        initialClientId={selectedClient?.id}
        initialTab={auditInitialTab}
        initialOrderNumber={auditInitialOrderNumber}
        onAddToRoute={(client) => {
          handleAddStopToRoute(client);
          setIsRoutePlannerOpen(true);
        }}
      />

      {/* 9. Offline Connectivity Indicator */}
      <OfflineIndicator />
    </div>
  );
}
