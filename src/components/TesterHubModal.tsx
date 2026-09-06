import React, { useState } from 'react';
import {
  UserProfile,
  AuthUser,
  ConsultationMessage,
  NotificationSettings,
} from '../types';
import { PRESET_PROFILES } from '../utils/healthCalculators';
import {
  playNotificationRingtone,
  stopActiveRingtone,
  ReminderContent,
} from '../utils/notifications';
import {
  Users,
  X,
  Check,
  Play,
  Square,
  Sparkles,
  ShieldAlert,
  FileBadge,
  Bell,
  Copy,
  QrCode,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  Smartphone,
  Laptop,
  Flame,
  Stethoscope,
  Activity,
  Heart,
  Volume2,
  MapPin,
} from 'lucide-react';

interface TesterHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: UserProfile;
  onSelectProfile: (profile: UserProfile) => void;
  currentUser: AuthUser | null;
  onLoginAsUser: (user: AuthUser) => void;
  onSeedConsultation: (messages: ConsultationMessage[]) => void;
  onClearConsultation: () => void;
  notificationSettings: NotificationSettings;
  onTriggerTestNotification: () => void;
  onTriggerEmergencyBanner: () => void;
  onOpenClinicalBrief: () => void;
  onOpenReminderSettings: () => void;
  onOpenPharmacyLocator?: () => void;
}

// Preset test user personas for testing
const TESTER_PERSONAS: {
  id: string;
  name: string;
  role: string;
  avatar: string;
  email: string;
  badge: string;
  badgeColor: string;
  description: string;
  profile: UserProfile;
}[] = [
  {
    id: 'dr_sarah_chen',
    name: 'Dr. Sarah Chen, MD',
    role: 'Attending Physician & Clinical Reviewer',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
    email: 'dr.chen@medtrack-health.org',
    badge: 'Clinical Lead',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/60 dark:text-teal-200 dark:border-teal-800',
    description: 'Review diagnostic safety, drug contraindications, clinical citations, and RAG medical accuracy.',
    profile: {
      id: 'dr_sarah_chen_profile',
      name: 'Dr. Sarah Chen',
      avatarColor: 'from-teal-600 to-cyan-700',
      demographics: { age: 42, gender: 'Female', profession: 'Hospital Physician' },
      metrics: { heightCm: 168, weightKg: 62, bmi: 22.0, bmiCategory: 'Normal Weight', tdeeKcal: 1950 },
      lifestyle: {
        exerciseFrequency: 'Moderate (3-4 days/week)',
        dailySleepDurationHours: 7.5,
        waterIntakeLiters: 2.5,
        junkFoodIntake: 'Rarely / Clean Eater',
        stressLevel: 'Moderate',
        smokingOrVaping: 'Never',
        alcoholIntake: 'Occasional',
      },
      healthHistory: {
        knownConditions: [],
        allergies: ['Penicillin'],
        currentMedications: ['Daily Multivitamin'],
        familyHistory: [],
      },
      avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
    },
  },
  {
    id: 'alex_rivera',
    name: 'Alex Rivera',
    role: 'Active Developer (Adult Patient)',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    email: 'alex.rivera@techpulse.io',
    badge: 'Adult Patient',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/60 dark:text-indigo-200 dark:border-indigo-800',
    description: 'Tests desk worker symptoms: Migraines, high screen fatigue, prehypertension, and BMI calculators.',
    profile: PRESET_PROFILES[0],
  },
  {
    id: 'eleanor_vance',
    name: 'Eleanor Vance',
    role: 'Geriatric Patient (Polypharmacy)',
    avatar: 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=150&auto=format&fit=crop&q=80',
    email: 'eleanor.vance@seniorcare.net',
    badge: 'Geriatric Health',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/60 dark:text-amber-200 dark:border-amber-800',
    description: 'Tests multiple medication interactions (Lisinopril + Amlodipine), high-contrast accessibility, and joint pain.',
    profile: PRESET_PROFILES[1],
  },
  {
    id: 'marcus_johnson',
    name: 'Marcus & Leo Johnson',
    role: 'Parent (Pediatric Care)',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    email: 'marcus.j@familyfirst.com',
    badge: 'Pediatric Care',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-200 dark:border-emerald-800',
    description: 'Tests child fever triage, weight-adjusted pediatric liquid dosages, and reassuring parent guidance.',
    profile: {
      id: 'marcus_johnson_profile',
      name: 'Marcus Johnson (Child: Leo, 5y)',
      avatarColor: 'from-emerald-500 to-teal-600',
      demographics: { age: 35, gender: 'Male', profession: 'Parent / Teacher' },
      metrics: { heightCm: 178, weightKg: 78, bmi: 24.6, bmiCategory: 'Normal Weight', tdeeKcal: 2300 },
      lifestyle: {
        exerciseFrequency: 'Moderate (3-4 days/week)',
        dailySleepDurationHours: 6.5,
        waterIntakeLiters: 2.2,
        junkFoodIntake: '1-2 times / week',
        stressLevel: 'Moderate',
        smokingOrVaping: 'Never',
        alcoholIntake: 'Occasional',
      },
      healthHistory: {
        knownConditions: ['Pediatric Inquiries (Leo, 5y)'],
        allergies: ['Peanuts'],
        currentMedications: ['Children Liquid Acetaminophen'],
        familyHistory: [],
      },
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
  },
  {
    id: 'qa_compliance_tester',
    name: 'QA & Compliance Tester',
    role: 'Automated Stress & Feature Validator',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    email: 'qa.tester@medtrack-lab.internal',
    badge: 'QA Testing',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/60 dark:text-purple-200 dark:border-purple-800',
    description: 'Tests all 17+ synthesized music ringtones, image attachment OCR, emergency bypass, and printable PDFs.',
    profile: PRESET_PROFILES[2],
  },
];

export const TesterHubModal: React.FC<TesterHubModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onSelectProfile,
  currentUser,
  onLoginAsUser,
  onSeedConsultation,
  onClearConsultation,
  notificationSettings,
  onTriggerTestNotification,
  onTriggerEmergencyBanner,
  onOpenClinicalBrief,
  onOpenReminderSettings,
  onOpenPharmacyLocator,
}) => {
  const [activeTab, setActiveTab] = useState<'personas' | 'actions' | 'checklist' | 'share'>('personas');
  const [copiedLink, setCopiedLink] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    music_ringtone: true,
    ai_consultation: true,
    emergency_redflags: false,
    doctor_brief: false,
    custom_audio_upload: false,
    profile_switching: false,
    dark_mode: false,
  });

  if (!isOpen) return null;

  const currentAppUrl = typeof window !== 'undefined' ? window.location.href : 'https://ais-pre-yivppl7pl5dhe6exrgjoci-639955759901.asia-east1.run.app';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentAppUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleSwitchPersona = (persona: typeof TESTER_PERSONAS[0]) => {
    onSelectProfile(persona.profile);
    const authUser: AuthUser = {
      id: persona.id,
      name: persona.name,
      email: persona.email,
      role: persona.id.startsWith('dr_') ? 'doctor' : 'patient',
      avatarUrl: persona.avatar,
      provider: 'email',
      isVerified: true,
      createdAt: new Date().toISOString(),
    };
    onLoginAsUser(authUser);
    setChecklist((prev) => ({ ...prev, profile_switching: true }));
  };

  const handleSeedFullConsultation = () => {
    const seedData: ConsultationMessage[] = [
      {
        id: `seed_msg_1_${Date.now()}`,
        role: 'user',
        content: 'Hi Doctor, for the past 3 days I have had a throbbing tension headache on the right side of my head, accompanied by neck stiffness and sensitivity to screen light. My blood pressure today measured 138/88 mmHg. Should I be concerned?',
        timestamp: new Date(Date.now() - 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      {
        id: `seed_msg_2_${Date.now()}`,
        role: 'assistant',
        content: `### Clinical Assessment & Triage Analysis

Thank you for providing your symptoms and vitals. Based on your report of unilateral throbbing headache, photophobia, and neck tightness:

#### 1. Triage Classification: Level 2 (Moderate / Non-Emergency)
- **Primary Differential Consideration**: Episodic Migraine with tension-type overlap, possibly exacerbated by prolonged screen strain and postural neck tension.
- **Vitals Evaluation**: Your blood pressure reading of **138/88 mmHg** falls within the *Stage 1 Prehypertension* range. While mildly elevated, it is common during acute headache discomfort.

#### 2. Red-Flag Exclusion
- **Sudden "Thunderclap" Onset**: None reported.
- **Fever, Rash, or Altered Mental Status**: None reported.
- **Focal Neurological Deficits (Weakness/Numbness)**: None reported.

#### 3. Recommended Action Plan
1. **Hydration & Electrolytes**: Drink 500ml water and rest in a dim, quiet room.
2. **Ergonomic Adjustment**: Take a 20-20-20 screen break and apply warm compresses to cervical muscles.
3. **Primary Care Follow-up**: If headaches recur >2 times weekly or exceed 72 hours, schedule an outpatient physician visit.`,
        timestamp: new Date(Date.now() - 3500000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        triageLevel: 'Level 2: Routine Consultation',
      },
    ];

    onSeedConsultation(seedData);
    setSeedSuccess(true);
    setChecklist((prev) => ({ ...prev, ai_consultation: true }));
    setTimeout(() => setSeedSuccess(false), 3500);
  };

  const toggleChecklistItem = (key: string) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div
      id="tester-hub-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="tester-hub-modal-container"
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-teal-100/90 dark:border-slate-800 w-full max-w-3xl my-6 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 transition-colors"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-linear-to-r from-teal-800 via-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-xs border border-white/20 shadow-inner">
              <Users className="w-5 h-5 text-indigo-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg font-display text-white">
                  Multi-User Testing &amp; QA Sandbox Hub
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 px-2 py-0.5 rounded-full">
                  Testing Mode
                </span>
              </div>
              <p className="text-xs text-indigo-200/90">
                Switch user personas, test desktop audio/music alarms, simulate clinical triage, and share test sessions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 sm:px-6 pt-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto shrink-0">
          {[
            { id: 'personas', label: '👥 Test Personas', desc: 'Switch user accounts' },
            { id: 'actions', label: '⚡ 1-Click Test Actions', desc: 'Simulate features' },
            { id: 'checklist', label: '📋 QA Checklist', desc: 'Feature verification' },
            { id: 'share', label: '🔗 Share & Mobile Test', desc: 'Invite other testers' },
          ].map((tabItem) => (
            <button
              key={tabItem.id}
              onClick={() => setActiveTab(tabItem.id as any)}
              className={`px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === tabItem.id
                  ? 'border-teal-600 dark:border-teal-400 text-teal-800 dark:text-teal-200 bg-white dark:bg-slate-900 shadow-2xs'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tabItem.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 grow">
          {/* TAB 1: PERSONAS */}
          {activeTab === 'personas' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-900/60 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-teal-950 dark:text-teal-200 block">
                    Active Tester Context
                  </span>
                  <span className="text-xs text-teal-700 dark:text-teal-300">
                    Logged in as: <strong>{currentUser?.name || currentProfile.name}</strong> ({currentProfile.demographics.age}y {currentProfile.demographics.gender}, BMI {currentProfile.metrics.bmi})
                  </span>
                </div>
                <span className="text-[11px] font-bold bg-teal-200 dark:bg-teal-900 text-teal-900 dark:text-teal-100 px-2.5 py-1 rounded-full">
                  Active
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {TESTER_PERSONAS.map((persona) => {
                  const isActive = currentProfile.id === persona.profile.id || currentUser?.id === persona.id;
                  return (
                    <div
                      key={persona.id}
                      onClick={() => handleSwitchPersona(persona)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group relative ${
                        isActive
                          ? 'border-teal-500 bg-teal-50/90 dark:bg-teal-950/60 ring-2 ring-teal-300 dark:ring-teal-900 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-teal-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <img
                          src={persona.avatar}
                          alt={persona.name}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                        <div className="grow min-w-0">
                          <div className="flex items-center justify-between gap-1.5">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                              {persona.name}
                            </h4>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${persona.badgeColor} shrink-0`}>
                              {persona.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-teal-700 dark:text-teal-300 font-semibold truncate">
                            {persona.role}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {persona.description}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          {persona.email}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSwitchPersona(persona);
                          }}
                          className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                            isActive
                              ? 'bg-teal-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 group-hover:bg-teal-500 group-hover:text-white'
                          }`}
                        >
                          {isActive ? '✓ Active Persona' : 'Switch To User'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: 1-CLICK ACTIONS */}
          {activeTab === 'actions' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Trigger key application pathways instantly to verify sound synthesis, triage logic, and report generation:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. Seed Conversation */}
                <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        Seed Full Consultation Chat
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Populates a realistic patient headache dialogue with Triage Level 2, blood pressure vitals, and action items.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSeedFullConsultation}
                    className="mt-3 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{seedSuccess ? '✓ Consultation Seeded!' : 'Seed Sample Chat Now'}</span>
                  </button>
                </div>

                {/* 2. Audio Ringtone Alarm Test */}
                <div className="p-4 rounded-2xl border border-teal-200 dark:border-teal-900 bg-teal-50/50 dark:bg-teal-950/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Bell className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        Test Desktop Audio Ringtone
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Triggers active ringtone tone ({notificationSettings.ringtoneSound}) at {Math.round((notificationSettings.ringtoneVolume ?? 0.8) * 100)}% volume for {notificationSettings.ringtoneDuration || 4} seconds.
                    </p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={onTriggerTestNotification}
                      className="grow py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Ring Alarm Now</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenReminderSettings();
                      }}
                      className="px-3 py-2 bg-white dark:bg-slate-800 text-teal-900 dark:text-teal-200 border border-teal-300 dark:border-slate-700 font-semibold text-xs rounded-xl hover:bg-teal-50 transition-colors cursor-pointer"
                    >
                      Settings
                    </button>
                  </div>
                </div>

                {/* 3. Emergency Red Flag Banner */}
                <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        Trigger Level 4 Emergency
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Displays the 911 high-priority emergency banner with chest pain &amp; stroke red flag checklists.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onTriggerEmergencyBanner();
                      setChecklist((prev) => ({ ...prev, emergency_redflags: true }));
                    }}
                    className="mt-3 w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Open Emergency Modal</span>
                  </button>
                </div>

                {/* 4. Doctor Clinical Brief */}
                <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <FileBadge className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        Printable Doctor Brief
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Opens structured clinical summary formatted for physician consult with timeline, vitals, and medications.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenClinicalBrief();
                      setChecklist((prev) => ({ ...prev, doctor_brief: true }));
                    }}
                    className="mt-3 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <FileBadge className="w-3.5 h-3.5" />
                    <span>View Doctor Summary</span>
                  </button>
                </div>

                {/* 5. Google Maps Medical Stores Locator */}
                <div className="p-4 rounded-2xl border border-teal-200 dark:border-teal-900 bg-teal-50/50 dark:bg-teal-950/30 flex flex-col justify-between sm:col-span-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <MapPin className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        Google Maps GPS Medical Stores &amp; Pharmacy Finder
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Acquires real device GPS coordinates, audits nearby medical stores for patient&apos;s required medicines inventory, and provides 1-click turn-by-turn directions.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onOpenPharmacyLocator) onOpenPharmacyLocator();
                      setChecklist((prev) => ({ ...prev, gps_pharmacy: true }));
                    }}
                    className="mt-3 w-full py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Launch Google Maps GPS Pharmacy Finder</span>
                  </button>
                </div>
              </div>

              {/* Reset session button */}
              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Clean Slate Reset
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Clear consultation messages and start a fresh testing session
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onClearConsultation}
                  className="px-3 py-1.5 bg-white dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Chat</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: QA CHECKLIST */}
          {activeTab === 'checklist' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-teal-950 dark:text-teal-300 uppercase tracking-wider">
                  Test Suite Verification Checklist
                </h4>
                <span className="text-xs font-bold bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 px-2 py-0.5 rounded-lg">
                  {Object.values(checklist).filter(Boolean).length} / {Object.keys(checklist).length} Completed
                </span>
              </div>

              <div className="space-y-2">
                {[
                  { key: 'notification_unblocking', title: 'Browser Notification Permission & Unblock Guide', desc: 'Tested instructions for unblocking notifications in Chrome, Safari, Edge, Firefox & Mobile' },
                  { key: 'music_ringtone', title: '17+ Polyphonic Synthesizer Music Ringtones', desc: 'Tested audio playback across classical, ambient, and clinical categories' },
                  { key: 'custom_audio_upload', title: 'Custom Desktop Audio / MP3 File Upload', desc: 'Tested uploading audio track from desktop (MP3/WAV/OGG/AAC)' },
                  { key: 'ai_consultation', title: 'Clinical AI Consultation & RAG Grounding', desc: 'Verified conversational health guidance with triage scoring' },
                  { key: 'emergency_redflags', title: 'Level 4 Critical Red-Flag Emergency Override', desc: 'Tested 911 rapid escalation alert banner' },
                  { key: 'doctor_brief', title: 'Printable Doctor Clinical Brief & PDF Export', desc: 'Tested generation of structured clinical summaries' },
                  { key: 'gps_pharmacy', title: 'Google Maps GPS & Nearby Medical Store Finder', desc: 'Tested real-time GPS coordinate acquisition, required medicines stock audit, and 1-click turn-by-turn routing' },
                  { key: 'profile_switching', title: 'Multi-User Personas & Health Metrics', desc: 'Tested switching profiles and dynamic BMI/TDEE calculations' },
                  { key: 'dark_mode', title: 'Dark & Light Theme Adaptability', desc: 'Verified color contrast in both dark and light modes' },
                ].map((item) => {
                  const isDone = checklist[item.key];
                  return (
                    <div
                      key={item.key}
                      onClick={() => toggleChecklistItem(item.key)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isDone
                          ? 'border-emerald-300 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-teal-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center mt-0.5 border ${
                          isDone
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                        }`}>
                          {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div>
                          <span className={`text-xs font-bold block ${isDone ? 'text-emerald-900 dark:text-emerald-200' : 'text-slate-900 dark:text-slate-100'}`}>
                            {item.title}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {item.desc}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: SHARE & MOBILE */}
          {activeTab === 'share' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 space-y-3">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <h4 className="font-bold text-sm text-indigo-950 dark:text-indigo-200">
                      Shareable Live App Link for Testing
                    </h4>
                    <p className="text-xs text-indigo-700 dark:text-indigo-300">
                      Send this link to colleagues or test on your mobile phone browser:
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={currentAppUrl}
                    className="grow px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              {/* Mobile Device Testing QR Box */}
              <div className="p-4 rounded-2xl border border-teal-100 dark:border-slate-700 bg-white dark:bg-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Test on Mobile &amp; Tablet
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Fully responsive layout supporting touch gestures, audio alarms, and camera attachments on iOS Safari and Android Chrome.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowQrCode((prev) => !prev)}
                  className="px-3.5 py-2 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-teal-900 dark:text-teal-200 text-xs font-semibold rounded-xl border border-teal-300 dark:border-teal-800 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>{showQrCode ? 'Hide QR Code' : 'Show Mobile QR Code'}</span>
                </button>
              </div>

              {showQrCode && (
                <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center space-y-3 animate-in fade-in zoom-in-95">
                  <div className="p-3 bg-white rounded-xl shadow-md border border-slate-200">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(currentAppUrl)}`}
                      alt="Mobile Test QR Code"
                      className="w-40 h-40"
                    />
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Scan with your phone camera to open and test directly on mobile.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-teal-100/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Medtrack Clinical Testing Sandbox
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
          >
            Done Testing
          </button>
        </div>
      </div>
    </div>
  );
};
