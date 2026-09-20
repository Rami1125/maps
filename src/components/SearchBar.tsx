import React, { useState, useRef, useEffect } from 'react';
import { Search, X, MapPin, AlertTriangle, CheckCircle2, ChevronDown, Building2, Truck, PlusCircle, Sparkles } from 'lucide-react';
import { ClientSite } from '../types';
import { calculateDrivingDistanceKm } from '../data/clients';
import { DEPOT } from '../data/clients';

interface SearchBarProps {
  clients: ClientSite[];
  selectedClient: ClientSite | null;
  onSelectClient: (client: ClientSite) => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onResetToDepot: () => void;
  onOpenAddClientModal?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  clients,
  selectedClient,
  onSelectClient,
  activeFilter,
  onFilterChange,
  onResetToDepot,
  onOpenAddClientModal,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter clients based on query
  const filteredClients = query.trim().length >= 2
    ? clients.filter((c) => {
        const q = query.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.address.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          c.comaxId.toLowerCase().includes(q) ||
          c.contactName.toLowerCase().includes(q) ||
          c.district.toLowerCase().includes(q)
        );
      })
    : [];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (client: ClientSite) => {
    onSelectClient(client);
    setQuery(client.name);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const filterChips = [
    { id: 'all', label: 'כל האתרים', count: clients.length },
    { id: 'standard', label: '🟢 תקינים', count: clients.filter((c) => c.status === 'standard').length },
    { id: 'problematic', label: '🔴 בעייתיים (+10%)', count: clients.filter((c) => c.status === 'problematic').length },
    { id: 'sharon', label: 'השרון', count: clients.filter((c) => c.district === 'השרון').length },
    { id: 'telaviv', label: 'תל אביב', count: clients.filter((c) => c.district === 'תל אביב').length },
  ];

  return (
    <div
      ref={containerRef}
      className="relative z-30 w-full max-w-md pointer-events-auto transition-all"
    >
      {/* Search Input Box (Google Maps Floating Style) */}
      <div className="bg-white rounded-2xl shadow-xl border border-neutral-200/80 overflow-hidden backdrop-blur-md transition-shadow focus-within:shadow-2xl focus-within:border-blue-500">
        <div className="flex items-center px-4 py-2.5 gap-2.5">
          <button
            type="button"
            onClick={onResetToDepot}
            title="חזרה למגרש סבן (בסיס מוצא)"
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer flex-shrink-0"
          >
            <Building2 className="w-5 h-5 text-blue-600" />
          </button>

          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              dir="rtl"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
                setHighlightedIndex(0);
              }}
              onFocus={() => {
                if (query.trim().length >= 2) setIsOpen(true);
              }}
              placeholder="חפש לקוח, כתובת, עיר או מספר לקוח בקומקס..."
              className="w-full bg-transparent text-sm md:text-base font-semibold text-neutral-800 placeholder-neutral-400 outline-none pr-1"
            />
          </div>

          {query ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <Search className="w-4 h-4 text-neutral-400 flex-shrink-0" />
          )}

          {onOpenAddClientModal && (
            <button
              type="button"
              onClick={onOpenAddClientModal}
              title="איתור גיאוגרפי של כתובת חדשה בישראל"
              className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors flex-shrink-0 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Live Autocomplete Dropdown */}
        {isOpen && query.trim().length >= 2 && (
          <div className="border-t border-neutral-100 max-h-80 overflow-y-auto divide-y divide-neutral-100 bg-white">
            {filteredClients.length === 0 ? (
              <div className="p-4 text-center text-xs text-neutral-600 space-y-2">
                <p>לא נמצא לקוח קיים התואם את "{query}" במאגר</p>
                {onOpenAddClientModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenAddClientModal();
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-1.5 mx-auto text-xs transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>אתר כתובת חדשה זו בישראל ברשת</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                {filteredClients.map((client, idx) => {
                  const isSelected = selectedClient?.id === client.id;
                  const isProblematic = client.status === 'problematic';
                  const { distanceKm } = calculateDrivingDistanceKm(
                    DEPOT.lat,
                    DEPOT.lng,
                    client.lat,
                    client.lng
                  );

                  return (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => handleSelect(client)}
                      className={`w-full text-right px-4 py-3 hover:bg-blue-50/70 transition-colors flex items-start gap-3 cursor-pointer ${
                        isSelected ? 'bg-blue-50/90' : ''
                      } ${idx === highlightedIndex ? 'bg-neutral-50' : ''}`}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {isProblematic ? (
                          <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs">
                            ⚠️
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">
                            📍
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-bold text-sm text-neutral-900 truncate">
                            {client.name}
                          </div>
                          <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">
                            קומקס #{client.comaxId}
                          </span>
                        </div>

                        <div className="text-xs text-neutral-500 flex items-center gap-1.5 mt-0.5">
                          <span className="truncate">{client.address}, {client.city}</span>
                          <span>•</span>
                          <span className="font-medium text-neutral-700 whitespace-nowrap">{distanceKm} ק"מ</span>
                        </div>

                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isProblematic
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {isProblematic ? 'בעייתי (+10% סיכון)' : 'תקין (שוטף)'}
                          </span>
                          <span className="text-[10px] text-neutral-500">
                            פריקה: {client.craneUnloadMinutes} דק׳
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {/* Option to geocode anyway */}
                {onOpenAddClientModal && (
                  <div className="p-2 bg-neutral-50 text-center border-t border-neutral-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onOpenAddClientModal();
                      }}
                      className="text-blue-600 hover:text-blue-800 text-xs font-bold py-1 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>איתור כתובת גיאוגרפית נוספת...</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Quick Filter Chips */}
      <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 no-scrollbar">
        {filterChips.map((chip) => {
          const isActive = activeFilter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => onFilterChange(chip.id)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap shadow-md transition-all cursor-pointer ${
                isActive
                  ? 'bg-neutral-900 text-white shadow-neutral-900/20'
                  : 'bg-white/95 backdrop-blur-md text-neutral-700 hover:bg-neutral-100 border border-neutral-200/80'
              }`}
            >
              {chip.label} ({chip.count})
            </button>
          );
        })}
      </div>
    </div>
  );
};
