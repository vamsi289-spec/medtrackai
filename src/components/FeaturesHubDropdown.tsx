import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, AuthUser, NotificationSettings } from '../types';
import {
  Sparkles,
  LayoutGrid,
  Bell,
  BellOff,
  MapPin,
  Users,
  FileBadge,
  ShieldAlert,
  User,
  Sliders,
  LogIn,
  LogOut,
  Facebook,
  Mail,
  Sun,
  Moon,
  RotateCcw,
  ChevronDown,
  X,
  HeartPulse,
  Activity,
  CheckCircle2,
  Stethoscope,
  ExternalLink,
} from 'lucide-react';
import { getBrowserNotificationPermission } from '../utils/notifications';

interface FeaturesHubDropdownProps {
  currentProfile: UserProfile;
  currentUser: AuthUser | null;
  notificationSettings: NotificationSettings;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenAuthModal: () => void;
  onOpenProfileModal: () => void;
  onOpenReminderSettings: () => void;
  onTriggerEmergencyBanner: () => void;
  onOpenClinicalBrief: () => void;
  onResetConsultation: () => void;
  onOpenSampleScenarios: () => void;
  onOpenTesterHub: () => void;
  onOpenOpeningScreen?: () => void;
  onOpenPharmacyLocator: () => void;
}

export const FeaturesHubDropdown: React.FC<FeaturesHubDropdownProps> = ({
  currentProfile,
  currentUser,
  notificationSettings,
  darkMode,
  onToggleDarkMode,
  onOpenAuthModal,
  onOpenProfileModal,
  onOpenReminderSettings,
  onTriggerEmergencyBanner,
  onOpenClinicalBrief,
  onResetConsultation,
  onOpenSampleScenarios,
  onOpenTesterHub,
  onOpenOpeningScreen,
  onOpenPharmacyLocator,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>(() =>
    getBrowserNotificationPermission()
  );
  const [isResetting, setIsResetting] = useState(false);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Sync notification permissions
  useEffect(() => {
    const handleSync = () => {
      setBrowserPermission(getBrowserNotificationPermission());
    };
    window.addEventListener('focus', handleSync);
    return () => window.removeEventListener('focus', handleSync);
  }, []);

  const isBlocked = notificationSettings.enabled && browserPermission === 'denied';

  const handleActionClick = (actionFn: () => void) => {
    actionFn();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* The Single Unified Features Button */}
      <button
        id="header-unified-features-btn"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs border cursor-pointer ${
          isOpen
            ? 'bg-teal-600 text-white border-teal-700 ring-2 ring-teal-500/30'
            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-teal-200/80 dark:border-slate-700 hover:bg-teal-50/70 dark:hover:bg-slate-700/80 hover:border-teal-400 dark:hover:border-teal-500'
        }`}
        title="Access all MedTrack AI Features, Clinical Tools, Patient Profile & Reminders"
        aria-expanded={isOpen}
      >
        <div className="relative flex items-center justify-center">
          <LayoutGrid className={`w-4 h-4 ${isOpen ? 'text-white' : 'text-teal-600 dark:text-teal-400'}`} />
          {notificationSettings.enabled && (
            <span
              className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                isBlocked ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
              }`}
            />
          )}
        </div>

        <span className="font-extrabold tracking-tight">Features &amp; Tools</span>

        {/* Mini status chips preview inside button */}
        <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
          isOpen
            ? 'bg-white/20 text-white'
            : 'bg-teal-100/70 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
        }`}>
          {currentProfile.name.split(' ')[0]}
        </span>

        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Unified Features Dropdown Popover */}
      {isOpen && (
        <div
          id="unified-features-popover"
          className="absolute right-0 mt-2 w-[340px] sm:w-[380px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Popover Header: Active Patient Context */}
          <div className="p-3.5 bg-linear-to-r from-teal-50/90 via-emerald-50/70 to-teal-50/90 dark:from-slate-800/90 dark:via-slate-850 dark:to-slate-800/90 border-b border-teal-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              {currentProfile.avatarUrl ? (
                <img
                  src={currentProfile.avatarUrl}
                  alt={currentProfile.name}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full object-cover border-2 border-emerald-500 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {currentProfile.name ? currentProfile.name.charAt(0) : 'U'}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                    {currentProfile.name}
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-emerald-200/80 dark:bg-emerald-900/90 text-emerald-900 dark:text-emerald-200 px-1.5 rounded">
                    BMI {currentProfile.metrics.bmi}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {currentProfile.demographics.age}y &bull; {currentProfile.demographics.profession} &bull; {currentProfile.lifestyle.exerciseFrequency.split(' ')[0]}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleActionClick(onOpenProfileModal)}
              className="px-2.5 py-1 text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-100/70 dark:bg-teal-900/60 hover:bg-teal-200 dark:hover:bg-teal-800 rounded-lg transition-colors shrink-0 cursor-pointer"
            >
              Edit Vitals
            </button>
          </div>

          {/* Scrollable Features Body */}
          <div className="max-h-[75vh] overflow-y-auto p-2.5 space-y-3">
            {/* Section 1: Clinical Triage & Care */}
            <div>
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Clinical Care &amp; Triage
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-1">
                {/* Print Doctor Clinical Brief */}
                <button
                  type="button"
                  id="dropdown-clinical-brief-btn"
                  onClick={() => handleActionClick(onOpenClinicalBrief)}
                  className="flex items-start gap-2 p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 hover:bg-teal-50 dark:hover:bg-teal-950/60 border border-slate-200/70 dark:border-slate-700/60 hover:border-teal-300 dark:hover:border-teal-700 transition-all text-left group cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg bg-teal-100/70 dark:bg-teal-900/80 text-teal-700 dark:text-teal-300 group-hover:scale-105 transition-transform shrink-0">
                    <FileBadge className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block group-hover:text-teal-700 dark:group-hover:text-teal-300">
                      Doctor Brief
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                      Print/PDF summary
                    </span>
                  </div>
                </button>

                {/* Emergency Red Flags Checklist */}
                <button
                  type="button"
                  id="dropdown-emergency-btn"
                  onClick={() => handleActionClick(onTriggerEmergencyBanner)}
                  className="flex items-start gap-2 p-2 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 hover:bg-rose-100/80 dark:hover:bg-rose-900/60 border border-rose-200/70 dark:border-rose-800/60 hover:border-rose-300 dark:hover:border-rose-700 transition-all text-left group cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg bg-rose-200/80 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200 group-hover:scale-105 transition-transform shrink-0">
                    <ShieldAlert className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-rose-900 dark:text-rose-200 block">
                      🚨 Red Flags
                    </span>
                    <span className="text-[10px] text-rose-700 dark:text-rose-300 block truncate">
                      Level 4 triage alert
                    </span>
                  </div>
                </button>

                {/* Nearby Pharmacies & GPS Locator */}
                <button
                  type="button"
                  id="dropdown-pharmacy-locator-btn"
                  onClick={() => handleActionClick(onOpenPharmacyLocator)}
                  className="flex items-start gap-2 p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-slate-200/70 dark:border-slate-700/60 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all text-left group cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg bg-emerald-100/70 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 group-hover:scale-105 transition-transform shrink-0">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                      Pharmacies
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                      GPS medicine finder
                    </span>
                  </div>
                </button>

                {/* Sample Scenarios Demo */}
                <button
                  type="button"
                  id="dropdown-samples-btn"
                  onClick={() => handleActionClick(onOpenSampleScenarios)}
                  className="flex items-start gap-2 p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200/70 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all text-left group cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg bg-indigo-100/70 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 group-hover:scale-105 transition-transform shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                      Scenarios
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                      1-click demo cases
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Section 2: Health Monitoring & Daily Alarms */}
            <div>
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Health Monitoring &amp; Testing
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-1">
                {/* Daily Reminder Settings */}
                <button
                  type="button"
                  id="dropdown-reminders-btn"
                  onClick={() => handleActionClick(onOpenReminderSettings)}
                  className="flex items-start gap-2 p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 hover:bg-teal-50 dark:hover:bg-teal-950/60 border border-slate-200/70 dark:border-slate-700/60 hover:border-teal-300 dark:hover:border-teal-700 transition-all text-left group cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg bg-amber-100/70 dark:bg-amber-900/80 text-amber-700 dark:text-amber-300 group-hover:scale-105 transition-transform shrink-0">
                    {isBlocked ? (
                      <BellOff className="w-3.5 h-3.5 text-rose-600" />
                    ) : (
                      <Bell className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block group-hover:text-teal-700 dark:group-hover:text-teal-300">
                      Daily Alarms
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                      {isBlocked
                        ? '⚠️ Blocked in browser'
                        : notificationSettings.enabled
                        ? `Active (${notificationSettings.time})`
                        : 'Audio ringtones'}
                    </span>
                  </div>
                </button>

                {/* Multi-User Tester Hub */}
                <button
                  type="button"
                  id="dropdown-tester-hub-btn"
                  onClick={() => handleActionClick(onOpenTesterHub)}
                  className="flex items-start gap-2 p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 hover:bg-purple-50 dark:hover:bg-purple-950/60 border border-slate-200/70 dark:border-slate-700/60 hover:border-purple-300 dark:hover:border-purple-700 transition-all text-left group cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg bg-purple-100/70 dark:bg-purple-900/80 text-purple-700 dark:text-purple-300 group-hover:scale-105 transition-transform shrink-0">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block group-hover:text-purple-700 dark:group-hover:text-purple-300">
                      Testing Hub
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                      QA personas &amp; audio
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Section 3: Account & Session Preferences */}
            <div>
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Account &amp; Appearance
              </div>
              <div className="space-y-1.5 mt-1">
                {/* Account / Sign In */}
                <button
                  type="button"
                  id="dropdown-auth-btn"
                  onClick={() => handleActionClick(onOpenAuthModal)}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200/70 dark:border-slate-700/60 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {currentUser?.provider === 'facebook' ? (
                      <div className="w-6 h-6 rounded-full bg-[#1877F2] flex items-center justify-center text-white">
                        <Facebook className="w-3.5 h-3.5 fill-white text-white" />
                      </div>
                    ) : currentUser ? (
                      <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center text-white">
                        <Mail className="w-3.5 h-3.5 text-white" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                        <LogIn className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {currentUser ? currentUser.name : 'Sign In / Register'}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {currentUser ? currentUser.email : 'Email or Facebook account'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                    {currentUser ? 'Manage' : 'Login'}
                  </span>
                </button>

                {/* Theme & Session Reset Controls */}
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {/* Theme Mode Toggle */}
                  <button
                    type="button"
                    id="dropdown-theme-toggle-btn"
                    onClick={onToggleDarkMode}
                    className="flex items-center justify-center gap-2 p-2 rounded-xl bg-slate-100/90 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs font-semibold cursor-pointer"
                  >
                    {darkMode ? (
                      <>
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        <span>Light Mode</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-3.5 h-3.5 text-slate-600" />
                        <span>Dark Mode</span>
                      </>
                    )}
                  </button>

                  {/* Start New Consultation */}
                  <button
                    type="button"
                    id="dropdown-reset-consultation-btn"
                    onClick={() => {
                      setIsResetting(true);
                      onResetConsultation();
                      setTimeout(() => {
                        setIsResetting(false);
                        setIsOpen(false);
                      }, 400);
                    }}
                    className="flex items-center justify-center gap-2 p-2 rounded-xl bg-slate-100/90 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs font-semibold cursor-pointer"
                    title="Start a new consultation while preserving all chat history in the sidebar"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'rotate-180 text-teal-500' : ''}`} />
                    <span>New Consultation</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer of Dropdown */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <button
              type="button"
              onClick={() => handleActionClick(onOpenOpeningScreen || (() => {}))}
              className="text-teal-600 dark:text-teal-400 hover:underline font-semibold"
            >
              MedTrack AI Overview
            </button>
            <span>v2.5 Full-Stack</span>
          </div>
        </div>
      )}
    </div>
  );
};
