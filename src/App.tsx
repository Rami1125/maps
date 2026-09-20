import React, { useState, useMemo, useCallback } from 'react';
import { ClientSite, TruckType, District } from './types';
import { CLIENT_SITES, DEPOT, TRUCKS } from './data/clients';
import { calculateDeliveryCostAndPrice } from './utils/pricing';
import { MapComponent } from './components/MapComponent';
import { SearchBar } from './components/SearchBar';
import { TruckToolbar } from './components/TruckToolbar';
import { ClientDetailsCard } from './components/ClientDetailsCard';
import { DepotDetailsCard } from './components/DepotDetailsCard';
import { WhatsAppModal } from './components/WhatsAppModal';
import { MapControls } from './components/MapControls';
import { Building2, Sparkles, Navigation, Layers } from 'lucide-react';

export default function App() {
  const [clients] = useState<ClientSite[]>(CLIENT_SITES);
  const [selectedClient, setSelectedClient] = useState<ClientSite | null>(() => {
    // Default open the first client or null
    return CLIENT_SITES[0] || null;
  });
  const [isDepotSelected, setIsDepotSelected] = useState<boolean>(false);
  const [currentTruckType, setCurrentTruckType] = useState<TruckType>('crane');
  const [fuelRateNis, setFuelRateNis] = useState<number>(6.5);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [mapLayerType, setMapLayerType] = useState<'standard' | 'voyager' | 'dark' | 'satellite'>('voyager');
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState<boolean>(false);

  const currentTruck = TRUCKS[currentTruckType];

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

  const handleSelectClient = useCallback((client: ClientSite) => {
    setSelectedClient(client);
    setIsDepotSelected(false);
  }, []);

  const handleSelectDepot = useCallback(() => {
    setIsDepotSelected(true);
    setSelectedClient(null);
  }, []);

  const handleCloseCard = useCallback(() => {
    setSelectedClient(null);
    setIsDepotSelected(false);
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
        />
      </div>

      {/* 2. Top Floating Navigation & Search Bar (Google Maps Style) */}
      <div className="absolute top-4 inset-x-4 z-30 pointer-events-none flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Right Section in RTL: Brand & Google Maps Floating Search Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 w-full md:w-auto">
          {/* Company Brand Logo Pill */}
          <div className="bg-neutral-900/90 text-white backdrop-blur-md rounded-2xl shadow-xl border border-neutral-700/80 px-3.5 py-2 flex items-center gap-2.5 pointer-events-auto">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-neutral-950 flex items-center justify-center font-black text-sm shadow-sm">
              סבן
            </div>
            <div>
              <h1 className="font-extrabold text-xs md:text-sm tracking-tight text-white leading-none">
                ח. סבן חומרי בניין (1994) בע״מ
              </h1>
              <p className="text-[10px] text-amber-400 font-medium leading-tight mt-0.5">
                SabanOS Live Map & Client Discovery
              </p>
            </div>
          </div>

          {/* Floating Search Bar */}
          <SearchBar
            clients={clients}
            selectedClient={selectedClient}
            onSelectClient={handleSelectClient}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            onResetToDepot={handleSelectDepot}
          />
        </div>

        {/* Left Section in RTL: Truck Switcher & Fuel Rate Toolbar */}
        <div className="pointer-events-auto">
          <TruckToolbar
            currentTruck={currentTruck}
            trucks={TRUCKS}
            onSelectTruck={setCurrentTruckType}
            fuelRateNis={fuelRateNis}
            onUpdateFuelRate={setFuelRateNis}
          />
        </div>
      </div>

      {/* 3. Floating Client Details Card / Depot Card (Right side on Desktop RTL, Bottom Sheet on Mobile) */}
      <div className="absolute top-24 md:top-28 right-4 bottom-6 z-20 pointer-events-none flex flex-col justify-end md:justify-start">
        {selectedClient && activePricing && (
          <ClientDetailsCard
            client={selectedClient}
            truck={currentTruck}
            pricing={activePricing}
            onClose={handleCloseCard}
            onOpenWhatsAppModal={() => setIsWhatsAppModalOpen(true)}
          />
        )}

        {isDepotSelected && (
          <DepotDetailsCard
            depot={DEPOT}
            trucks={TRUCKS}
            onClose={handleCloseCard}
            onFocusDepot={() => {}}
          />
        )}
      </div>

      {/* 4. Bottom-Right Controls (Zoom is already bottom-left in Leaflet) */}
      <div className="absolute bottom-6 left-6 z-30 pointer-events-none">
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

      {/* 5. WhatsApp Export Modal */}
      {isWhatsAppModalOpen && selectedClient && activePricing && (
        <WhatsAppModal
          client={selectedClient}
          truck={currentTruck}
          pricing={activePricing}
          onClose={() => setIsWhatsAppModalOpen(false)}
        />
      )}
    </div>
  );
}
