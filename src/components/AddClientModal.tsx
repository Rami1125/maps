import React, { useState } from 'react';
import {
  X,
  Search,
  MapPin,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Clock,
  Sparkles,
  Barcode,
  Loader2,
} from 'lucide-react';
import { GeocodedAddress, ClientSite } from '../types';
import { searchAddressOnline, createClientFromGeocoded } from '../services/geocodingService';
import { DEPOT } from '../data/clients';

interface AddClientModalProps {
  initialLatLng?: { lat: number; lng: number } | null;
  onClientAdded: (client: ClientSite) => void;
  onClose: () => void;
}

export const AddClientModal: React.FC<AddClientModalProps> = ({
  initialLatLng,
  onClientAdded,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodedAddress[]>([]);
  const [selectedGeo, setSelectedGeo] = useState<GeocodedAddress | null>(null);

  // Form Fields
  const [clientName, setClientName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [isProblematic, setIsProblematic] = useState(false);
  const [notes, setNotes] = useState('');

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query || query.trim().length < 2) return;

    setIsSearching(true);
    const results = await searchAddressOnline(query);
    setSearchResults(results);
    setIsSearching(false);
    if (results.length > 0 && !selectedGeo) {
      setSelectedGeo(results[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGeo) return;

    const newClient = createClientFromGeocoded(
      selectedGeo,
      clientName || selectedGeo.address,
      contactPhone || '050-0000000',
      isProblematic,
      notes
    );

    onClientAdded(newClient);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm pointer-events-auto">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in">
        {/* Header */}
        <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              📍
            </div>
            <div>
              <h3 className="font-extrabold text-base">איתור גיאוגרפי והוספת יעד חדש</h3>
              <p className="text-xs text-neutral-400">
                חיפוש כתובת בזמן אמת בישראל, חישוב מרחק והתאמת מק"ט
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Search Box */}
          <form onSubmit={handleSearch} className="space-y-2">
            <label className="text-xs font-bold text-neutral-700 block">
              הזן כתובת או עיר בישראל:
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="לדוגמה: ויצמן 45 רעננה, או דיזנגוף 100 תל אביב..."
                  className="w-full pr-9 pl-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs outline-none focus:border-blue-500 focus:bg-white"
                />
                <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-2.5" />
              </div>

              <button
                type="submit"
                disabled={isSearching || query.trim().length < 2}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>אתר כתובת</span>
              </button>
            </div>
          </form>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-neutral-500 block">
                תוצאות שנמצאו ברשת:
              </span>
              <div className="max-h-36 overflow-y-auto space-y-1 border border-neutral-200 rounded-xl p-1 bg-neutral-50">
                {searchResults.map((res, i) => {
                  const isChosen = selectedGeo?.displayName === res.displayName;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedGeo(res)}
                      className={`w-full text-right p-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        isChosen
                          ? 'bg-blue-100/90 text-blue-950 font-bold border border-blue-300'
                          : 'bg-white hover:bg-neutral-100 text-neutral-800'
                      }`}
                    >
                      <div className="truncate pr-1">
                        <div>{res.displayName}</div>
                        <div className="text-[10px] text-neutral-500">
                          {res.district} • {res.distanceKm} ק"מ מהמגרש
                        </div>
                      </div>
                      <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-neutral-200 flex-shrink-0">
                        בחר
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected Geo Spec Card */}
          {selectedGeo && (
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-blue-900 font-extrabold text-xs">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span>נתוני הכתובת שנבחרה:</span>
                </div>
                <span className="text-[10px] font-bold bg-blue-200/80 text-blue-900 px-2 py-0.5 rounded-full">
                  אזור: {selectedGeo.district}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2 rounded-lg border border-blue-100">
                  <span className="text-[10px] text-neutral-400 block font-bold">מרחק נסיעה מהמגרש</span>
                  <span className="font-extrabold text-neutral-900 font-mono text-sm">
                    {selectedGeo.distanceKm} ק"מ
                  </span>
                </div>

                <div className="bg-white p-2 rounded-lg border border-blue-100">
                  <span className="text-[10px] text-neutral-400 block font-bold">מק"ט מנוף מומלץ</span>
                  <span className="font-extrabold text-blue-800 font-mono text-sm">
                    {selectedGeo.suggestedCraneSku}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Site Form Inputs */}
          {selectedGeo && (
            <form id="add-client-form" onSubmit={handleSubmit} className="space-y-3 pt-2 border-t border-neutral-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    שם לקוח / אתר:
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="לדוגמה: א.ב. הנדסה / וילה הרצליה"
                    className="w-full px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    טלפון איש קשר באתר:
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="050-0000000"
                    className="w-full px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  הנחיות פריקה והערות שטח:
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="לדוגמה: רחוב צר, כניסה רק ברברס, פריקה מעבר לגדר..."
                  className="w-full px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              {/* Problematic / Complex Site Checkbox */}
              <label className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={isProblematic}
                  onChange={(e) => setIsProblematic(e.target.checked)}
                  className="w-4 h-4 text-rose-600 rounded border-neutral-300"
                />
                <div className="text-xs">
                  <span className="font-extrabold text-rose-900 block">
                    הגדר כאתר בעייתי / מורכב לפריקה (+10% סיכון)
                  </span>
                  <span className="text-[10px] text-rose-700">
                    מוסיף 10% למחיר המחירון, ומגדיר תנאי תשלום במזומן מראש
                  </span>
                </div>
              </label>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
          >
            ביטול
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedGeo}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>הוסף יעד למפה ולסבב</span>
          </button>
        </div>
      </div>
    </div>
  );
};
