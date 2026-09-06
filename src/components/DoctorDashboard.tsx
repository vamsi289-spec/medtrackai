import React, { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  Pill,
  FileText,
  UserPlus,
  PlusCircle,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowUpRight,
  Search,
  Activity,
  ChevronRight,
  Building2,
  Stethoscope,
} from 'lucide-react';
import { AuthUser, PatientRecord, AppointmentItem, PrescriptionItem } from '../types';

interface DoctorDashboardProps {
  currentUser: AuthUser;
  onNavigate: (page: string) => void;
  onSelectPatient?: (patient: PatientRecord) => void;
  onOpenNewPatientModal: () => void;
  onOpenNewAppointmentModal: () => void;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({
  currentUser,
  onNavigate,
  onSelectPatient,
  onOpenNewPatientModal,
  onOpenNewAppointmentModal,
}) => {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDoctorData();
  }, []);

  const fetchDoctorData = async () => {
    setIsLoading(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('medtrack_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const [patientsRes, apptsRes, rxRes] = await Promise.all([
        fetch('/api/patients', { headers }),
        fetch('/api/appointments', { headers }),
        fetch('/api/prescriptions', { headers }),
      ]);

      if (patientsRes.ok) {
        const pData = await patientsRes.json();
        setPatients(pData.patients || []);
      }
      if (apptsRes.ok) {
        const aData = await apptsRes.json();
        setAppointments(aData.appointments || []);
      }
      if (rxRes.ok) {
        const rData = await rxRes.json();
        setPrescriptions(rData.prescriptions || []);
      }
    } catch (err) {
      console.error('Failed to load doctor dashboard metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter((a) => a.appointmentDate === todayStr);

  return (
    <div id="doctor-dashboard-view" className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 text-white p-6 sm:p-8 relative overflow-hidden shadow-lg border border-teal-600/30">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-teal-200 mb-3">
            <Stethoscope className="w-3.5 h-3.5" />
            Clinical Practitioner Workspace
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome back, {currentUser.name}
          </h1>
          <p className="mt-2 text-sm text-teal-100/90 leading-relaxed">
            Monitor registered patients, upcoming consultations, medication regimens, and clinical triage alerts from your unified doctor command center.
          </p>

          <div className="flex flex-wrap gap-3 mt-5">
            <button
              id="doc-quick-add-patient-btn"
              onClick={onOpenNewPatientModal}
              className="px-4 py-2 bg-white text-teal-900 hover:bg-teal-50 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4 text-teal-700" />
              Register Patient
            </button>
            <button
              id="doc-quick-book-appt-btn"
              onClick={onOpenNewAppointmentModal}
              className="px-4 py-2 bg-teal-600/60 hover:bg-teal-600 text-white rounded-xl text-xs font-semibold backdrop-blur-md transition-all flex items-center gap-2 border border-white/20"
            >
              <Calendar className="w-4 h-4" />
              Schedule Consultation
            </button>
          </div>
        </div>

        <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 opacity-10 pointer-events-none">
          <Stethoscope className="w-80 h-80 text-white" />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Patients */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Patients</p>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              {isLoading ? '...' : patients.length}
            </h3>
            <button
              onClick={() => onNavigate('patients')}
              className="text-xs text-teal-600 dark:text-teal-400 font-medium hover:underline mt-2 flex items-center gap-1"
            >
              View registry <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Appointments Today</p>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              {isLoading ? '...' : todayAppointments.length}
            </h3>
            <button
              onClick={() => onNavigate('appointments')}
              className="text-xs text-teal-600 dark:text-teal-400 font-medium hover:underline mt-2 flex items-center gap-1"
            >
              Full schedule <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Active Prescriptions */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Prescriptions</p>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              {isLoading ? '...' : prescriptions.length}
            </h3>
            <button
              onClick={() => onNavigate('patients')}
              className="text-xs text-teal-600 dark:text-teal-400 font-medium hover:underline mt-2 flex items-center gap-1"
            >
              Rx records <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Pill className="w-6 h-6" />
          </div>
        </div>

        {/* Clinical Triage Alerts */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Triage Safety Status</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Guard</h3>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">Level 4 Red-Flag Protocol On</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Patients & Today's Consultations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Registry Summary (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Patient Registry</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Patients under your clinical supervision</p>
            </div>
            <button
              onClick={() => onNavigate('patients')}
              className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
            >
              View All ({patients.length}) <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Empty State if no patients */}
          {patients.length === 0 ? (
            <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Patients Registered Yet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Begin managing patient health history, vital signs, prescriptions, and clinical notes by registering your first patient.
              </p>
              <button
                id="doc-empty-add-patient-btn"
                onClick={onOpenNewPatientModal}
                className="mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Register First Patient
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {patients.slice(0, 5).map((patient) => (
                <div
                  key={patient.id}
                  onClick={() => {
                    if (onSelectPatient) onSelectPatient(patient);
                    onNavigate('patients');
                  }}
                  className="py-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 px-2 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center text-sm">
                      {patient.fullName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {patient.fullName}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {patient.age} yrs • {patient.gender} • Blood: {patient.bloodGroup || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[11px] px-2.5 py-1 rounded-full font-medium capitalize ${
                        patient.status === 'active'
                          ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                          : 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                      }`}
                    >
                      {patient.status.replace('_', ' ')}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's Schedule (1 col) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Today's Consultations</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">{todayStr}</p>
              </div>
              <button
                onClick={onOpenNewAppointmentModal}
                className="p-1.5 text-teal-600 hover:bg-teal-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Schedule Appointment"
              >
                <PlusCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Empty State for Consultations */}
            {todayAppointments.length === 0 ? (
              <div className="text-center py-10 px-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl my-2">
                <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">No Consultations Today</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  You have no patient visits scheduled for today.
                </p>
                <button
                  onClick={onOpenNewAppointmentModal}
                  className="mt-3 text-xs text-teal-600 dark:text-teal-400 font-semibold hover:underline"
                >
                  + Add appointment
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {todayAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-3"
                  >
                    <div className="text-center font-mono text-xs font-bold bg-white dark:bg-slate-900 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
                      {appt.appointmentTime}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {appt.patientName}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {appt.reason}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
            <button
              onClick={() => onNavigate('maps')}
              className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Building2 className="w-4 h-4 text-teal-600" />
              <span>Locate Nearby Hospitals & Pharmacies</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
