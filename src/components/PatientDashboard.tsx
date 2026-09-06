import React, { useState, useEffect } from 'react';
import {
  HeartPulse,
  Activity,
  Calendar,
  Pill,
  FileText,
  Sparkles,
  ArrowRight,
  Clock,
  ShieldCheck,
  Plus,
  ChevronRight,
  AlertCircle,
  Stethoscope,
  Droplet,
  Compass,
} from 'lucide-react';
import { AuthUser, UserProfile, AppointmentItem, PrescriptionItem } from '../types';

interface PatientDashboardProps {
  currentUser: AuthUser;
  userProfile: UserProfile;
  onNavigate: (page: string) => void;
  onOpenNewAppointmentModal: () => void;
  onStartConsultation: () => void;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({
  currentUser,
  userProfile,
  onNavigate,
  onOpenNewAppointmentModal,
  onStartConsultation,
}) => {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPatientData();
  }, []);

  const fetchPatientData = async () => {
    setIsLoading(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('medtrack_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const [apptsRes, rxRes] = await Promise.all([
        fetch('/api/appointments', { headers }),
        fetch('/api/prescriptions', { headers }),
      ]);

      if (apptsRes.ok) {
        const aData = await apptsRes.json();
        setAppointments(aData.appointments || []);
      }

      if (rxRes.ok) {
        const rData = await rxRes.json();
        setPrescriptions(rData.prescriptions || []);
      }
    } catch (err) {
      console.error('Failed to load patient data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate BMI and health metrics safely with fallback to metrics/healthHistory
  const userHeight = userProfile.heightCm ?? userProfile.metrics?.heightCm ?? 175;
  const userWeight = userProfile.weightKg ?? userProfile.metrics?.weightKg ?? 70;
  const heightM = userHeight / 100;
  const bmi = Math.round((userWeight / (heightM * heightM)) * 10) / 10;
  const waterTargetMl = Math.round(userWeight * 35);
  const userBloodGroup = userProfile.bloodGroup || 'O+';
  const userAllergies = userProfile.allergies ?? userProfile.healthHistory?.allergies ?? [];

  return (
    <div id="patient-dashboard-view" className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-800 text-white p-6 sm:p-8 relative overflow-hidden shadow-lg border border-teal-500/30">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-teal-100 mb-3">
            <HeartPulse className="w-3.5 h-3.5 text-rose-300" />
            Personalized Clinical Health Profile
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome, {currentUser.name}
          </h1>
          <p className="mt-2 text-sm text-teal-100/90 leading-relaxed">
            Monitor your vital signs, track active medications prescribed by your physician, schedule clinical consultations, and run AI health triage.
          </p>

          <div className="flex flex-wrap gap-3 mt-5">
            <button
              id="patient-start-ai-triage-btn"
              onClick={onStartConsultation}
              className="px-4 py-2 bg-white text-teal-900 hover:bg-teal-50 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-teal-600" />
              Multimodal AI Triage
            </button>
            <button
              id="patient-book-consult-btn"
              onClick={onOpenNewAppointmentModal}
              className="px-4 py-2 bg-teal-800/60 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold backdrop-blur-md transition-all flex items-center gap-2 border border-white/20"
            >
              <Calendar className="w-4 h-4" />
              Book Clinical Consultation
            </button>
            <button
              onClick={() => onNavigate('maps')}
              className="px-4 py-2 bg-teal-800/40 hover:bg-teal-800/80 text-white rounded-xl text-xs font-semibold backdrop-blur-md transition-all flex items-center gap-2 border border-white/10"
            >
              <Compass className="w-4 h-4" />
              Find Pharmacies & Hospitals
            </button>
          </div>
        </div>

        <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 opacity-10 pointer-events-none">
          <HeartPulse className="w-80 h-80 text-white" />
        </div>
      </div>

      {/* Vitals Baseline Cards */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-teal-600" />
          Health Baseline & Biometrics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Body Mass Index (BMI)</span>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">{bmi}</h3>
              <span className="text-xs text-teal-600 dark:text-teal-400 font-semibold">
                {bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : 'Overweight'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Height: {userHeight}cm • Weight: {userWeight}kg
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Blood Group</span>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
                {userBloodGroup}
              </h3>
              <span className="text-xs text-slate-400">Recorded</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Universal Emergency Tag</p>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Daily Hydration Target</span>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-extrabold text-teal-600 dark:text-teal-400">
                {(waterTargetMl / 1000).toFixed(1)} L
              </h3>
              <span className="text-xs text-slate-400">per day</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Calculated from body metrics</p>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Allergies Status</span>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {userAllergies.length > 0
                  ? `${userAllergies.length} Flagged`
                  : 'None Recorded'}
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 truncate">
              {userAllergies.length > 0
                ? userAllergies.join(', ')
                : 'No adverse drug reactions'}
            </p>
          </div>
        </div>
      </div>

      {/* Two Column Section: Active Prescriptions & Upcoming Consultations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Prescriptions Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Pill className="w-5 h-5 text-emerald-600" />
                  Prescriptions & Medication Schedule
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Doctor-prescribed active medications
                </p>
              </div>
            </div>

            {prescriptions.length === 0 ? (
              <div className="text-center py-10 px-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl my-2">
                <Pill className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  No Active Prescriptions
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                  When your doctor issues a clinical prescription, it will appear here with frequency and dosage guidelines.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {prescriptions.map((rx) => (
                  <div
                    key={rx.id}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {rx.medicationName} — {rx.dosage}
                      </h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        {rx.frequency} • {rx.duration}
                      </p>
                      {rx.instructions && (
                        <p className="text-[11px] text-teal-700 dark:text-teal-400 italic mt-1">
                          "{rx.instructions}"
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 capitalize">
                      {rx.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
            <button
              onClick={() => onNavigate('maps')}
              className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Locate Nearby Pharmacies for Refills</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scheduled Consultations Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-600" />
                  Upcoming Consultations
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Doctor visits and follow-up reviews
                </p>
              </div>

              <button
                onClick={onOpenNewAppointmentModal}
                className="px-3 py-1.5 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Book
              </button>
            </div>

            {appointments.length === 0 ? (
              <div className="text-center py-10 px-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl my-2">
                <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  No Consultations Scheduled
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                  Need clinical evaluation or lab review? Book an appointment with a verified healthcare professional.
                </p>
                <button
                  onClick={onOpenNewAppointmentModal}
                  className="mt-3 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                >
                  <Calendar className="w-3.5 h-3.5" /> Book Consultation
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.slice(0, 3).map((appt) => (
                  <div
                    key={appt.id}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {appt.doctorName}
                        </span>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            appt.status === 'confirmed'
                              ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          {appt.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {appt.appointmentDate} at {appt.appointmentTime}
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                        Reason: {appt.reason}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
            <button
              onClick={() => onNavigate('appointments')}
              className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <span>View All Appointments</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
