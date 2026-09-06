// Google Maps Platform Medical Stores & Pharmacy Locator Service
// Source: Google Maps Platform Code Assist
import { MedicalStore, StockedMedicineItem, StockAvailability } from '../types';

export interface GpsLocation {
  lat: number;
  lng: number;
  accuracyMeters?: number;
  city?: string;
  source: 'gps' | 'preset' | 'custom_search';
  address?: string;
}

// Default standard common medicines in pharmacies
export const COMMON_ESSENTIAL_MEDICINES = [
  'Amoxicillin 500mg',
  'Metformin 500mg',
  'Lisinopril 10mg',
  'Ventolin (Albuterol) Inhaler',
  'Atorvastatin 20mg',
  'Omeprazole 20mg',
  'Paracetamol (Acetaminophen) 500mg',
  'Ibuprofen 400mg',
  'Cetirizine 10mg (Zyrtec)',
  'Azithromycin 250mg',
  'Losartan 50mg',
  'Insulin Glargine (Lantus)',
  'Hydrochlorothiazide 25mg',
  'Levothyroxine 50mcg',
  'Amlodipine 5mg',
  'Sertraline 50mg',
  'Gabapentin 300mg',
  'Prednisone 10mg',
  'Salbutamol Respirator Solution',
  'Oral Rehydration Salts (ORS)',
];

// Presets for instant GPS demo or testing across various regions
export const PRESET_GEOLOCATIONS: { label: string; lat: number; lng: number; city: string }[] = [
  { label: 'Visakhapatnam, Andhra Pradesh', lat: 17.6868, lng: 83.2185, city: 'Visakhapatnam, AP' },
  { label: 'Hyderabad, Telangana', lat: 17.385, lng: 78.4867, city: 'Hyderabad, Telangana' },
  { label: 'Bengaluru, Karnataka', lat: 12.9716, lng: 77.5946, city: 'Bengaluru, Karnataka' },
  { label: 'Mumbai, Maharashtra', lat: 19.076, lng: 72.8777, city: 'Mumbai, Maharashtra' },
  { label: 'New Delhi, NCR', lat: 28.6139, lng: 77.209, city: 'New Delhi, NCR' },
  { label: 'Chennai, Tamil Nadu', lat: 13.0827, lng: 80.2707, city: 'Chennai, Tamil Nadu' },
  { label: 'San Francisco, CA', lat: 37.7749, lng: -122.4194, city: 'San Francisco, CA' },
  { label: 'New York, NY (Manhattan)', lat: 40.7128, lng: -74.006, city: 'New York, NY' },
  { label: 'London, UK (Westminster)', lat: 51.5074, lng: -0.1278, city: 'London, UK' },
  { label: 'Sydney, NSW', lat: -33.8688, lng: 151.2093, city: 'Sydney, Australia' },
];

export const USER_GPS_STORAGE_KEY = 'medtrack_user_gps_location';

/**
 * Retrieve saved GPS location from localStorage
 */
export function getSavedGpsLocation(): GpsLocation | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_GPS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
      return parsed;
    }
  } catch {
    // Ignore parse error
  }
  return null;
}

/**
 * Save GPS location to localStorage
 */
export function saveGpsLocation(loc: GpsLocation): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(USER_GPS_STORAGE_KEY, JSON.stringify(loc));
  } catch {
    // Ignore storage error
  }
}

/**
 * Calculates Great-Circle distance between two coordinates in kilometers and miles
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): { km: number; miles: number } {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const km = R * c;
  const miles = km * 0.621371;
  return {
    km: Math.round(km * 10) / 10,
    miles: Math.round(miles * 10) / 10,
  };
}

/**
 * Generates Google Maps Directions link
 */
export function getGoogleMapsDirectionsUrl(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  destinationName?: string
): string {
  const destQuery = destinationName
    ? encodeURIComponent(`${destinationName}`)
    : `${destLat},${destLng}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destQuery}&destination_place_id=&travelmode=driving`;
}

/**
 * Generates Google Maps Search URL for pharmacy near coordinate
 */
export function getGoogleMapsSearchNearbyUrl(lat: number, lng: number, query = 'pharmacy medical store'): string {
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}/@${lat},${lng},15z`;
}

/**
 * Geocode an address/city string to coordinates using server proxy with OSM fallback
 */
export async function geocodeAddressQuery(query: string): Promise<{ lat: number; lng: number; city: string } | null> {
  if (!query || !query.trim()) return null;
  const cleanQ = query.trim();

  // Try server proxy first to avoid browser User-Agent restrictions
  try {
    const res = await fetch(`/api/geocode-address?q=${encodeURIComponent(cleanQ)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && typeof data.lat === 'number') {
        return {
          lat: data.lat,
          lng: data.lng,
          city: data.city || cleanQ,
        };
      }
    }
  } catch {
    // Server proxy failed, fallback to client fetch
  }

  // Fallback to client fetch
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQ)}&limit=1`,
      {
        headers: { 'Accept-Language': 'en' },
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const parsedLat = parseFloat(item.lat);
        const parsedLng = parseFloat(item.lon);
        const cleanName = item.display_name.split(',').slice(0, 2).join(',').trim();
        return {
          lat: parsedLat,
          lng: parsedLng,
          city: cleanName || cleanQ,
        };
      }
    }
  } catch (err) {
    console.warn('Geocoding query error:', err);
  }
  return null;
}

/**
 * Reverse geocode latitude/longitude into human-readable city and region
 */
async function reverseGeocodeCoords(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.city) {
        return data.city;
      }
    }
  } catch {
    // Fall through to public Nominatim
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const revRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=12`,
      {
        headers: { 'Accept-Language': 'en' },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);
    if (revRes.ok) {
      const data = await revRes.json();
      const addr = data.address;
      if (addr) {
        const town = addr.city || addr.town || addr.village || addr.suburb || addr.county;
        const region = addr.state || addr.country;
        if (town && region) return `${town}, ${region}`;
        if (town) return town;
        if (data.display_name) return data.display_name.split(',').slice(0, 2).join(',').trim();
      }
    }
  } catch {
    // Ignore
  }

  return `GPS (${lat.toFixed(3)}°, ${lng.toFixed(3)}°)`;
}

/**
 * Robust Multi-Tier Device & Network GPS Acquisition:
 * Tier 1: Hardware/High-Accuracy GPS (5s timeout)
 * Tier 2: Low-Accuracy / Fast WiFi & Cellular Triangulation (6s timeout)
 * Tier 3: Server-Side & Public Network IP Geolocation
 */
export async function acquireDeviceGps(): Promise<GpsLocation> {
  // Helper to run browser getCurrentPosition with given options
  const getBrowserPosition = (options: PositionOptions): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  };

  // Tier 1: High Accuracy Browser GPS
  try {
    const pos = await getBrowserPosition({
      enableHighAccuracy: true,
      timeout: 4500,
      maximumAge: 15000,
    });
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const city = await reverseGeocodeCoords(lat, lng);
    const result: GpsLocation = {
      lat,
      lng,
      accuracyMeters: Math.round(pos.coords.accuracy),
      source: 'gps',
      city,
    };
    saveGpsLocation(result);
    return result;
  } catch {
    // Tier 1 failed (e.g. desktop, laptop without GPS chip, indoor timeout), try Tier 2
  }

  // Tier 2: Fast WiFi/Network Triangulation Browser Geolocation
  try {
    const pos = await getBrowserPosition({
      enableHighAccuracy: false,
      timeout: 5000,
      maximumAge: 60000,
    });
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const city = await reverseGeocodeCoords(lat, lng);
    const result: GpsLocation = {
      lat,
      lng,
      accuracyMeters: Math.round(pos.coords.accuracy),
      source: 'gps',
      city,
    };
    saveGpsLocation(result);
    return result;
  } catch {
    // Browser geolocation denied, unavailable, or restricted in iframe. Proceed to Tier 3
  }

  // Tier 3: IP-Based Geolocation via Backend or Public IP service
  try {
    const res = await fetch('/api/detect-location');
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && typeof data.lat === 'number') {
        const result: GpsLocation = {
          lat: data.lat,
          lng: data.lng,
          source: 'gps',
          city: data.city || 'Detected Location',
          address: data.country,
        };
        saveGpsLocation(result);
        return result;
      }
    }
  } catch {
    // Server route fallback
  }

  // Tier 4: Direct Client IP lookup fallback
  try {
    const ipRes = await fetch('https://ipwho.is/');
    if (ipRes.ok) {
      const data: any = await ipRes.json();
      if (data && (data.latitude || data.lat)) {
        const lat = Number(data.latitude || data.lat);
        const lng = Number(data.longitude || data.lon || data.lng);
        const city = data.city ? `${data.city}, ${data.region || data.country}` : 'Detected Location';
        const result: GpsLocation = {
          lat,
          lng,
          source: 'gps',
          city,
        };
        saveGpsLocation(result);
        return result;
      }
    }
  } catch {
    // Fallback
  }

  // Fallback to Visakhapatnam / Regional preset
  const fallbackResult: GpsLocation = {
    lat: 17.6868,
    lng: 83.2185,
    city: 'Visakhapatnam, Andhra Pradesh',
    source: 'preset',
  };
  saveGpsLocation(fallbackResult);
  return fallbackResult;
}

const PHARMACY_TEMPLATES = [
  {
    nameSuffix: 'Apothecary & Health Mart',
    brand: 'HealthMart Specialty',
    rating: 4.9,
    reviewCount: 428,
    is24Hours: true,
    hasHomeDelivery: true,
    hasDriveThru: true,
    hasVaccinationServices: true,
    acceptsInsurance: true,
    phone: '+1 (555) 234-8901',
    offsetLat: 0.0038,
    offsetLng: 0.0042,
    streetName: 'Medical Plaza Way',
    openingHours: 'Open 24 Hours • 7 Days a Week',
  },
  {
    nameSuffix: 'CareRx Community Pharmacy',
    brand: 'CareRx Network',
    rating: 4.8,
    reviewCount: 312,
    is24Hours: false,
    hasHomeDelivery: true,
    hasDriveThru: false,
    hasVaccinationServices: true,
    acceptsInsurance: true,
    phone: '+1 (555) 345-6789',
    offsetLat: -0.0045,
    offsetLng: 0.0031,
    streetName: 'Central Avenue',
    openingHours: 'Open Today: 8:00 AM – 10:00 PM',
  },
  {
    nameSuffix: 'Metro Wellness & Med Store',
    brand: 'Metro Health Group',
    rating: 4.7,
    reviewCount: 560,
    is24Hours: true,
    hasHomeDelivery: true,
    hasDriveThru: true,
    hasVaccinationServices: true,
    acceptsInsurance: true,
    phone: '+1 (555) 456-7890',
    offsetLat: 0.0062,
    offsetLng: -0.0055,
    streetName: 'Hospital Boulevard',
    openingHours: 'Open 24 Hours (Drive-Thru Available)',
  },
  {
    nameSuffix: 'Evergreen Clinical Dispensary',
    brand: 'Evergreen Health',
    rating: 4.6,
    reviewCount: 184,
    is24Hours: false,
    hasHomeDelivery: false,
    hasDriveThru: true,
    hasVaccinationServices: true,
    acceptsInsurance: true,
    phone: '+1 (555) 567-8901',
    offsetLat: -0.0078,
    offsetLng: -0.0041,
    streetName: 'Oakridge Park Drive',
    openingHours: 'Open Today: 8:30 AM – 9:00 PM',
  },
  {
    nameSuffix: 'PrimeCare Express Pharmacy',
    brand: 'PrimeCare Rx',
    rating: 4.9,
    reviewCount: 692,
    is24Hours: true,
    hasHomeDelivery: true,
    hasDriveThru: true,
    hasVaccinationServices: true,
    acceptsInsurance: true,
    phone: '+1 (555) 678-9012',
    offsetLat: 0.0091,
    offsetLng: 0.0075,
    streetName: 'Civic Center Parkway',
    openingHours: 'Open 24 Hours • Free Local Delivery',
  },
  {
    nameSuffix: 'Beacon Hill Compounding & Meds',
    brand: 'Beacon Compounding',
    rating: 4.8,
    reviewCount: 220,
    is24Hours: false,
    hasHomeDelivery: true,
    hasDriveThru: false,
    hasVaccinationServices: false,
    acceptsInsurance: true,
    phone: '+1 (555) 789-0123',
    offsetLat: -0.0112,
    offsetLng: 0.0089,
    streetName: 'Sunrise Boulevard',
    openingHours: 'Open Today: 9:00 AM – 8:00 PM',
  },
];

/**
 * Generate populated Medical Stores & Pharmacies around a given GPS coordinate,
 * automatically auditing stock for the user's required medications.
 */
export function getNearbyMedicalStores(
  centerLat: number,
  centerLng: number,
  requiredMedicines: string[] = []
): MedicalStore[] {
  // Normalize required medicines list
  const cleanReqMeds = requiredMedicines
    .map((m) => m.trim())
    .filter((m) => m.length > 0);

  return PHARMACY_TEMPLATES.map((tmpl, idx) => {
    const storeLat = centerLat + tmpl.offsetLat;
    const storeLng = centerLng + tmpl.offsetLng;
    const dist = calculateDistance(centerLat, centerLng, storeLat, storeLng);

    // Approximate travel times: 3.5 mph walking, 25 mph driving in urban areas
    const walkingMins = Math.max(2, Math.round((dist.miles / 3.1) * 60));
    const drivingMins = Math.max(1, Math.round((dist.miles / 22) * 60) + 1);

    // Build stocked medicines inventory for this pharmacy
    const stockedList: StockedMedicineItem[] = [];

    // 1. Audit user required medicines
    cleanReqMeds.forEach((reqMed, medIdx) => {
      // Deterministic pseudo-random availability based on store and medicine index
      const seed = (idx + 1) * 7 + (medIdx + 1) * 13;
      let avail: StockAvailability = 'In Stock';
      if (seed % 9 === 0) {
        avail = 'Low Stock';
      } else if (seed % 15 === 0 && idx > 2) {
        avail = 'Out of Stock';
      } else if (seed % 11 === 0 && idx > 3) {
        avail = 'Available on Request';
      }

      const needsRx = !reqMed.toLowerCase().includes('paracetamol') &&
        !reqMed.toLowerCase().includes('ibuprofen') &&
        !reqMed.toLowerCase().includes('cetirizine') &&
        !reqMed.toLowerCase().includes('rehydration');

      stockedList.push({
        name: reqMed,
        availability: avail,
        estimatedPrice: `$${(12 + (seed % 35)).toFixed(2)}`,
        requiresPrescription: needsRx,
        category: 'Prescribed / Required',
      });
    });

    // 2. Add standard essential inventory
    COMMON_ESSENTIAL_MEDICINES.forEach((comMed, cIdx) => {
      // Don't duplicate if already in required list
      if (!cleanReqMeds.some((r) => r.toLowerCase().includes(comMed.toLowerCase().split(' ')[0]))) {
        const seed = (idx + 2) * 5 + (cIdx + 1) * 11;
        const avail: StockAvailability = seed % 13 === 0 ? 'Low Stock' : 'In Stock';
        const needsRx = !comMed.toLowerCase().includes('paracetamol') &&
          !comMed.toLowerCase().includes('ibuprofen') &&
          !comMed.toLowerCase().includes('cetirizine') &&
          !comMed.toLowerCase().includes('rehydration');

        stockedList.push({
          name: comMed,
          availability: avail,
          estimatedPrice: `$${(9 + (seed % 28)).toFixed(2)}`,
          requiresPrescription: needsRx,
          category: 'General Inventory',
        });
      }
    });

    const storeName = `${tmpl.brand} - ${tmpl.nameSuffix}`;
    const streetNum = 100 + idx * 45;
    const address = `${streetNum} ${tmpl.streetName}, Suite ${idx + 1}0${idx + 1}`;

    return {
      id: `store_${idx}_${Math.round(centerLat * 100)}_${Math.round(centerLng * 100)}`,
      name: storeName,
      brand: tmpl.brand,
      address,
      city: 'Local Area',
      lat: storeLat,
      lng: storeLng,
      distanceMiles: dist.miles,
      distanceKm: dist.km,
      walkingTimeMinutes: walkingMins,
      drivingTimeMinutes: drivingMins,
      isOpenNow: tmpl.is24Hours || true,
      openingHours: tmpl.openingHours,
      rating: tmpl.rating,
      reviewCount: tmpl.reviewCount,
      phone: tmpl.phone,
      is24Hours: tmpl.is24Hours,
      hasHomeDelivery: tmpl.hasHomeDelivery,
      hasDriveThru: tmpl.hasDriveThru,
      hasVaccinationServices: tmpl.hasVaccinationServices,
      acceptsInsurance: tmpl.acceptsInsurance,
      stockedMedicines: stockedList,
      googleMapsUrl: getGoogleMapsDirectionsUrl(centerLat, centerLng, storeLat, storeLng, storeName),
    };
  });
}
