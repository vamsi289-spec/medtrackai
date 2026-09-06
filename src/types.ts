export type Gender = 'Male' | 'Female' | 'Non-Binary' | 'Prefer not to say';

export type ExerciseFrequency = 
  | 'Sedentary (Rarely/Never)' 
  | 'Light (1-2 days/week)' 
  | 'Moderate (3-4 days/week)' 
  | 'Active (5+ days/week)' 
  | 'Athlete (Daily intensive)';

export type JunkFoodIntake = 
  | 'Rarely / Clean Eater' 
  | '1-2 times / week' 
  | '3-5 times / week' 
  | 'Daily / Fast Food Dependent';

export type TriageLevel = 
  | 'Level 1: Self-Care' 
  | 'Level 2: Routine Consultation' 
  | 'Level 3: Urgent Care within 24 Hours' 
  | 'Level 4: Critical Emergency';

export type UserRole = 'doctor' | 'patient';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  token?: string;
  createdAt: string;
  avatarUrl?: string;
  provider?: 'email' | 'google' | 'facebook' | 'guest';
}

export interface DoctorProfileDetails {
  specialty: string;
  licenseNumber: string;
  hospitalAffiliation: string;
  consultationHours?: string;
  yearsExperience?: number;
  bio?: string;
}

export interface PatientRecord {
  id: string;
  doctorId: string;
  userId?: string;
  fullName: string;
  age: number;
  gender: string;
  phone?: string;
  email?: string;
  bloodGroup?: string;
  medicalHistory: string[];
  allergies: string[];
  currentMedications: string[];
  vitals?: {
    bloodPressure?: string;
    heartRate?: number;
    glucoseLevel?: string;
    temperature?: string;
    oxygenSaturation?: string;
    weightKg?: number;
    heightCm?: number;
  };
  status: 'active' | 'under_observation' | 'discharged';
  notesCount?: number;
  lastVisitDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentItem {
  id: string;
  patientId?: string;
  doctorId?: string;
  userId?: string;
  patientName: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  reason: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
}

export interface PrescriptionItem {
  id: string;
  doctorId: string;
  patientId: string;
  patientName: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  status: 'active' | 'completed' | 'discontinued';
  createdAt: string;
}

export interface DoctorNoteItem {
  id: string;
  doctorId: string;
  patientId: string;
  title: string;
  content: string;
  clinicalImpression?: string;
  treatmentPlan?: string;
  createdAt: string;
}

export type NotificationPriority = 'critical' | 'normal' | 'low';

export interface PrioritizedNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  type: 'emergency' | 'appointment' | 'medication' | 'vitals' | 'general';
  isRead: boolean;
  scheduledFor?: string;
  createdAt: string;
}

export type NotificationItem = PrioritizedNotification;

export interface MedTrackAssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: GroundingSource[];
  isWarning?: boolean;
}

export interface UserDemographics {
  age: number;
  gender: Gender;
  profession: string;
}

export interface UserMetrics {
  heightCm: number;
  weightKg: number;
  bmi: number;
  bmiCategory: 'Underweight' | 'Normal Weight' | 'Overweight' | 'Obese';
  tdeeKcal: number;
}

export interface UserLifestyle {
  exerciseFrequency: ExerciseFrequency;
  junkFoodIntake: JunkFoodIntake;
  dailySleepDurationHours: number;
  waterIntakeLiters: number;
  stressLevel: 'Low' | 'Moderate' | 'High' | 'Severe';
  smokingOrVaping: 'Never' | 'Former' | 'Occasional' | 'Daily';
  alcoholIntake: 'None' | 'Occasional' | 'Moderate' | 'Heavy';
}

export interface UserHealthHistory {
  knownConditions: string[];
  allergies: string[];
  currentMedications: string[];
  familyHistory: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  avatarColor: string;
  avatarUrl?: string;
  demographics: UserDemographics;
  metrics: UserMetrics;
  lifestyle: UserLifestyle;
  healthHistory: UserHealthHistory;
  customNotes?: string;
  heightCm?: number;
  weightKg?: number;
  bloodGroup?: string;
  allergies?: string[];
  phone?: string;
  profession?: string;
  licenseNumber?: string;
  hospitalClinic?: string;
}

export interface AttachmentItem {
  id: string;
  name: string;
  type: 'image' | 'document';
  mimeType: string;
  data: string; // Base64 data URI or string
  previewUrl: string;
  fileSize?: string;
  category?: 'rash' | 'lab_report' | 'prescription' | 'general';
}

export interface GroundingSource {
  title: string;
  uri: string;
  publisher?: string;
  evidenceGrade?: 'Grade A (Clinical Trials)' | 'Grade A (WHO / CDC Guidelines)' | 'Grade B (Peer-Reviewed Evidence)' | 'Grade C (Consensus Medical Reference)';
  snippet?: string;
}

export interface RagGroundingMetadata {
  isRAGGrounded: boolean;
  searchQueries?: string[];
  evidenceLevel: string;
  sourceCount: number;
  lastRetrieved: string;
  institutions: string[];
}

export interface BiomarkerItem {
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'High' | 'Normal' | 'Low';
  plainLanguageMeaning: string;
}

export interface BiomarkerAnalysis {
  reportTitle: string;
  testDate?: string;
  summary: string;
  biomarkers: BiomarkerItem[];
  abnormalCount: number;
  keyRecommendations: string[];
}

export interface DifferentialDiagnosis {
  condition: string;
  likelihood: 'High' | 'Moderate' | 'Low';
  distinguishingFeatures: string;
  educationalInfo: string;
}

export interface VisionPreScreening {
  anatomicalLocation: string;
  visualMorphology: string;
  confidenceScore: string;
  differentialDiagnoses: DifferentialDiagnosis[];
  urgencyFlag: string;
  homeComfortMeasures: string[];
  specialistToSee: string;
}

export interface ConsultationMessage {
  id: string;
  role: 'user' | 'assistant' | 'emergency';
  content: string;
  timestamp: string;
  triageLevel?: TriageLevel;
  sources?: GroundingSource[];
  ragGrounding?: RagGroundingMetadata;
  attachments?: AttachmentItem[];
  biomarkerAnalysis?: BiomarkerAnalysis;
  visionPreScreening?: VisionPreScreening;
  isEmergencyOverride?: boolean;
}

export type NotificationReminderType = 'metrics' | 'consultation_summary' | 'medications' | 'hydration' | 'both';

export type ReminderFrequency = 'once_daily' | 'thrice_daily' | 'interval_2h' | 'interval_4h';

export type RingtoneSound = 
  | 'harmonic_chime' 
  | 'gentle_bell' 
  | 'clinical_pager' 
  | 'soothing_harp' 
  | 'uplifting_pulse' 
  | 'beethoven_ode'
  | 'vivaldi_spring'
  | 'mozart_allegro'
  | 'canon_in_d'
  | 'zen_singing_bowl'
  | 'lofi_chill'
  | 'ocean_breeze'
  | 'marimba_island'
  | 'acoustic_strum'
  | 'synthwave_neon'
  | 'cosmic_ambient'
  | 'nurse_call_soft'
  | 'custom_upload';

export interface NotificationSettings {
  enabled: boolean;
  time: string; // e.g. "09:00"
  reminderType: NotificationReminderType;
  frequency?: ReminderFrequency;
  scheduleSlots?: string[]; // e.g. ["09:00", "14:00", "20:00"]
  lastTriggeredDate?: string;
  soundEnabled: boolean;
  ringtoneSound: RingtoneSound;
  ringtoneDuration: number; // Duration in seconds (e.g. 2, 4, 7, 10, 15)
  ringtoneVolume: number; // 0.0 to 1.0
  volume?: number; // alias for ringtoneVolume
  customAudioUrl?: string; // Base64 audio data URI or URL
  customAudioName?: string;
  customMessage?: string;
}

export type StockAvailability = 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Available on Request';

export interface StockedMedicineItem {
  name: string;
  dosage?: string;
  availability: StockAvailability;
  estimatedPrice?: string;
  requiresPrescription: boolean;
  genericAlternative?: string;
  category?: string;
}

export interface MedicalStore {
  id: string;
  name: string;
  brand?: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  distanceMiles: number;
  distanceKm: number;
  walkingTimeMinutes: number;
  drivingTimeMinutes: number;
  isOpenNow: boolean;
  openingHours: string;
  rating: number;
  reviewCount: number;
  phone: string;
  is24Hours: boolean;
  hasHomeDelivery: boolean;
  hasDriveThru: boolean;
  hasVaccinationServices: boolean;
  acceptsInsurance: boolean;
  stockedMedicines: StockedMedicineItem[];
  googleMapsUrl?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ConsultationMessage[];
  triageLevel?: TriageLevel;
  profileName?: string;
  summary?: string;
  category?: 'general' | 'rash' | 'lab_report' | 'emergency' | 'prescription';
}

