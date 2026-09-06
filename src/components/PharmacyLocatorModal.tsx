// Source: Google Maps Platform Code Assist
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  Pin,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  Navigation,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Plus,
  X,
  Search,
  ExternalLink,
  ShieldCheck,
  Truck,
  Car,
  Award,
  Sparkles,
  HelpCircle,
  Key,
  Compass,
  RefreshCw,
  Locate,
  Share2,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { UserProfile, MedicalStore, StockedMedicineItem, StockAvailability } from '../types';
import {
  acquireDeviceGps,
  getNearbyMedicalStores,
  PRESET_GEOLOCATIONS,
  GpsLocation,
  COMMON_ESSENTIAL_MEDICINES,
  getGoogleMapsDirectionsUrl,
  getGoogleMapsSearchNearbyUrl,
  getSavedGpsLocation,
  saveGpsLocation,
} from '../utils/pharmacyService';

interface PharmacyLocatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  initialMedicines?: string[];
}

// Sub-component to pan map smoothly when center updates
const MapRecenterController: React.FC<{ center: { lat: number; lng: number } }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (map) {
      map.panTo(center);
    }
  }, [map, center]);
  return null;
};

export const PharmacyLocatorModal: React.FC<PharmacyLocatorModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  initialMedicines = [],
}) => {
  // Read API key from environment variable (or let user supply one)
  const envApiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    return localStorage.getItem('medtrack_google_maps_key') || envApiKey;
  });
  const [showKeyConfig, setShowKeyConfig] = useState(false);

  const effectiveApiKey = customApiKey.trim() || envApiKey;

  // GPS state
  const [currentGps, setCurrentGps] = useState<GpsLocation>(() => {
    const saved = getSavedGpsLocation();
    if (saved) return saved;
    return {
      lat: 17.6868,
      lng: 83.2185,
      city: 'Visakhapatnam, Andhra Pradesh',
      source: 'preset',
      accuracyMeters: 15,
    };
  });
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Active required medicines list
  const [requiredMeds, setRequiredMeds] = useState<string[]>(() => {
    const fromProfile = userProfile.healthHistory.currentMedications || [];
    const combined = Array.from(new Set([...initialMedicines, ...fromProfile]));
    return combined.length > 0 ? combined : ['Amoxicillin 500mg', 'Metformin 500mg'];
  });

  const [newMedInput, setNewMedInput] = useState('');
  const [selectedStore, setSelectedStore] = useState<MedicalStore | null>(null);
  const [filterInStockOnly, setFilterInStockOnly] = useState(false);
  const [filterOpenNow, setFilterOpenNow] = useState(false);
  const [filterDelivery, setFilterDelivery] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeReservationStore, setActiveReservationStore] = useState<MedicalStore | null>(null);
  const [reservationSuccess, setReservationSuccess] = useState(false);

  // Synchronize initial required medicines when modal opens
  const medicationsKey = (userProfile.healthHistory.currentMedications || []).join(',');
  const initialMedsKey = initialMedicines.join(',');

  useEffect(() => {
    if (isOpen) {
      const fromProfile = userProfile.healthHistory.currentMedications || [];
      const combined = Array.from(new Set([...initialMedicines, ...fromProfile]));
      if (combined.length > 0) {
        setRequiredMeds((prev) => Array.from(new Set([...prev, ...combined])));
      }
    }
  }, [isOpen, medicationsKey, initialMedsKey]);

  // Handle GPS acquisition
  const handleAcquireDeviceGps = useCallback(async () => {
    setIsLocatingGps(true);
    setGpsError(null);
    try {
      const gps = await acquireDeviceGps();
      setCurrentGps(gps);
    } catch (err: any) {
      setGpsError(err.message || 'Unable to access device GPS');
    } finally {
      setIsLocatingGps(false);
    }
  }, []);

  // Compute nearby medical stores around current GPS coordinates
  const stores = useMemo(() => {
    return getNearbyMedicalStores(currentGps.lat, currentGps.lng, requiredMeds);
  }, [currentGps.lat, currentGps.lng, requiredMeds]);

  // Filtered stores
  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = store.name.toLowerCase().includes(q);
        const matchAddr = store.address.toLowerCase().includes(q);
        const matchMed = store.stockedMedicines.some((m) => m.name.toLowerCase().includes(q));
        if (!matchName && !matchAddr && !matchMed) return false;
      }
      if (filterOpenNow && !store.isOpenNow) return false;
      if (filterDelivery && !store.hasHomeDelivery) return false;
      if (filterInStockOnly && requiredMeds.length > 0) {
        // Must have all required meds in stock
        const hasAll = requiredMeds.every((req) => {
          const item = store.stockedMedicines.find((m) =>
            m.name.toLowerCase().includes(req.toLowerCase().split(' ')[0])
          );
          return item && item.availability === 'In Stock';
        });
        if (!hasAll) return false;
      }
      return true;
    });
  }, [stores, searchQuery, filterOpenNow, filterDelivery, filterInStockOnly, requiredMeds]);

  const handleAddMedicine = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!requiredMeds.some((m) => m.toLowerCase() === trimmed.toLowerCase())) {
      setRequiredMeds((prev) => [...prev, trimmed]);
    }
    setNewMedInput('');
  };

  const handleRemoveMedicine = (name: string) => {
    setRequiredMeds((prev) => prev.filter((m) => m !== name));
  };

  const handleSaveApiKey = (key: string) => {
    const k = key.trim();
    setCustomApiKey(k);
    localStorage.setItem('medtrack_google_maps_key', k);
    setShowKeyConfig(false);
  };

  if (!isOpen) return null;

  return (
    <div
      id="pharmacy-locator-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        id="pharmacy-locator-modal-card"
        className="bg-white dark:bg-slate-900 border border-teal-100 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-7xl h-[92vh] max-h-[920px] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100"
      >
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-linear-to-r from-teal-50/70 via-white to-emerald-50/70 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
              <MapPin className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base sm:text-lg tracking-tight font-outfit text-slate-900 dark:text-white">
                  Google Maps Pharmacy &amp; Medical Store Locator
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 rounded-md border border-teal-200 dark:border-teal-800">
                  Live GPS
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Check real-time stock for your required medicines at pharmacies nearest to your GPS coordinates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowKeyConfig((prev) => !prev)}
              className="p-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Google Maps API Key & Setup"
            >
              <Key className="w-4 h-4 text-amber-500" />
              <span className="hidden sm:inline">Maps Key</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* API Key Banner / Config Panel if open or missing */}
        {showKeyConfig && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 animate-in slide-in-from-top duration-200">
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-amber-950 dark:text-amber-100">
                  <Key className="w-4 h-4 text-amber-600" />
                  <span>Google Maps Platform API Key Setup</span>
                </div>
                <p className="text-amber-800 dark:text-amber-300">
                  For zero-friction prototyping without billing, you can generate a free{' '}
                  <a
                    href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                    target="_blank"
                    rel="noreferrer"
                    className="underline font-bold text-amber-900 dark:text-amber-100 hover:text-teal-600"
                  >
                    Google Maps Demo Key
                  </a>{' '}
                  or enter your Cloud API Key below:
                </p>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Paste Google Maps API Key here..."
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl text-xs w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => handleSaveApiKey(customApiKey)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  Save Key
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GPS Control Bar & Required Medicines Selector */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-3">
          {/* Row 1: Geolocation Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleAcquireDeviceGps}
                disabled={isLocatingGps}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
              >
                {isLocatingGps ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Locate className="w-3.5 h-3.5" />
                )}
                <span>{isLocatingGps ? 'Locating GPS...' : 'Use My Exact Device GPS'}</span>
              </button>

              {/* City quick preset selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">Or select region:</span>
                <select
                  aria-label="Select target geographic region"
                  value={
                    PRESET_GEOLOCATIONS.find(
                      (p) => Math.abs(p.lat - currentGps.lat) < 0.01 && Math.abs(p.lng - currentGps.lng) < 0.01
                    )?.label || 'Custom'
                  }
                  onChange={(e) => {
                    const found = PRESET_GEOLOCATIONS.find((p) => p.label === e.target.value);
                    if (found) {
                      setCurrentGps({
                        lat: found.lat,
                        lng: found.lng,
                        city: found.city,
                        source: 'preset',
                        accuracyMeters: 20,
                      });
                      setGpsError(null);
                    }
                  }}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  {PRESET_GEOLOCATIONS.map((preset) => (
                    <option key={preset.label} value={preset.label}>
                      📍 {preset.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* GPS coordinates & accuracy display */}
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg font-mono font-bold">
                <Compass className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span>
                  {currentGps.lat.toFixed(4)}° N, {currentGps.lng.toFixed(4)}° W
                </span>
                {currentGps.accuracyMeters && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-normal ml-1">
                    (&plusmn;{currentGps.accuracyMeters}m)
                  </span>
                )}
              </div>
              <a
                href={getGoogleMapsSearchNearbyUrl(currentGps.lat, currentGps.lng)}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer"
                title="Open in native Google Maps"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {gpsError && (
            <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 p-2 rounded-xl border border-rose-200 dark:border-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{gpsError}</span>
            </div>
          )}

          {/* Row 2: Required Medicines Inventory Auditor */}
          <div className="bg-white dark:bg-slate-800/90 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Required Medicines to Check Stock For ({requiredMeds.length}):
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span>Auto-extracted from patient prescription &amp; health profile</span>
              </div>
            </div>

            {/* Medicine Tags & Quick Add */}
            <div className="flex flex-wrap items-center gap-1.5">
              {requiredMeds.map((med) => (
                <span
                  key={med}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 dark:bg-teal-950/80 text-teal-900 dark:text-teal-200 border border-teal-200 dark:border-teal-800 rounded-xl text-xs font-bold group"
                >
                  <span>💊 {med}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveMedicine(med)}
                    className="text-teal-600 hover:text-rose-600 dark:text-teal-400 dark:hover:text-rose-400 p-0.5 rounded transition-colors cursor-pointer"
                    title={`Remove ${med}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Add Custom Medicine input */}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="+ Add required medicine..."
                  value={newMedInput}
                  onChange={(e) => setNewMedInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddMedicine(newMedInput);
                    }
                  }}
                  className="px-2.5 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 w-44"
                />
                <button
                  type="button"
                  onClick={() => handleAddMedicine(newMedInput)}
                  disabled={!newMedInput.trim()}
                  className="p-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white rounded-lg transition-colors cursor-pointer"
                  title="Add medicine"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quick suggestion dropdown for common essentials */}
              <div className="ml-auto flex items-center gap-1">
                <span className="text-[10px] text-slate-400 hidden lg:inline">Common:</span>
                <select
                  aria-label="Add common essential prescription medicine"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddMedicine(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="text-[11px] px-2 py-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  <option value="">+ Add common Rx...</option>
                  {COMMON_ESSENTIAL_MEDICINES.filter((m) => !requiredMeds.includes(m)).map((med) => (
                    <option key={med} value={med}>
                      {med}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="px-5 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search pharmacies, address, or medicine..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs w-56 sm:w-72 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <button
              type="button"
              onClick={() => setFilterInStockOnly((prev) => !prev)}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all border cursor-pointer ${
                filterInStockOnly
                  ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              ✓ In Stock Only
            </button>

            <button
              type="button"
              onClick={() => setFilterOpenNow((prev) => !prev)}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all border cursor-pointer ${
                filterOpenNow
                  ? 'bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200 border-teal-300 dark:border-teal-700'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              🕒 Open Now / 24 Hours
            </button>

            <button
              type="button"
              onClick={() => setFilterDelivery((prev) => !prev)}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all border cursor-pointer ${
                filterDelivery
                  ? 'bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              🚚 Home Delivery
            </button>
          </div>

          <div className="text-xs font-semibold text-slate-500">
            Found <span className="text-teal-600 dark:text-teal-400 font-bold">{filteredStores.length}</span> medical stores nearby
          </div>
        </div>

        {/* Main Content Area: Map on Left/Top + Pharmacy List on Right */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Map Column (5 cols on lg) */}
          <div className="lg:col-span-5 relative bg-slate-100 dark:bg-slate-950 h-64 sm:h-80 lg:h-full border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 flex flex-col">
            {effectiveApiKey ? (
              <APIProvider apiKey={effectiveApiKey} solutionChannel="gmp_mcp_codeassist_v1_aistudio">
                <div className="w-full h-full relative" style={{ minHeight: '260px' }}>
                  <Map
                    mapId="DEMO_MAP_ID"
                    defaultCenter={{ lat: currentGps.lat, lng: currentGps.lng }}
                    center={{ lat: currentGps.lat, lng: currentGps.lng }}
                    defaultZoom={14}
                    gestureHandling="greedy"
                    disableDefaultUI={false}
                    className="w-full h-full"
                  >
                    <MapRecenterController center={{ lat: currentGps.lat, lng: currentGps.lng }} />

                    {/* Patient GPS beacon */}
                    <AdvancedMarker position={{ lat: currentGps.lat, lng: currentGps.lng }}>
                      <div className="relative flex items-center justify-center">
                        <div className="w-7 h-7 rounded-full bg-teal-500/30 animate-ping absolute"></div>
                        <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-[10px] border-2 border-white shadow-lg z-10">
                          📍
                        </div>
                      </div>
                    </AdvancedMarker>

                    {/* Medical Stores Markers */}
                    {filteredStores.map((store) => {
                      const isSelected = selectedStore?.id === store.id;
                      return (
                        <AdvancedMarker
                          key={store.id}
                          position={{ lat: store.lat, lng: store.lng }}
                          onClick={() => setSelectedStore(store)}
                        >
                          <div
                            className={`px-2 py-1 rounded-xl font-bold text-xs shadow-lg flex items-center gap-1 transition-transform cursor-pointer ${
                              isSelected
                                ? 'bg-teal-600 text-white scale-110 ring-4 ring-teal-300/60 z-30'
                                : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-teal-500 hover:scale-105 z-20'
                            }`}
                          >
                            <span className="text-emerald-500 font-extrabold text-[13px]">+</span>
                            <span className="max-w-[80px] truncate">{store.name.split(' - ')[0]}</span>
                            <span className="text-[10px] font-mono opacity-80">{store.distanceMiles}mi</span>
                          </div>
                        </AdvancedMarker>
                      );
                    })}

                    {/* Selected Store InfoWindow */}
                    {selectedStore && (
                      <InfoWindow
                        position={{ lat: selectedStore.lat, lng: selectedStore.lng }}
                        onCloseClick={() => setSelectedStore(null)}
                      >
                        <div className="p-2 max-w-[240px] text-slate-900">
                          <h4 className="font-extrabold text-sm text-teal-800">{selectedStore.name}</h4>
                          <p className="text-xs text-slate-600 mt-0.5">{selectedStore.address}</p>
                          <div className="mt-1.5 flex items-center justify-between text-xs">
                            <span className="font-bold text-emerald-700">★ {selectedStore.rating} ({selectedStore.reviewCount})</span>
                            <span className="font-mono font-bold text-slate-700">{selectedStore.distanceMiles} miles</span>
                          </div>
                          <div className="mt-2 flex gap-1">
                            <a
                              href={selectedStore.googleMapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full text-center px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg shadow-xs"
                            >
                              Get Directions
                            </a>
                          </div>
                        </div>
                      </InfoWindow>
                    )}
                  </Map>
                </div>
              </APIProvider>
            ) : (
              /* High-fidelity Vector Map Canvas when API key is not yet provided */
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#0d9488_1px,transparent_1px)] [background-size:16px_16px]"></div>

                <div className="w-14 h-14 rounded-2xl bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 flex items-center justify-center mb-3 shadow-inner relative z-10">
                  <MapPin className="w-7 h-7 animate-bounce text-teal-600 dark:text-teal-400" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white relative z-10">
                  GPS Pharmacy Map Anchor
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-1 mb-4 relative z-10">
                  Live GPS coordinate tracking active at{' '}
                  <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                    {currentGps.lat.toFixed(4)}° N, {currentGps.lng.toFixed(4)}° W
                  </span>
                  .
                </p>

                <div className="flex flex-col gap-2 w-full max-w-xs relative z-10">
                  <a
                    href={getGoogleMapsSearchNearbyUrl(currentGps.lat, currentGps.lng)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open Live In Google Maps</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowKeyConfig(true)}
                    className="w-full py-2 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Key className="w-3.5 h-3.5 text-amber-500" />
                    <span>Enter Maps Key for Embedded Map</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pharmacies & Medical Stores List (7 cols on lg) */}
          <div className="lg:col-span-7 h-full overflow-y-auto p-4 space-y-3 bg-white dark:bg-slate-900">
            {filteredStores.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  No medical stores matched your current filters
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Try clearing the &quot;In Stock Only&quot; or search query filter to view all nearby pharmacies.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFilterInStockOnly(false);
                    setFilterOpenNow(false);
                    setFilterDelivery(false);
                    setSearchQuery('');
                  }}
                  className="mt-3 px-3 py-1.5 bg-teal-600 text-white text-xs font-bold rounded-xl"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              filteredStores.map((store) => {
                const isSelected = selectedStore?.id === store.id;

                // Check stock status for required medicines in this store
                const reqMedsInStock = requiredMeds.filter((req) => {
                  const item = store.stockedMedicines.find((m) =>
                    m.name.toLowerCase().includes(req.toLowerCase().split(' ')[0])
                  );
                  return item && item.availability === 'In Stock';
                });

                const allInStock = requiredMeds.length > 0 && reqMedsInStock.length === requiredMeds.length;

                return (
                  <div
                    key={store.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50/40 dark:bg-teal-950/30 shadow-md ring-2 ring-teal-400/40'
                        : 'border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700 bg-white dark:bg-slate-850'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                            {store.name}
                          </h3>
                          {store.is24Hours && (
                            <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded border border-emerald-300 dark:border-emerald-700">
                              24/7 OPEN
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          📍 {store.address}
                        </p>
                      </div>

                      {/* Distance & Travel times */}
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <div className="text-right">
                          <span className="text-sm font-extrabold font-mono text-teal-700 dark:text-teal-300">
                            {store.distanceMiles} mi
                          </span>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 justify-end">
                            <Car className="w-2.5 h-2.5" />
                            <span>{store.drivingTimeMinutes}m drive</span>
                            <span>&bull;</span>
                            <span>{store.walkingTimeMinutes}m walk</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stock Status for Required Medicines */}
                    <div className="mt-3 p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          {allInStock ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                          )}
                          <span>Medicine Inventory Availability:</span>
                        </span>
                        <span
                          className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                            allInStock
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          {reqMedsInStock.length} of {requiredMeds.length} Required In Stock
                        </span>
                      </div>

                      {/* Medicine items chips */}
                      <div className="flex flex-wrap gap-1.5">
                        {store.stockedMedicines
                          .filter((med) =>
                            requiredMeds.some((r) =>
                              med.name.toLowerCase().includes(r.toLowerCase().split(' ')[0])
                            )
                          )
                          .map((med) => {
                            let badgeClass = 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300';
                            if (med.availability === 'Low Stock') {
                              badgeClass = 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-300';
                            } else if (med.availability === 'Out of Stock') {
                              badgeClass = 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border-rose-300';
                            } else if (med.availability === 'Available on Request') {
                              badgeClass = 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-300';
                            }

                            return (
                              <span
                                key={med.name}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-semibold ${badgeClass}`}
                              >
                                <span>{med.name}</span>
                                <span className="font-bold text-[10px]">({med.availability})</span>
                                {med.estimatedPrice && (
                                  <span className="font-mono text-[10px] opacity-80">{med.estimatedPrice}</span>
                                )}
                              </span>
                            );
                          })}
                      </div>
                    </div>

                    {/* Store Perks & Hours */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-semibold">
                        <Clock className="w-3 h-3 text-teal-600" />
                        <span>{store.openingHours}</span>
                      </span>
                      {store.hasHomeDelivery && (
                        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
                          <Truck className="w-3 h-3" />
                          <span>Delivery</span>
                        </span>
                      )}
                      {store.hasDriveThru && (
                        <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-semibold">
                          <Car className="w-3 h-3" />
                          <span>Drive-Thru</span>
                        </span>
                      )}
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        ★ {store.rating} ({store.reviewCount} reviews)
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${store.phone}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                        >
                          <Phone className="w-3.5 h-3.5 text-teal-600" />
                          <span>{store.phone}</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveReservationStore(store);
                            setReservationSuccess(false);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 dark:bg-teal-950/80 hover:bg-teal-100 dark:hover:bg-teal-900 text-teal-900 dark:text-teal-200 border border-teal-200 dark:border-teal-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                          <span>Hold / Inquire Meds</span>
                        </button>
                      </div>

                      <a
                        href={store.googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all cursor-pointer"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Google Maps Directions</span>
                        <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Medicine Reservation / Inquiry Modal Popup */}
        {activeReservationStore && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800 rounded-3xl p-5 max-w-lg w-full shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-teal-600" />
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Medicine Reservation Slip
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveReservationStore(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {reservationSuccess ? (
                <div className="py-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-base text-emerald-800 dark:text-emerald-300">
                    Medicine Hold Slip Generated!
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Your reservation for {activeReservationStore.name} has been recorded. Present this slip or call{' '}
                    <span className="font-bold text-teal-600">{activeReservationStore.phone}</span> when picking up.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveReservationStore(null)}
                    className="mt-3 px-4 py-2 bg-teal-600 text-white font-bold text-xs rounded-xl"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="mt-4 space-y-3 text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="font-bold text-slate-800 dark:text-slate-200">Patient Details:</div>
                    <div className="text-slate-600 dark:text-slate-300 mt-1">
                      <span className="font-semibold">{userProfile.name}</span> ({userProfile.demographics.age} years, {userProfile.demographics.gender})
                    </div>
                    <div className="text-slate-500 mt-0.5">
                      Target Store: {activeReservationStore.name} ({activeReservationStore.address})
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="font-bold text-slate-800 dark:text-slate-200">Requested Medications:</div>
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                      {requiredMeds.map((med) => (
                        <li key={med} className="p-2 flex items-center justify-between bg-white dark:bg-slate-800/50">
                          <span className="font-semibold">💊 {med}</span>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">
                            Reserve 1 Unit
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-[11px]">
                    ⚠️ Prescription required for antibiotic and prescription items at checkout.
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setReservationSuccess(true)}
                      className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
                    >
                      Confirm Reservation Slip
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveReservationStore(null)}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
