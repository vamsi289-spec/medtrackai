import React from 'react';
import { ConsultationMessage, UserProfile } from '../types';
import { ClinicalHealthTrendChart } from './ClinicalHealthTrendChart';
import { FileBadge, Printer, X, Download, Stethoscope, User, Calendar, ShieldCheck, TrendingUp } from 'lucide-react';

interface ClinicalBriefModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: UserProfile;
  messages: ConsultationMessage[];
}

export const ClinicalBriefModal: React.FC<ClinicalBriefModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  messages,
}) => {
  if (!isOpen) return null;

  const latestAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant');
  const userInquiries = messages.filter((m) => m.role === 'user');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      id="clinical-brief-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="clinical-brief-container"
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-teal-100/90 dark:border-slate-800 w-full max-w-4xl my-8 overflow-hidden max-h-[92vh] flex flex-col print:m-0 print:max-w-none print:shadow-none print:border-none print:rounded-none transition-colors"
      >
        {/* Header - hide print buttons during print */}
        <div className="bg-slate-900 dark:bg-slate-950 text-white p-5 flex items-center justify-between border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500/20 text-teal-300 rounded-xl">
              <FileBadge className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight font-display">Physician Consultation Brief</h2>
              <p className="text-xs text-slate-300">
                Print or export this clinical summary and longitudinal health trends to share with your doctor during your visit.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="print-brief-btn"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-linear-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Brief</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-sans print:p-0 print:text-black">
          {/* Clinical Header */}
          <div className="border-b-2 border-teal-800/80 dark:border-teal-500/50 pb-4 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-slate-100 tracking-tight font-display">
                  MedTrack AI <span className="text-sm font-semibold text-teal-600 dark:text-teal-400 font-sans">&bull; Clinical Portal</span>
                </span>
                <span className="text-xs font-bold text-teal-900 dark:text-teal-300 bg-teal-100/80 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 px-2.5 py-0.5 rounded-full">
                  Clinical Intake Brief
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                AI Public Health &amp; Pre-Consultation Triage Log
              </p>
            </div>
            <div className="text-right text-xs text-slate-500 dark:text-slate-400">
              <div><strong>Date:</strong> {new Date().toLocaleDateString()}</div>
              <div><strong>Session ID:</strong> #{currentProfile.id.toUpperCase().substring(0, 10)}</div>
            </div>
          </div>

          {/* Section 1: Patient Baseline Demographics & Metrics */}
          <div>
            <h3 className="text-xs font-bold text-teal-950 dark:text-teal-300 uppercase tracking-wider mb-2 border-b border-teal-100 dark:border-slate-800 pb-1">
              1. Patient Demographics &amp; Vitals Baseline
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-teal-50/40 dark:bg-slate-800/60 rounded-2xl border border-teal-100/90 dark:border-slate-700/80">
              <div className="flex items-center gap-2.5 sm:col-span-2">
                {currentProfile.avatarUrl ? (
                  <img
                    src={currentProfile.avatarUrl}
                    alt={currentProfile.name}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-linear-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {currentProfile.name ? currentProfile.name.charAt(0).toUpperCase() : 'P'}
                  </div>
                )}
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Patient Name &amp; ID</span>
                  <strong className="text-slate-900 dark:text-slate-100 block font-display">{currentProfile.name}</strong>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">ID: {currentProfile.id}</span>
                </div>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Age / Gender</span>
                <strong className="text-slate-900 dark:text-slate-100">{currentProfile.demographics.age} yrs / {currentProfile.demographics.gender}</strong>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Height &amp; Weight</span>
                <strong className="text-slate-900 dark:text-slate-100">{currentProfile.metrics.heightCm} cm / {currentProfile.metrics.weightKg} kg</strong>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">BMI / Status</span>
                <strong className="text-slate-900 dark:text-slate-100">{currentProfile.metrics.bmi} ({currentProfile.metrics.bmiCategory})</strong>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Profession / Work Ergonomics</span>
                <span className="text-slate-800 dark:text-slate-200">{currentProfile.demographics.profession}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Sleep / Diet</span>
                <span className="text-slate-800 dark:text-slate-200">{currentProfile.lifestyle.dailySleepDurationHours}h sleep • {currentProfile.lifestyle.junkFoodIntake}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Exercise Baseline</span>
                <span className="text-slate-800 dark:text-slate-200">{currentProfile.lifestyle.exerciseFrequency}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Longitudinal Biometric Health Trajectory (D3 Chart) */}
          <div>
            <h3 className="text-xs font-bold text-teal-950 dark:text-teal-300 uppercase tracking-wider mb-2 border-b border-teal-100 dark:border-slate-800 pb-1 flex items-center justify-between">
              <span>2. Longitudinal Health Metrics &amp; Vital Trends</span>
              <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">Based on Consultation History</span>
            </h3>
            <ClinicalHealthTrendChart
              messages={messages}
              currentProfile={currentProfile}
            />
          </div>

          {/* Section 3: Medical History & Allergies */}
          <div>
            <h3 className="text-xs font-bold text-teal-950 dark:text-teal-300 uppercase tracking-wider mb-2 border-b border-teal-100 dark:border-slate-800 pb-1">
              3. Medical History, Allergies &amp; Active Medications
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-teal-50/40 dark:bg-slate-800/60 rounded-xl border border-teal-100 dark:border-slate-700/80">
                <span className="font-bold text-teal-950 dark:text-teal-300 block mb-1">Diagnosed Conditions:</span>
                <ul className="list-disc list-inside text-xs text-slate-700 dark:text-slate-300 space-y-0.5">
                  {currentProfile.healthHistory.knownConditions.length > 0 ? (
                    currentProfile.healthHistory.knownConditions.map((c, i) => <li key={i}>{c}</li>)
                  ) : (
                    <li>None reported</li>
                  )}
                </ul>
              </div>

              <div className="p-3 bg-rose-50/60 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/60">
                <span className="font-bold text-rose-900 dark:text-rose-300 block mb-1">Allergies:</span>
                <ul className="list-disc list-inside text-xs text-rose-800 dark:text-rose-200 space-y-0.5 font-medium">
                  {currentProfile.healthHistory.allergies.length > 0 ? (
                    currentProfile.healthHistory.allergies.map((a, i) => <li key={i}>{a}</li>)
                  ) : (
                    <li>No known allergies</li>
                  )}
                </ul>
              </div>

              <div className="p-3 bg-sky-50/60 dark:bg-sky-950/40 rounded-xl border border-sky-200 dark:border-sky-900/60">
                <span className="font-bold text-sky-950 dark:text-sky-300 block mb-1">Current Medications:</span>
                <ul className="list-disc list-inside text-xs text-sky-900 dark:text-sky-200 space-y-0.5">
                  {currentProfile.healthHistory.currentMedications.length > 0 ? (
                    currentProfile.healthHistory.currentMedications.map((m, i) => <li key={i}>{m}</li>)
                  ) : (
                    <li>None reported</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Section 4: Reported Chief Complaints */}
          <div>
            <h3 className="text-xs font-bold text-teal-950 dark:text-teal-300 uppercase tracking-wider mb-2 border-b border-teal-100 dark:border-slate-800 pb-1">
              4. Chief Symptoms &amp; Reported Complaints
            </h3>
            <div className="space-y-2">
              {userInquiries.length > 0 ? (
                userInquiries.map((inq, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                    <span className="font-bold text-slate-900 dark:text-slate-100 block mb-0.5">Entry #{idx + 1} ({inq.timestamp}):</span>
                    {inq.content}
                  </div>
                ))
              ) : (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 italic">
                  No direct patient inquiries recorded in this session.
                </div>
              )}
            </div>
          </div>

          {/* Section 5: AI Triage & Recommended Specialist Pathway */}
          {latestAssistantMessage && (
            <div>
              <h3 className="text-xs font-bold text-teal-950 dark:text-teal-300 uppercase tracking-wider mb-2 border-b border-teal-100 dark:border-slate-800 pb-1">
                5. AI Triage Assessment &amp; Clinical Follow-Up
              </h3>
              <div className="p-4 bg-teal-50/70 dark:bg-teal-950/40 rounded-2xl border border-teal-200 dark:border-teal-900/60 text-xs text-slate-800 dark:text-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-teal-950 dark:text-teal-200 font-display">
                    Triage Urgency: {latestAssistantMessage.triageLevel || 'Routine Consultation'}
                  </span>
                </div>
                <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {latestAssistantMessage.content.substring(0, 500)}...
                </div>
              </div>
            </div>
          )}

          {/* Mandatory Clinical Disclaimer Footer */}
          <div className="pt-4 border-t border-teal-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
            <strong>Disclaimer:</strong> MedTrack AI provides informational health insights and preliminary triage. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a licensed physician for medical concerns.
          </div>
        </div>
      </div>
    </div>
  );
};

