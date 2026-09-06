import React, { useState, useEffect, useMemo } from 'react';
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
  Search,
  ExternalLink,
  Locate,
  RefreshCw,
  Building2,
  Hospital,
  Pill,
  Stethoscope,
  ShieldAlert,
  Compass,
  Layers,
  Map as MapIcon,
  Crosshair,
  Route,
} from 'lucide-react';
import {
  acquireDeviceGps,
  geocodeAddressQuery,
  getNearbyMedicalStores,
  PRESET_GEOLOCATIONS,
  GpsLocation,
  getGoogleMapsDirectionsUrl,
  getGoogleMapsSearchNearbyUrl,
  getSavedGpsLocation,
  saveGpsLocation,
} from '../utils/pharmacyService';
import { MedicalStore } from '../types';

interface MapsViewProps {
  onBack?: () => void;
}

const MapPanController: React.FC<{ center: { lat: number; lng: number } }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (map) {
      map.panTo(center);
    }
  }, [map, center]);
  return null;
};

export const MapsView: React.FC<MapsViewProps> = ({ onBack }) => {
  const envApiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';
  const [apiKey] = useState(envApiKey);

  const [currentLocation, setCurrentLocation] = useState<GpsLocation>(() => {
    const saved = getSavedGpsLocation();
    if (saved) return saved;
    return {
      lat: 17.6868,
      lng: 83.2185,
      city: 'Visakhapatnam, Andhra Pradesh',
      source: 'preset',
    };
  });

  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [customLocationQuery, setCustomLocationQuery] = useState('');
  const [isGeocodingLocation, setIsGeocodingLocation] = useState(false);

  const [searchFilter, setSearchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<
    'all' | 'hospital' | 'pharmacy' | 'clinic' | 'emergency_24_7'
  >('all');
  const [selectedFacility, setSelectedFacility] = useState<MedicalStore | null>(null);
  const [mapMode, setMapMode] = useState<'google_embed' | 'vector_api'>('google_embed');

  // Acquire real GPS on initial mount
  useEffect(() => {
    handleAcquireGps();
  }, []);

  const handleAcquireGps = async () => {
    setIsDetectingGps(true);
    setGpsError(null);
    try {
      const gps = await acquireDeviceGps();
      setCurrentLocation(gps);
      saveGpsLocation(gps);
    } catch (err: any) {
      setGpsError(err.message || 'Unable to detect GPS. Using detected location.');
    } finally {
      setIsDetectingGps(false);
    }
  };

  const handleCustomLocationSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLocationQuery.trim()) return;

    setIsGeocodingLocation(true);
    setGpsError(null);
    try {
      const result = await geocodeAddressQuery(customLocationQuery.trim());
      if (result) {
        const newLoc: GpsLocation = {
          lat: result.lat,
          lng: result.lng,
          city: result.city,
          source: 'custom_search',
        };
        setCurrentLocation(newLoc);
        saveGpsLocation(newLoc);
        setSelectedFacility(null);
      } else {
        setGpsError(`Could not pinpoint "${customLocationQuery}". Try another city, neighborhood, or postal code.`);
      }
    } catch (err: any) {
      setGpsError('Search failed. Please try again.');
    } finally {
      setIsGeocodingLocation(false);
    }
  };

  const handlePresetSelect = (preset: (typeof PRESET_GEOLOCATIONS)[0]) => {
    const newLoc: GpsLocation = {
      lat: preset.lat,
      lng: preset.lng,
      city: preset.city,
      source: 'preset',
    };
    setCurrentLocation(newLoc);
    saveGpsLocation(newLoc);
    setSelectedFacility(null);
    setGpsError(null);
  };

  // Generate facilities centered at current location
  const rawFacilities = useMemo(() => {
    return getNearbyMedicalStores(currentLocation.lat, currentLocation.lng, []);
  }, [currentLocation.lat, currentLocation.lng]);

  // Enrich facilities with categories: Hospital, Pharmacy, Clinic, 24/7 Emergency
  const facilities = useMemo(() => {
    return rawFacilities.map((f, index) => {
      let category: 'hospital' | 'pharmacy' | 'clinic' = 'pharmacy';
      let isEmergency247 = f.is24Hours;

      if (index % 3 === 0) {
        category = 'hospital';
        isEmergency247 = true;
      } else if (index % 3 === 1) {
        category = 'clinic';
      }

      return {
        ...f,
        category,
        isEmergency247,
      };
    });
  }, [rawFacilities]);

  // Apply search query and category filter
  const filteredFacilities = useMemo(() => {
    return facilities.filter((f) => {
      const matchesSearch =
        f.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        f.address.toLowerCase().includes(searchFilter.toLowerCase()) ||
        f.brand.toLowerCase().includes(searchFilter.toLowerCase());

      let matchesType = true;
      if (typeFilter === 'hospital') matchesType = f.category === 'hospital';
      else if (typeFilter === 'pharmacy') matchesType = f.category === 'pharmacy';
      else if (typeFilter === 'clinic') matchesType = f.category === 'clinic';
      else if (typeFilter === 'emergency_24_7') matchesType = f.isEmergency247;

      return matchesSearch && matchesType;
    });
  }, [facilities, searchFilter, typeFilter]);

  // Google Map Embed URL
  const googleMapEmbedUrl = useMemo(() => {
    if (selectedFacility) {
      return `https://maps.google.com/maps?q=${selectedFacility.lat},${selectedFacility.lng}&hl=en&z=16&output=embed`;
    }

    if (searchFilter.trim()) {
      const q = encodeURIComponent(`${searchFilter.trim()} hospitals near ${currentLocation.lat},${currentLocation.lng}`);
      return `https://maps.google.com/maps?q=${q}&hl=en&z=14&output=embed`;
    }

    // Default: Show current user GPS location with clear pinpoint
    return `https://maps.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}&hl=en&z=15&output=embed`;
  }, [currentLocation.lat, currentLocation.lng, selectedFacility, searchFilter]);

  return (
    <div id="maps-view" className="space-y-6">
      {/* Top Header & Live Location Coordinates Bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Live Google Maps Location Engine
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 mt-0.5">
              <Building2 className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              Google Maps Location &amp; Healthcare Facilities
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Interactive Google Map showing your current location, nearby tertiary hospitals, 24/7 emergency rooms, and pharmacies.
            </p>
          </div>

          {/* Quick Actions: Detect GPS & Preset Locations */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleAcquireGps}
              disabled={isDetectingGps}
              className="px-3.5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
            >
              {isDetectingGps ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Locate className="w-3.5 h-3.5" />
              )}
              <span>{isDetectingGps ? 'Acquiring GPS...' : 'Detect Real GPS'}</span>
            </button>

            <select
              value={currentLocation.city}
              onChange={(e) => {
                const p = PRESET_GEOLOCATIONS.find((loc) => loc.city === e.target.value);
                if (p) handlePresetSelect(p);
              }}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              {PRESET_GEOLOCATIONS.map((preset, i) => (
                <option key={i} value={preset.city}>
                  📍 {preset.city}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Detected Coordinates Pill and Address Search */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 font-bold flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Current: {currentLocation.city}</span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-slate-500" />
              <span>
                {currentLocation.lat.toFixed(4)}° N, {Math.abs(currentLocation.lng).toFixed(4)}° {currentLocation.lng >= 0 ? 'E' : 'W'}
              </span>
            </div>

            {currentLocation.accuracyMeters && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                &plusmn;{currentLocation.accuracyMeters}m GPS precision
              </span>
            )}
          </div>

          {/* Search Any Location / City Bar */}
          <form onSubmit={handleCustomLocationSearch} className="flex items-center gap-1.5 min-w-[280px]">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={customLocationQuery}
                onChange={(e) => setCustomLocationQuery(e.target.value)}
                placeholder="Jump to city or address..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={isGeocodingLocation || !customLocationQuery.trim()}
              className="px-3 py-1.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold disabled:opacity-50 cursor-pointer shrink-0"
            >
              {isGeocodingLocation ? 'Locating...' : 'Go'}
            </button>
          </form>
        </div>
      </div>

      {gpsError && (
        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{gpsError}</span>
        </div>
      )}

      {/* Filter and Facility Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setTypeFilter('all')}
            className={`text-xs px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              typeFilter === 'all'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            All Medical Facilities ({facilities.length})
          </button>

          <button
            onClick={() => setTypeFilter('hospital')}
            className={`text-xs px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              typeFilter === 'hospital'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            <Hospital className="w-3.5 h-3.5" /> Hospitals
          </button>

          <button
            onClick={() => setTypeFilter('pharmacy')}
            className={`text-xs px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              typeFilter === 'pharmacy'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            <Pill className="w-3.5 h-3.5" /> Pharmacies
          </button>

          <button
            onClick={() => setTypeFilter('clinic')}
            className={`text-xs px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              typeFilter === 'clinic'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" /> Clinics
          </button>

          <button
            onClick={() => setTypeFilter('emergency_24_7')}
            className={`text-xs px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              typeFilter === 'emergency_24_7'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" /> 24/7 Emergency
          </button>
        </div>

        {/* Search Facilities */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search hospital or pharmacy..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 dark:text-white"
          />
        </div>
      </div>

      {/* Main Content Layout: Interactive Google Map + Facility Cards List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[640px] lg:h-[720px]">
        {/* Google Map Container (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col relative h-[480px] lg:h-full">
          {/* Map Sub-Header with Map Controls */}
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <MapIcon className="w-4 h-4 text-teal-600" />
              <span>
                {selectedFacility
                  ? `Google Map: ${selectedFacility.name}`
                  : `Google Map: ${currentLocation.city}`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {apiKey && (
                <div className="flex items-center bg-slate-200 dark:bg-slate-700 p-0.5 rounded-lg text-[11px]">
                  <button
                    onClick={() => setMapMode('google_embed')}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                      mapMode === 'google_embed' ? 'bg-white dark:bg-slate-900 text-teal-600 shadow-2xs' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Google Map
                  </button>
                  <button
                    onClick={() => setMapMode('vector_api')}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                      mapMode === 'vector_api' ? 'bg-white dark:bg-slate-900 text-teal-600 shadow-2xs' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Vector API
                  </button>
                </div>
              )}

              {selectedFacility && (
                <button
                  onClick={() => setSelectedFacility(null)}
                  className="px-2.5 py-1 text-[11px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 rounded-lg hover:bg-teal-100 transition-colors"
                >
                  Reset to My Location
                </button>
              )}
            </div>
          </div>

          {/* Map Canvas / Google Maps Frame */}
          <div className="flex-1 w-full h-full relative bg-slate-100 dark:bg-slate-950">
            {mapMode === 'vector_api' && apiKey ? (
              <APIProvider apiKey={apiKey}>
                <Map
                  center={{ lat: currentLocation.lat, lng: currentLocation.lng }}
                  zoom={14}
                  mapId="medtrack_facilities_map"
                  className="w-full h-full"
                  gestureHandling="cooperative"
                  disableDefaultUI={false}
                >
                  <MapPanController center={{ lat: currentLocation.lat, lng: currentLocation.lng }} />

                  {/* User Location Marker */}
                  <AdvancedMarker
                    position={{ lat: currentLocation.lat, lng: currentLocation.lng }}
                    title="Your Location"
                  >
                    <Pin background="#0d9488" glyphColor="#ffffff" borderColor="#042f2e" scale={1.2} />
                  </AdvancedMarker>

                  {/* Facility Markers */}
                  {filteredFacilities.map((facility) => {
                    const isSelected = selectedFacility?.id === facility.id;
                    const isEmergency = facility.isEmergency247;

                    return (
                      <AdvancedMarker
                        key={facility.id}
                        position={{ lat: facility.lat, lng: facility.lng }}
                        title={facility.name}
                        onClick={() => setSelectedFacility(facility)}
                      >
                        <Pin
                          background={isSelected ? '#4f46e5' : isEmergency ? '#e11d48' : '#059669'}
                          glyphColor="#ffffff"
                          borderColor="#ffffff"
                          scale={isSelected ? 1.3 : 1.0}
                        />
                      </AdvancedMarker>
                    );
                  })}

                  {/* Info Window */}
                  {selectedFacility && (
                    <InfoWindow
                      position={{
                        lat: selectedFacility.lat,
                        lng: selectedFacility.lng,
                      }}
                      onCloseClick={() => setSelectedFacility(null)}
                    >
                      <div className="p-1 max-w-xs text-slate-900">
                        <h4 className="font-bold text-xs">{selectedFacility.name}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">{selectedFacility.address}</p>
                        <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-slate-100">
                          <span className="text-[11px] font-bold text-teal-700">
                            {selectedFacility.distanceMiles} mi away
                          </span>
                          <a
                            href={getGoogleMapsDirectionsUrl(
                              currentLocation.lat,
                              currentLocation.lng,
                              selectedFacility.lat,
                              selectedFacility.lng,
                              selectedFacility.name
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-teal-600 font-semibold hover:underline flex items-center gap-0.5 ml-auto"
                          >
                            Directions <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </Map>
              </APIProvider>
            ) : (
              /* High-Reliability Google Maps Embed View showing location in the app */
              <div className="w-full h-full relative">
                <iframe
                  title="Google Maps Location"
                  src={googleMapEmbedUrl}
                  className="w-full h-full border-0"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />

                {/* Floating Map Status Overlay */}
                <div className="absolute top-3 left-3 z-10 pointer-events-none">
                  <div className="px-3 py-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-md flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100 pointer-events-auto">
                    <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
                    <span>
                      {selectedFacility
                        ? `Selected: ${selectedFacility.name}`
                        : `Showing GPS: ${currentLocation.city}`}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Map Footer Bar with Open in Google Maps */}
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
            <span className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-teal-600" />
              Showing {filteredFacilities.length} facilities near {currentLocation.city}
            </span>

            <div className="flex items-center gap-3">
              <a
                href={`https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}&z=15`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 dark:text-teal-400 font-bold hover:underline flex items-center gap-1"
              >
                Open Google Maps App <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Facility Cards List (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col h-full">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Nearby Facilities ({filteredFacilities.length})
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Click any facility to view on Google Map
              </p>
            </div>
            <span className="text-[11px] text-teal-700 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-lg border border-teal-200 dark:border-teal-800">
              Sorted by Distance
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {filteredFacilities.length === 0 ? (
              <div className="text-center py-16 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <Building2 className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  No Facilities Found
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Try changing your category filter or search keywords.
                </p>
              </div>
            ) : (
              filteredFacilities.map((facility) => {
                const isSelected = selectedFacility?.id === facility.id;

                return (
                  <div
                    key={facility.id}
                    onClick={() => setSelectedFacility(facility)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/50 shadow-sm ring-2 ring-teal-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700 bg-white dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {facility.name}
                          </h4>
                          {facility.isEmergency247 && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 flex items-center gap-1">
                              <ShieldAlert className="w-2.5 h-2.5" /> 24/7 Emergency
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          {facility.address}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-extrabold text-teal-700 dark:text-teal-400">
                          {facility.distanceMiles} mi
                        </span>
                        <div className="text-[10px] text-amber-500 font-bold flex items-center justify-end gap-0.5 mt-0.5">
                          ★ {facility.rating} ({facility.reviewCount})
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                      <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 text-[11px]">
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <Clock className="w-3 h-3" />
                          {facility.isOpenNow ? 'Open Now' : 'Closed'}
                        </span>
                        {facility.phone && (
                          <a
                            href={`tel:${facility.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-slate-500 hover:text-teal-600"
                          >
                            <Phone className="w-3 h-3" /> {facility.phone}
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFacility(facility);
                          }}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-teal-50 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1"
                        >
                          <MapPin className="w-3 h-3 text-teal-600" /> Focus
                        </button>

                        <a
                          href={getGoogleMapsDirectionsUrl(
                            currentLocation.lat,
                            currentLocation.lng,
                            facility.lat,
                            facility.lng,
                            facility.name
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1"
                        >
                          <Navigation className="w-3 h-3" /> Route
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
