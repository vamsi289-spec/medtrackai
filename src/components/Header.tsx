import React from 'react';
import { UserProfile, AuthUser, NotificationSettings, UserRole } from '../types';
import { MedtrackLogo } from './MedtrackLogo';
import { GoogleLogo } from './GoogleAuthModal';
import { FeaturesHubDropdown } from './FeaturesHubDropdown';
import {
  PanelLeft,
  Plus,
  Search,
  LayoutDashboard,
  Users,
  Calendar,
  Building2,
  Sparkles,
  Bell,
  Stethoscope,
  User,
  ShieldCheck,
} from 'lucide-react';

interface HeaderProps {
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
  onOpenGoogleLogin?: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onNewSession?: () => void;
  // Navigation props
  activePage?: string;
  onNavigate?: (page: string) => void;
  onOpenNotificationsCenter?: () => void;
  unreadNotificationsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
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
  onOpenGoogleLogin,
  isSidebarOpen = true,
  onToggleSidebar,
  onNewSession,
  activePage = 'dashboard',
  onNavigate,
  onOpenNotificationsCenter,
  unreadNotificationsCount = 0,
}) => {
  const role: UserRole = currentUser?.role || 'patient';

  return (
    <header
      id="medtrack-main-header"
      className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-teal-100 dark:border-slate-800 sticky top-0 z-20 shadow-xs transition-colors duration-200"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Sidebar Toggle & MedTrack AI Brand */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
            {onToggleSidebar && activePage === 'consultation' && (
              <button
                id="header-toggle-sidebar-btn"
                type="button"
                onClick={onToggleSidebar}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  isSidebarOpen
                    ? 'bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-teal-50 dark:hover:bg-slate-700'
                }`}
                title={isSidebarOpen ? 'Hide Consultation History' : 'Open Consultation History'}
                aria-label="Toggle history"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}

            <button
              id="header-brand-logo-btn"
              type="button"
              onClick={() => onNavigate && onNavigate('dashboard')}
              className="group flex items-center gap-2.5 text-left rounded-2xl p-1 -m-1 hover:bg-teal-50/70 dark:hover:bg-slate-800/70 transition-colors cursor-pointer min-w-0"
              title="MedTrack AI Clinical Healthcare Platform"
            >
              <MedtrackLogo size={32} animated={true} />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white font-outfit group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                    MedTrack <span className="text-teal-600 dark:text-teal-400">AI</span>
                  </span>
                  <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 capitalize hidden sm:inline-block">
                    {role} Workspace
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium -mt-0.5 truncate hidden md:block">
                  Track &bull; Aware &bull; Stay Healthy
                </span>
              </div>
            </button>
          </div>

          {/* Center: Main Navigation Tabs (Desktop & Tablet) */}
          {onNavigate && (
            <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
              <button
                onClick={() => onNavigate('dashboard')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                  activePage === 'dashboard'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>

              {role === 'doctor' ? (
                <button
                  onClick={() => onNavigate('patients')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                    activePage === 'patients'
                      ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Patients</span>
                </button>
              ) : null}

              <button
                onClick={() => onNavigate('appointments')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                  activePage === 'appointments'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Appointments</span>
              </button>

              <button
                onClick={() => onNavigate('consultation')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                  activePage === 'consultation'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>AI Triage</span>
              </button>

              <button
                onClick={() => onNavigate('maps')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                  activePage === 'maps'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Maps & Facilities</span>
              </button>
            </nav>
          )}

          {/* Right: Notification Center + User Auth & Features Hub */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Notification Center Button */}
            {onOpenNotificationsCenter && (
              <button
                onClick={onOpenNotificationsCenter}
                className="relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                title="Notifications Center"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900" />
                )}
              </button>
            )}

            {/* App Overview & Feature Showcase Trigger */}
            <button
              onClick={onOpenOpeningScreen}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-200/80 dark:border-teal-800/80 bg-teal-50/70 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-xs font-semibold transition-colors cursor-pointer"
              title="View MedTrack AI App Showcase & Tour"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>App Overview</span>
            </button>

            {/* Quick Google Sign In Trigger when not logged in */}
            {!currentUser && onOpenGoogleLogin && (
              <button
                id="header-google-login-btn"
                onClick={onOpenGoogleLogin}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                title="Sign in with your Google Account"
              >
                <GoogleLogo size={15} />
                <span className="hidden sm:inline">Google</span>
              </button>
            )}

            {/* User Account / Auth Trigger */}
            <button
              id="header-user-role-badge"
              onClick={onOpenAuthModal}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                currentUser
                  ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800/80 text-teal-800 dark:text-teal-300'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-teal-50'
              }`}
            >
              {role === 'doctor' ? (
                <Stethoscope className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              ) : (
                <User className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              )}
              <span className="max-w-[120px] truncate">
                {currentUser ? currentUser.name : 'Sign In / Register'}
              </span>
            </button>

            {/* Single Unified Features Hub */}
            <FeaturesHubDropdown
              currentProfile={currentProfile}
              currentUser={currentUser}
              notificationSettings={notificationSettings}
              darkMode={darkMode}
              onToggleDarkMode={onToggleDarkMode}
              onOpenAuthModal={onOpenAuthModal}
              onOpenProfileModal={onOpenProfileModal}
              onOpenReminderSettings={onOpenReminderSettings}
              onTriggerEmergencyBanner={onTriggerEmergencyBanner}
              onOpenClinicalBrief={onOpenClinicalBrief}
              onResetConsultation={onResetConsultation}
              onOpenSampleScenarios={onOpenSampleScenarios}
              onOpenTesterHub={onOpenTesterHub}
              onOpenOpeningScreen={onOpenOpeningScreen}
              onOpenPharmacyLocator={onOpenPharmacyLocator}
            />
          </div>
        </div>

        {/* Mobile Navigation Bar (Visible on mobile screens) */}
        {onNavigate && (
          <div className="flex md:hidden items-center justify-around pt-2 border-t border-slate-100 dark:border-slate-800 mt-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            <button
              onClick={() => onNavigate('dashboard')}
              className={`py-1 px-2 rounded-lg flex items-center gap-1 ${
                activePage === 'dashboard' ? 'text-teal-600 dark:text-teal-400 font-bold' : ''
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Dashboard
            </button>

            {role === 'doctor' && (
              <button
                onClick={() => onNavigate('patients')}
                className={`py-1 px-2 rounded-lg flex items-center gap-1 ${
                  activePage === 'patients' ? 'text-teal-600 dark:text-teal-400 font-bold' : ''
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Patients
              </button>
            )}

            <button
              onClick={() => onNavigate('appointments')}
              className={`py-1 px-2 rounded-lg flex items-center gap-1 ${
                activePage === 'appointments' ? 'text-teal-600 dark:text-teal-400 font-bold' : ''
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Appts
            </button>

            <button
              onClick={() => onNavigate('consultation')}
              className={`py-1 px-2 rounded-lg flex items-center gap-1 ${
                activePage === 'consultation' ? 'text-teal-600 dark:text-teal-400 font-bold' : ''
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              AI
            </button>

            <button
              onClick={() => onNavigate('maps')}
              className={`py-1 px-2 rounded-lg flex items-center gap-1 ${
                activePage === 'maps' ? 'text-teal-600 dark:text-teal-400 font-bold' : ''
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Maps
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
