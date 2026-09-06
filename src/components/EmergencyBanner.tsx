import React from 'react';
import { ShieldAlert, PhoneCall, HeartPulse, X, ExternalLink, Info } from 'lucide-react';

interface EmergencyBannerProps {
  onClose?: () => void;
  isOpen?: boolean;
}

export const EmergencyBanner: React.FC<EmergencyBannerProps> = ({ onClose, isOpen = true }) => {
  if (!isOpen) return null;

  return (
    <div
      id="critical-emergency-banner"
      className="bg-rose-600 text-white shadow-xl border-b-4 border-rose-800 relative z-30"
      role="alert"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-rose-700/80 rounded-xl ring-2 ring-white/30 shrink-0 animate-pulse">
              <ShieldAlert className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider bg-white text-rose-700 rounded-md">
                  Level 4 Emergency Alert
                </span>
                <span className="text-xs font-semibold text-rose-100 flex items-center gap-1">
                  <HeartPulse className="w-3.5 h-3.5" /> Immediate Life-Safety Protocol
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight mt-1 text-white">
                Severe Red-Flag Symptoms Detected — Call Emergency Services Now
              </h2>
              <p className="text-xs sm:text-sm text-rose-100 mt-1 max-w-3xl leading-relaxed">
                If you or someone nearby is experiencing crushing chest pain, sudden numbness/paralysis, difficulty breathing, or severe uncontrolled bleeding, do <strong>NOT</strong> delay or drive yourself.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
            <a
              id="emergency-call-911"
              href="tel:911"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-rose-700 hover:bg-rose-50 font-bold text-sm rounded-lg shadow-sm transition-colors"
            >
              <PhoneCall className="w-4 h-4" />
              Call 911 (US/CA)
            </a>
            <a
              id="emergency-call-112"
              href="tel:112"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-800 hover:bg-rose-900 text-white font-bold text-sm rounded-lg shadow-sm transition-colors border border-rose-500"
            >
              <PhoneCall className="w-4 h-4" />
              Call 112 (EU/UK)
            </a>
            <a
              id="emergency-call-108"
              href="tel:108"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-800 hover:bg-rose-900 text-white font-bold text-sm rounded-lg shadow-sm transition-colors border border-rose-500"
            >
              <PhoneCall className="w-4 h-4" />
              Call 108 / 102 (IN)
            </a>
            {onClose && (
              <button
                id="close-emergency-banner-btn"
                onClick={onClose}
                className="p-2 text-rose-200 hover:text-white hover:bg-rose-700/60 rounded-lg transition-colors ml-1"
                aria-label="Dismiss banner"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Immediate Safe Actions Checklist */}
        <div className="mt-3.5 pt-3 border-t border-rose-500/60 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-rose-100">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0"></span>
            <span><strong>Do NOT drive:</strong> Have paramedics or an emergency driver transport you.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0"></span>
            <span><strong>Rest in position:</strong> Sit upright or slightly reclined to ease breathing.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0"></span>
            <span><strong>Unlock entry door:</strong> Enable rapid access for incoming paramedics.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
