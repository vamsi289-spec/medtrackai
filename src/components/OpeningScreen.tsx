import React from 'react';
import { ArrowRight, Stethoscope, Sparkles } from 'lucide-react';
import { MedtrackLogo } from './MedtrackLogo';
import { GoogleLogo } from './GoogleAuthModal';
import { UserProfile } from '../types';

interface OpeningScreenProps {
  onStartConsultation: () => void;
  onOpenMaps?: () => void;
  onOpenDashboard?: () => void;
  onOpenProfile?: () => void;
  onOpenReminders?: () => void;
  onOpenGoogleLogin?: () => void;
  userProfile?: UserProfile;
}

export const OpeningScreen: React.FC<OpeningScreenProps> = ({
  onStartConsultation,
  onOpenDashboard,
  onOpenGoogleLogin,
}) => {
  const handleStartApp = () => {
    if (onStartConsultation) {
      onStartConsultation();
    } else if (onOpenDashboard) {
      onOpenDashboard();
    }
  };

  return (
    <div
      id="medtrack-opening-screen"
      className="fixed inset-0 z-50 flex flex-col justify-between items-center text-white px-5 py-6 sm:py-10 select-none overflow-y-auto"
      style={{
        background:
          'radial-gradient(ellipse 100% 80% at 50% 30%, #0c2633 0%, #071720 50%, #030b10 100%)',
      }}
    >
      {/* Top Header Bar matching user's image */}
      <div className="w-full max-w-md flex items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0b2933] border border-teal-500/40 flex items-center justify-center p-1.5 shrink-0 shadow-md">
            <MedtrackLogo size={28} animated={false} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-extrabold text-white tracking-tight">MedTrack</span>
              <span className="text-xl font-extrabold text-[#00d2aa] tracking-tight">AI</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium tracking-wide">
              Track &bull; Aware &bull; Stay Healthy
            </p>
          </div>
        </div>

        {/* MedTrack AI Engine Pill */}
        <div className="px-3 py-1 rounded-full bg-[#072a33]/80 border border-teal-500/40 text-teal-300 text-[10px] font-bold tracking-wider uppercase shrink-0 shadow-xs">
          MEDTRACK AI ENGINE
        </div>
      </div>

      {/* Main Centered Content Card matching user's screenshot */}
      <div className="flex flex-col items-center text-center max-w-md w-full my-auto py-6 animate-in fade-in duration-300">
        {/* Pill: MedTrack AI Clinical System */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#082830] border border-teal-500/50 text-teal-300 text-xs sm:text-[13px] font-medium tracking-wide shadow-sm mb-6">
          <Sparkles className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span>MedTrack AI System</span>
        </div>

        {/* Big Rounded Square Container with Glowing MedTrack Logo */}
        <div className="relative mb-8">
          {/* Ambient Glow */}
          <div className="absolute -inset-4 bg-teal-500/15 rounded-[44px] blur-2xl opacity-90" />

          <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-[40px] bg-[#0c222c] border border-teal-700/50 shadow-2xl flex items-center justify-center p-8 backdrop-blur-md">
            {/* Subtle inner grid pattern */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#14b8a6_1px,transparent_1px)] [background-size:16px_16px] rounded-[40px]" />
            <MedtrackLogo size={140} animated className="relative z-10 drop-shadow-lg" />
          </div>
        </div>

        {/* Main Heading: Your Personal AI Public Health Assistant */}
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-3 max-w-sm leading-tight font-display">
          Your Personal AI Public Health Assistant
        </h1>

        {/* Paragraph text */}
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-sm font-normal px-2">
          MedTrack AI combines multimodal visual diagnostics, biomarker laboratory OCR, and customized health reminder alarms to help you stay ahead of health risks.
        </p>
      </div>

      {/* Bottom Call to Action Button: Start Health Consultation matching user screenshot */}
      <div className="w-full max-w-md pb-4 sm:pb-6 flex flex-col items-center gap-3">
        <button
          type="button"
          id="start-app-btn"
          onClick={handleStartApp}
          className="w-full py-4 px-6 rounded-2xl bg-[#00a86b] hover:bg-[#00be7a] active:scale-98 text-white font-bold text-base sm:text-lg shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2.5 transition-all cursor-pointer border border-emerald-400/30 group"
        >
          <Stethoscope className="w-5 h-5 text-white shrink-0 group-hover:rotate-12 transition-transform" />
          <span>Start Health Consultation</span>
          <ArrowRight className="w-5 h-5 text-white shrink-0 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Direct Google Login Button */}
        {onOpenGoogleLogin && (
          <button
            type="button"
            id="opening-screen-google-btn"
            onClick={onOpenGoogleLogin}
            className="w-full py-3.5 px-6 rounded-2xl bg-white/95 hover:bg-white text-slate-800 hover:text-slate-950 font-semibold text-sm shadow-md flex items-center justify-center gap-3 transition-all cursor-pointer border border-white/20 active:scale-98"
          >
            <GoogleLogo size={20} />
            <span>Sign in with Google Account</span>
          </button>
        )}
      </div>
    </div>
  );
};
