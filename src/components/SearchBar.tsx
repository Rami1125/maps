import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  X,
  MapPin,
  Building2,
  Truck,
  PlusCircle,
  Sparkles,
  Barcode,
  Navigation2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { ClientSite } from '../types';
import { calculateDrivingDistanceKm, DEPOT } from '../data/clients';
import { matchClient, HighlightSubstring } from '../utils/searchUtils';
import { playSelectionChime } from '../utils/audioChime';

interface SearchBarProps {
  clients: ClientSite[];
  selectedClient: ClientSite | null;
  onSelectClient: (client: ClientSite) => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onResetToDepot: () => void;
  onOpenAddClientModal?: () => void;
  onSearchResultsChange?: (matchingClients: ClientSite[], query: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  clients,
  selectedClient,
  onSelectClient,
  activeFilter,
  onFilterChange,
  onResetToDepot,
  onOpenAddClientModal,
  onSearchResultsChange,
}) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 150ms Debounce mechanism to prevent jitter and heavy UI updates
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  // Multi-field fuzzy search activated strictly from 3 characters and above
  const filteredClients = useMemo(() => {
    if (debouncedQuery.trim().length < 3) {
      return [];
    }
    return clients.filter((c) => matchClient(c, debouncedQuery));
  }, [clients, debouncedQuery]);

  // Sync search results with parent/map for dynamic camera & pin adjustments
  useEffect(() => {
    if (onSearchResultsChange) {
      if (debouncedQuery.trim().length >= 3) {
        onSearchResultsChange(filteredClients, debouncedQuery);
      } else {
        onSearchResultsChange([], '');
      }
    }
  }, [debouncedQuery, filteredClients, onSearchResultsChange]);

  // Auto-scroll highlighted row into view on keyboard navigation
  useEffect(() => {
    if (listRef.current && isOpen && filteredClients.length > 0) {
      const activeElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex, isOpen, filteredClients.length]);

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
    playSelectionChime();
    onSelectClient(client);
    setQuery(client.name);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setDebouncedQuery('');
    setIsOpen(false);
    onResetToDepot();
    inputRef.current?.focus();
  };

  // Keyboard Navigation: Up, Down, Enter, Escape
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredClients.length === 0 && e.key !== 'Escape') return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex((prev) => (prev < filteredClients.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredClients.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredClients[highlightedIndex]) {
          handleSelect(filteredClients[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const filterChips = [
    { id: 'all', label: 'כל האתרים', count: clients.length },
    { id: 'standard', label: '🟢 תקינים', count: clients.filter((c) => c.status === 'standard').length },
    { id: 'problematic', label: '🔴 בעייתיים (+10%)', count: clients.filter((c) => c.status === 'problematic').length },
    { id: 'sharon', label: 'השרון', count: clients.filter((c) => c.district === 'השרון').length },
    { id: 'telaviv', label: 'תל אביב', count: clients.filter((c) => c.district === 'תל אביב').length },
  ];

  const hasThreeChars = query.trim().length >= 3;
  const isTyping = query.length > 0;

  return (
    <div
      ref={containerRef}
      id="smart-floating-search-container"
      className="relative z-40 w-full max-w-md pointer-events-auto transition-all"
    >
      {/* 1. Modern Floating Search Bar Container (Glassmorphism & Elevation) */}
      <div className="relative rounded-2xl bg-white/95 backdrop-blur-md shadow-xl border border-slate-200/80 transition-all duration-200 focus-within:shadow-2xl focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-200">
        <div className="flex items-center px-3.5 py-2.5 gap-2.5">
          {/* Depot Quick Reset Button */}
          <button
            type="button"
            onClick={onResetToDepot}
            title="חזרה למבט-על מלא: מגרש סבן החרש 10 (בסיס מוצא)"
            className="p-2 text-sky-700 hover:bg-sky-50 rounded-xl transition-colors cursor-pointer flex-shrink-0 group"
          >
            <Building2 className="w-5 h-5 text-sky-600 group-hover:scale-110 transition-transform" />
          </button>

          {/* Interactive Search Icon (Changes to Sky-600 when typing) */}
          <Search
            className={`w-5 h-5 flex-shrink-0 transition-colors duration-200 ${
              isTyping ? 'text-sky-600 animate-pulse' : 'text-slate-400'
            }`}
          />

          {/* Search Input Field */}
          <div className="relative flex-1 min-w-0">
            <input
              ref={inputRef}
              type="text"
              dir="rtl"
              value={query}
              onChange={(e) => {
                const val = e.target.value;
                setQuery(val);
                setHighlightedIndex(0);
                if (val.trim().length >= 3) {
                  setIsOpen(true);
                } else {
                  setIsOpen(false);
                }
              }}
              onFocus={() => {
                if (query.trim().length >= 3) setIsOpen(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder="חפש לקוח, כתובת, עיר (למשל כ&quot;ס, פ&quot;ת) או קוד קומקס..."
              className="w-full bg-transparent text-sm md:text-base font-bold text-slate-900 placeholder-slate-400 outline-none pr-0.5 leading-normal"
            />
          </div>

          {/* Live Dynamic Result Counter Badge */}
          {hasThreeChars && (
            <div className="flex-shrink-0 flex items-center">
              <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200 shadow-2xs animate-in fade-in zoom-in-95">
                {filteredClients.length} {filteredClients.length === 1 ? 'תוצאה' : 'תוצאות'}
              </span>
            </div>
          )}

          {/* Quick Clear 'X' Button */}
          {query ? (
            <button
              type="button"
              onClick={handleClear}
              title="נקה חיפוש וחזור למבט-על מלא"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer flex-shrink-0 active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}

          {/* Add Client / Geocoding button */}
          {onOpenAddClientModal && (
            <button
              type="button"
              onClick={onOpenAddClientModal}
              title="איתור גיאוגרפי של כתובת חדשה בישראל"
              className="p-2 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-xl border border-sky-200 transition-colors flex-shrink-0 cursor-pointer shadow-2xs"
            >
              <PlusCircle className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 2. Dynamic Collapsible Dropdown Menu */}
        {isOpen && hasThreeChars && (
          <div
            id="search-results-dropdown"
            className="border-t border-slate-100 max-h-[380px] overflow-y-auto divide-y divide-slate-100/80 bg-white/98 rounded-b-2xl shadow-2xl backdrop-blur-md transition-all duration-200 ease-out origin-top animate-in fade-in slide-in-from-top-2"
          >
            {filteredClients.length === 0 ? (
              <div className="p-5 text-center text-xs text-slate-600 space-y-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-base">
                  🔍
                </div>
                <p className="font-bold text-slate-800">
                  לא נמצא לקוח במאגר התואם את "{query}"
                </p>
                <p className="text-slate-500 text-[11px]">
                  נסה להקליד שם עיר (כמו כפר סבא, רעננה, פ"ת) או קוד קומקס
                </p>
                {onOpenAddClientModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenAddClientModal();
                    }}
                    className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl flex items-center gap-1.5 mx-auto text-xs transition-colors cursor-pointer shadow-md"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>אתר כתובת חדשה זו בישראל ברשת</span>
                  </button>
                )}
              </div>
            ) : (
              <div ref={listRef} className="py-1">
                {filteredClients.map((client, idx) => {
                  const isSelected = selectedClient?.id === client.id;
                  const isHighlighted = idx === highlightedIndex;
                  const isProblematic = client.status === 'problematic';
                  const { distanceKm } = calculateDrivingDistanceKm(
                    DEPOT.lat,
                    DEPOT.lng,
                    client.lat,
                    client.lng
                  );

                  // Preferred Truck & Service Barcode
                  const isCranePreferred =
                    client.craneUnloadMinutes > 25 || client.district === 'שפלה / מודיעין';
                  const truckTag = isCranePreferred
                    ? { name: 'מנוף חכמת 🏗️', color: 'bg-blue-50 text-blue-800 border-blue-200' }
                    : { name: 'איסוזו עלי 🚚', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };

                  const serviceBarcode =
                    client.craneBarcode ||
                    (isCranePreferred ? '18055' : '818000');

                  return (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => handleSelect(client)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`w-full text-right px-4 py-3 transition-colors flex items-start gap-3 cursor-pointer border-r-4 ${
                        isSelected
                          ? 'bg-sky-100/80 border-sky-600'
                          : isHighlighted
                          ? 'bg-sky-50/70 border-sky-400'
                          : 'hover:bg-slate-50 border-transparent'
                      }`}
                    >
                      {/* Status / Location Pin Icon */}
                      <div className="mt-0.5 flex-shrink-0">
                        {isProblematic ? (
                          <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-black text-xs border border-rose-200 shadow-2xs">
                            ⚠️
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs border border-emerald-200 shadow-2xs">
                            📍
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Title Row: Name + Comax Code */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-extrabold text-sm text-slate-900 truncate">
                            <HighlightSubstring text={client.name} query={debouncedQuery} />
                          </div>
                          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 flex-shrink-0">
                            קומקס #
                            <HighlightSubstring text={client.comaxId} query={debouncedQuery} />
                          </span>
                        </div>

                        {/* Address Row: Street & City in Bold Gray + Distance */}
                        <div className="text-xs text-slate-600 flex items-center gap-1.5 mt-1">
                          <span className="font-semibold text-slate-700 truncate">
                            <HighlightSubstring text={client.address} query={debouncedQuery} />
                            {', '}
                            <HighlightSubstring text={client.city} query={debouncedQuery} />
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="font-bold text-sky-800 whitespace-nowrap bg-sky-50 px-1.5 py-0.5 rounded text-[11px]">
                            {distanceKm} ק"מ
                          </span>
                        </div>

                        {/* Quick Operational Tags Row */}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {/* Preferred Truck Badge */}
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border flex items-center gap-1 ${truckTag.color}`}
                          >
                            <span>{truckTag.name}</span>
                          </span>

                          {/* Transport Service Barcode */}
                          <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs flex items-center gap-1">
                            <Barcode className="w-3 h-3 text-amber-700" />
                            <span>מק"ט: {serviceBarcode}</span>
                          </span>

                          {/* Status Tag */}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                              isProblematic
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {isProblematic ? 'בעייתי (+10%)' : 'תקין (שוטף)'}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {/* Option to geocode anyway */}
                {onOpenAddClientModal && (
                  <div className="p-2 bg-slate-50 text-center border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onOpenAddClientModal();
                      }}
                      className="text-sky-700 hover:text-sky-900 text-xs font-bold py-1 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>איתור כתובת גיאוגרפית נוספת ברשת...</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Quick Filter Chips Bar */}
      <div
        id="search-filter-chips"
        className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-1 no-scrollbar pointer-events-auto"
      >
        {filterChips.map((chip) => {
          const isActive = activeFilter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => onFilterChange(chip.id)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap shadow-sm transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-slate-900/25 ring-2 ring-slate-700'
                  : 'bg-white/95 backdrop-blur-md text-slate-700 hover:bg-slate-100 border border-slate-200/90'
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
