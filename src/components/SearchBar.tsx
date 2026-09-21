import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  X,
  MapPin,
  Building2,
  PlusCircle,
  AlertCircle,
  SlidersHorizontal,
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
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);

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
        setShowFilterDropdown(false);
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
    { id: 'all', label: 'כל האתרים', icon: '🌐', count: clients.length },
    { id: 'standard', label: 'תקינים', icon: '🟢', count: clients.filter((c) => c.status === 'standard').length },
    { id: 'problematic', label: 'חריגים (+10%)', icon: '🔴', count: clients.filter((c) => c.status === 'problematic').length },
    { id: 'sharon', label: 'השרון', icon: '📍', count: clients.filter((c) => c.district === 'השרון').length },
    { id: 'telaviv', label: 'תל אביב', icon: '🏢', count: clients.filter((c) => c.district === 'תל אביב').length },
  ];

  const hasThreeChars = query.trim().length >= 3;
  const isTyping = query.length > 0;

  return (
    <div
      ref={containerRef}
      id="smart-floating-search-container"
      className="relative z-30 w-full max-w-md pointer-events-auto transition-all"
    >
      {/* 1. Modern Floating Search Bar Container (Glassmorphism & Elevation) */}
      <div className="relative rounded-2xl bg-white/95 backdrop-blur-md shadow-xl border border-slate-200/80 transition-all duration-200 focus-within:shadow-2xl focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-200">
        <div className="flex items-center px-3 py-2 gap-2">
          {/* Depot Quick Reset Button */}
          <button
            type="button"
            onClick={onResetToDepot}
            title="חזרה למבט-על מלא: מגרש סבן החרש 10 (בסיס מוצא)"
            className="min-h-[44px] min-w-[44px] p-2 text-sky-700 hover:bg-sky-50 rounded-xl transition-colors cursor-pointer flex items-center justify-center shrink-0 group active:scale-95"
          >
            <Building2 className="w-5 h-5 text-sky-600 group-hover:scale-110 transition-transform" />
          </button>

          {/* Interactive Search Icon (Changes to Sky-600 when typing) */}
          <Search
            className={`w-4 h-4 shrink-0 transition-colors duration-200 ${
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
              placeholder="חפש לקוח, כתובת, עיר (כ&quot;ס, פ&quot;ת)..."
              className="w-full bg-transparent text-xs sm:text-sm md:text-base font-bold text-slate-900 placeholder-slate-400 outline-none pr-0.5 leading-normal truncate"
            />
          </div>

          {/* Live Dynamic Result Counter Badge */}
          {hasThreeChars && (
            <div className="shrink-0 flex items-center">
              <span className="text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200 shadow-2xs animate-in fade-in zoom-in-95">
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
              className="min-h-[44px] min-w-[44px] p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer shrink-0 flex items-center justify-center active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}

          {/* Smart Filter Dropdown Trigger Button */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              title="סינון אתרים (כל האתרים / תקינים / חריגים)"
              className={`min-h-[44px] min-w-[44px] p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center relative active:scale-95 ${
                activeFilter !== 'all'
                  ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {activeFilter !== 'all' && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-400 rounded-full ring-1 ring-white" />
              )}
            </button>

            {/* Smart Filter Dropdown Popover */}
            {showFilterDropdown && (
              <div
                ref={filterMenuRef}
                className="absolute top-full left-0 md:right-0 md:left-auto mt-2 w-56 bg-white/98 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95"
              >
                <div className="text-[10px] font-black text-slate-400 px-2.5 py-1 uppercase tracking-wider border-b border-slate-100 mb-1 flex items-center justify-between">
                  <span>סינון אתרי לקוחות</span>
                  <span className="text-sky-600 font-bold">{clients.length} סה״כ</span>
                </div>
                <div className="space-y-0.5">
                  {filterChips.map((chip) => {
                    const isSelected = activeFilter === chip.id;
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => {
                          onFilterChange(chip.id);
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full min-h-[40px] px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer text-right ${
                          isSelected
                            ? 'bg-sky-600 text-white shadow-xs'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{chip.icon}</span>
                          <span>{chip.label}</span>
                        </div>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md font-extrabold ${
                            isSelected
                              ? 'bg-sky-700 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {chip.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Add Client / Geocoding button */}
          {onOpenAddClientModal && (
            <button
              type="button"
              onClick={onOpenAddClientModal}
              title="איתור גיאוגרפי של כתובת חדשה בישראל"
              className="min-h-[44px] min-w-[44px] p-2 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-xl border border-sky-200 transition-colors shrink-0 cursor-pointer shadow-2xs flex items-center justify-center active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 2. Dynamic Collapsible Dropdown Menu */}
        {isOpen && hasThreeChars && (
          <div
            id="search-results-menu"
            className="border-t border-slate-100 bg-white/98 backdrop-blur-md rounded-b-2xl overflow-hidden shadow-2xl animate-in fade-in duration-150"
          >
            {filteredClients.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-80" />
                <div className="font-extrabold text-sm text-slate-800">
                  לא נמצאו אתרים תואמים ל-"{debouncedQuery}"
                </div>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                  וודא שההקלדה נכונה, או נסה לחפש לפי שם ישוב (לדוגמה "פתח תקווה", "כפר סבא") או קוד קומקס.
                </p>
                {onOpenAddClientModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenAddClientModal();
                    }}
                    className="mt-3.5 px-3.5 py-2 min-h-[44px] bg-sky-600 hover:bg-sky-700 text-white font-black text-xs rounded-xl shadow-md inline-flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>הוסף אתר חדש באיתור גיאוגרפי מהיר</span>
                  </button>
                )}
              </div>
            ) : (
              <div ref={listRef} className="max-h-72 overflow-y-auto divide-y divide-slate-100 text-right">
                <div className="px-3.5 py-1.5 bg-slate-50 text-[11px] font-bold text-slate-500 flex justify-between items-center sticky top-0 z-10">
                  <span>תוצאות חיפוש מהיר ({filteredClients.length})</span>
                  <span className="text-[10px] text-slate-400">הקש Enter לבחירה</span>
                </div>

                {filteredClients.map((client, index) => {
                  const distInfo = calculateDrivingDistanceKm(
                    DEPOT.lat,
                    DEPOT.lng,
                    client.lat,
                    client.lng
                  );
                  const isProblematic = client.status === 'problematic';
                  const isSelected = index === highlightedIndex;

                  return (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => handleSelect(client)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`w-full min-h-[44px] px-3.5 py-2.5 text-right transition-colors flex items-center justify-between gap-2.5 cursor-pointer ${
                        isSelected
                          ? 'bg-sky-50/90 text-sky-950 ring-1 ring-inset ring-sky-200'
                          : 'hover:bg-slate-50/80 text-slate-800'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-xs md:text-sm leading-tight text-slate-900 truncate max-w-[180px]">
                            <HighlightSubstring text={client.name} query={debouncedQuery} />
                          </span>

                          <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                            #{client.comaxId}
                          </span>

                          <span
                            className={`text-[10px] font-black px-1.5 py-0.2 rounded shrink-0 ${
                              isProblematic
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isProblematic ? 'חריג (+10%)' : 'תקין'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            <HighlightSubstring
                              text={`${client.address}, ${client.city}`}
                              query={debouncedQuery}
                            />
                          </span>
                        </div>
                      </div>

                      <div className="text-left shrink-0 pl-1">
                        <div className="font-mono font-black text-xs text-sky-800">
                          {distInfo.distanceKm} ק"מ
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold">
                          ~{distInfo.travelMinutes} דק' נסיעה
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
                      className="text-sky-700 hover:text-sky-900 text-xs font-bold py-1 min-h-[44px] inline-flex items-center justify-center gap-1 cursor-pointer"
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

      {/* 3. Horizontal Quick Filter Chips Slider (Clean scroll without overlapping) */}
      <div
        id="search-filter-chips"
        className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-0.5 px-0.5 no-scrollbar pointer-events-auto"
        style={{
          height: '62px',
          width: '561px',
        }}
      >
        {filterChips.map((chip) => {
          const isActive = activeFilter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => onFilterChange(chip.id)}
              className={`min-h-[34px] text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-slate-900/25 ring-2 ring-slate-700'
                  : 'bg-white/95 backdrop-blur-md text-slate-700 hover:bg-slate-100 border border-slate-200/90'
              }`}
            >
              <span>{chip.icon}</span>
              <span>{chip.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {chip.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
