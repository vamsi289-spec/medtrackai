import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellOff,
  BellRing,
  Clock,
  Volume2,
  VolumeX,
  Play,
  Square,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Settings,
  Pill,
  Droplets,
  Scale,
  FileText,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import {
  NotificationSettings,
  NotificationReminderType,
  RingtoneSound,
  UserProfile,
} from '../types';
import {
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  isBrowserNotificationSupported,
  playNotificationRingtone,
  stopActiveRingtone,
  ALL_RINGTONES,
} from '../utils/notifications';

interface NotificationBarProps {
  settings: NotificationSettings;
  onUpdateSettings: (newSettings: NotificationSettings) => void;
  onTriggerTestNotification: (customSettings?: NotificationSettings) => void;
  onOpenReminderSettings: () => void;
  onOpenProfileModal: () => void;
  currentProfile: UserProfile;
}

export const NotificationBar: React.FC<NotificationBarProps> = ({
  settings,
  onUpdateSettings,
  onTriggerTestNotification,
  onOpenReminderSettings,
  onOpenProfileModal,
  currentProfile,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    const saved = localStorage.getItem('medtrack_notification_bar_expanded') || localStorage.getItem('pulsehealth_notification_bar_expanded');
    return saved !== null ? saved === 'true' : true;
  });

  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(() =>
    getBrowserNotificationPermission()
  );
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [testSentFeedback, setTestSentFeedback] = useState(false);
  const [nextTriggerCountdown, setNextTriggerCountdown] = useState<string>('');

  // Sync expanded state to local storage
  const handleToggleExpand = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      localStorage.setItem('medtrack_notification_bar_expanded', String(next));
      return next;
    });
  };

  // Monitor browser permission in real-time
  useEffect(() => {
    const updatePerm = () => {
      setPermissionStatus(getBrowserNotificationPermission());
    };
    window.addEventListener('focus', updatePerm);
    document.addEventListener('visibilitychange', updatePerm);
    const interval = setInterval(updatePerm, 3000);
    return () => {
      window.removeEventListener('focus', updatePerm);
      document.removeEventListener('visibilitychange', updatePerm);
      clearInterval(interval);
    };
  }, []);

  // Compute next reminder time display
  useEffect(() => {
    const calculateNextTime = () => {
      if (!settings.enabled) {
        setNextTriggerCountdown('Reminders currently paused');
        return;
      }

      const now = new Date();
      const [schedHours, schedMinutes] = (settings.time || '09:00').split(':').map(Number);
      const targetToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), schedHours, schedMinutes, 0);

      let diffMs = targetToday.getTime() - now.getTime();
      let isTomorrow = false;

      if (diffMs <= 0) {
        // Next trigger is tomorrow
        const targetTomorrow = new Date(targetToday.getTime() + 24 * 60 * 60 * 1000);
        diffMs = targetTomorrow.getTime() - now.getTime();
        isTomorrow = true;
      }

      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      const time12h = new Date(2000, 0, 1, schedHours, schedMinutes).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      if (diffHours === 0 && diffMins <= 1) {
        setNextTriggerCountdown(`Firing shortly at ${time12h}`);
      } else if (diffHours === 0) {
        setNextTriggerCountdown(`Next alert in ${diffMins} min (${time12h})`);
      } else {
        setNextTriggerCountdown(`Next alert in ${diffHours}h ${diffMins}m (${time12h}${isTomorrow ? ' tomorrow' : ''})`);
      }
    };

    calculateNextTime();
    const interval = setInterval(calculateNextTime, 30000);
    return () => clearInterval(interval);
  }, [settings.enabled, settings.time]);

  const handleRequestPermission = async () => {
    const perm = await requestBrowserNotificationPermission();
    setPermissionStatus(perm);
    if (perm === 'granted') {
      onUpdateSettings({ ...settings, enabled: true });
    }
  };

  const handleToggleEnabled = (enabled: boolean) => {
    onUpdateSettings({
      ...settings,
      enabled,
    });
    if (enabled && permissionStatus === 'default') {
      handleRequestPermission();
    }
  };

  const handleSelectTime = (timeStr: string) => {
    onUpdateSettings({
      ...settings,
      time: timeStr,
      enabled: true,
    });
  };

  const handleSelectType = (type: NotificationReminderType) => {
    onUpdateSettings({
      ...settings,
      reminderType: type,
      enabled: true,
    });
  };

  const handleSelectSound = (sound: RingtoneSound) => {
    onUpdateSettings({
      ...settings,
      ringtoneSound: sound,
      soundEnabled: true,
    });
    // Brief preview of selected sound
    playNotificationRingtone(sound, 2, settings.ringtoneVolume ?? 0.85);
    setIsPlayingPreview(true);
    setTimeout(() => setIsPlayingPreview(false), 2000);
  };

  const handlePreviewSound = () => {
    if (isPlayingPreview) {
      stopActiveRingtone();
      setIsPlayingPreview(false);
    } else {
      setIsPlayingPreview(true);
      playNotificationRingtone(
        settings.ringtoneSound || 'harmonic_chime',
        settings.ringtoneDuration || 4,
        settings.ringtoneVolume ?? 0.85,
        settings.customAudioUrl
      );
      setTimeout(() => {
        setIsPlayingPreview(false);
      }, (settings.ringtoneDuration || 4) * 1000 + 400);
    }
  };

  const handleFireTest = () => {
    setTestSentFeedback(true);
    onTriggerTestNotification(settings);
    setTimeout(() => setTestSentFeedback(false), 3500);
  };

  const isBlocked = settings.enabled && permissionStatus === 'denied';

  return (
    <section
      id="medtrack-daily-notification-bar"
      aria-label="Daily health reminder controls and status bar"
      className="w-full bg-linear-to-r from-teal-50/95 via-emerald-50/90 to-sky-50/95 dark:from-slate-900 dark:via-teal-950/40 dark:to-slate-900 border-b border-teal-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-2xs transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5">
        {/* Compact Header Bar (Always Visible) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Status & Live Countdown */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs transition-colors ${
                isBlocked
                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                  : settings.enabled
                  ? 'bg-emerald-500 text-white shadow-emerald-500/20 animate-pulse'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}
            >
              {isBlocked ? (
                <BellOff className="w-4 h-4" />
              ) : settings.enabled ? (
                <BellRing className="w-4 h-4" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5 font-display">
                  <span>Daily Health Reminders</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      isBlocked
                        ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                        : settings.enabled
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full mr-1 ${
                        isBlocked ? 'bg-rose-500' : settings.enabled ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    ></span>
                    {isBlocked ? 'Browser Blocked' : settings.enabled ? 'Active & Scheduled' : 'Paused / Off'}
                  </span>
                </span>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
                <span className="font-medium">{nextTriggerCountdown}</span>
                <span className="hidden md:inline text-slate-400 dark:text-slate-600">•</span>
                <span className="hidden md:inline text-slate-500 dark:text-slate-400">
                  Target: {currentProfile.name || 'User'} ({settings.reminderType.replace('_', ' ')})
                </span>
              </p>
            </div>
          </div>

          {/* Quick Bar Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Quick Enable/Disable Switch */}
            <button
              id="notification-bar-toggle-btn"
              type="button"
              onClick={() => handleToggleEnabled(!settings.enabled)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                settings.enabled
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-teal-600 hover:bg-teal-700 text-white'
              }`}
            >
              {settings.enabled ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Reminders ON</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>Turn ON Daily Reminders</span>
                </>
              )}
            </button>

            {/* Test Reminder Trigger Button */}
            <button
              id="notification-bar-test-btn"
              type="button"
              onClick={handleFireTest}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                testSentFeedback
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-400 dark:border-emerald-700'
                  : 'bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 text-teal-800 dark:text-teal-200 border-teal-300 dark:border-slate-700 shadow-2xs'
              }`}
              title="Instantly triggers a test audio alarm, in-app toast, and browser notification"
            >
              <BellRing className={`w-3.5 h-3.5 ${testSentFeedback ? 'text-emerald-600 animate-bounce' : 'text-teal-600'}`} />
              <span>{testSentFeedback ? 'Alarm & Toast Sent!' : '🔔 Send Test Daily Reminder'}</span>
            </button>

            {/* Open Full Settings Modal */}
            <button
              id="notification-bar-settings-btn"
              type="button"
              onClick={onOpenReminderSettings}
              className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs cursor-pointer"
              title="Configure custom times, uploaded ringtones, and notification channels"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Expand / Minimize Drawer Toggle */}
            <button
              id="notification-bar-expand-toggle-btn"
              type="button"
              onClick={handleToggleExpand}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl border border-teal-200/60 dark:border-slate-700 text-xs font-medium transition-colors cursor-pointer"
              title={isExpanded ? 'Collapse reminder bar' : 'Expand reminder settings'}
            >
              <span className="hidden sm:inline">{isExpanded ? 'Less' : 'Configure'}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Expanded Quick Settings Deck */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-teal-200/60 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
            {/* 1. Schedule Time Presets */}
            <div className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-teal-100 dark:border-slate-700 flex flex-col justify-between">
              <div>
                <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  Scheduled Daily Time
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: '🌅 9:00 AM', time: '09:00' },
                    { label: '☀️ 2:00 PM', time: '14:00' },
                    { label: '🌙 8:00 PM', time: '20:00' },
                  ].map((preset) => (
                    <button
                      key={preset.time}
                      type="button"
                      onClick={() => handleSelectTime(preset.time)}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                        settings.time === preset.time && settings.enabled
                          ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                          : 'bg-slate-50 dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">Custom Time:</span>
                <input
                  type="time"
                  value={settings.time || '09:00'}
                  onChange={(e) => handleSelectTime(e.target.value)}
                  className="px-2 py-0.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold text-xs cursor-pointer"
                />
              </div>
            </div>

            {/* 2. Reminder Category */}
            <div className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-teal-100 dark:border-slate-700 flex flex-col justify-between">
              <div>
                <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-1.5">
                  <Pill className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  Reminder Focus
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'both', label: '🌿 All Checks', icon: Sparkles },
                    { id: 'medications', label: '💊 Meds Dose', icon: Pill },
                    { id: 'hydration', label: '💧 Water/Walk', icon: Droplets },
                    { id: 'metrics', label: '📊 Vitals Log', icon: Scale },
                  ].map((item) => {
                    const isSelected = settings.reminderType === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectType(item.id as NotificationReminderType)}
                        className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                            : 'bg-slate-50 dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenProfileModal}
                className="mt-2 text-[11px] text-teal-700 dark:text-teal-400 font-semibold hover:underline text-left cursor-pointer"
              >
                + Manage Prescriptions &amp; Allergies &rarr;
              </button>
            </div>

            {/* 3. Audio Alarm & Ringtone Selector */}
            <div className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-teal-100 dark:border-slate-700 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    Alarm Ringtone
                  </span>
                  <button
                    type="button"
                    onClick={handlePreviewSound}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-teal-100 dark:bg-teal-900/80 text-teal-800 dark:text-teal-200 rounded-md text-[10px] font-bold hover:bg-teal-200 transition-colors cursor-pointer"
                    title="Test audio sound preview"
                  >
                    {isPlayingPreview ? (
                      <>
                        <Square className="w-2.5 h-2.5 fill-current text-rose-500" />
                        <span>Stop</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>Play</span>
                      </>
                    )}
                  </button>
                </div>

                <select
                  value={settings.ringtoneSound || 'harmonic_chime'}
                  onChange={(e) => handleSelectSound(e.target.value as RingtoneSound)}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-semibold cursor-pointer"
                >
                  <optgroup label="Clinical & Alerts">
                    <option value="harmonic_chime">🩺 Crystal Chime (Signature)</option>
                    <option value="nurse_call_soft">🏥 Hospital Soft Chime</option>
                    <option value="clinical_pager">📟 Vital Telemetry Pager</option>
                  </optgroup>
                  <optgroup label="Classical & Symphonies">
                    <option value="beethoven_ode">🎼 Beethoven: Ode to Joy</option>
                    <option value="vivaldi_spring">🎻 Vivaldi: Spring Symphony</option>
                    <option value="mozart_allegro">👑 Mozart: Eine Kleine Nachtmusik</option>
                    <option value="canon_in_d">🏰 Pachelbel: Canon in D</option>
                  </optgroup>
                  <optgroup label="Zen & Relaxing">
                    <option value="zen_singing_bowl">🧘 Tibetan Singing Bowl (432Hz)</option>
                    <option value="gentle_bell">🔔 528Hz Miracle Bell</option>
                    <option value="lofi_chill">☕ Lo-Fi Dreamy Chill Hop</option>
                    <option value="ocean_breeze">🌊 Ocean Zen Flute</option>
                  </optgroup>
                </select>
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Sound: {settings.soundEnabled ? 'Enabled' : 'Muted'}</span>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, soundEnabled: !settings.soundEnabled })}
                  className="text-teal-700 dark:text-teal-400 font-bold hover:underline cursor-pointer"
                >
                  {settings.soundEnabled ? 'Mute' : 'Unmute'}
                </button>
              </div>
            </div>

            {/* 4. Browser Delivery & Permission */}
            <div className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-teal-100 dark:border-slate-700 flex flex-col justify-between">
              <div>
                <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  Browser Permission
                </span>

                <div className="space-y-1.5">
                  {permissionStatus === 'granted' ? (
                    <div className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-[11px] font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Browser Alerts Allowed</span>
                    </div>
                  ) : permissionStatus === 'denied' ? (
                    <div className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-[11px] font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>Blocked in Browser</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRequestPermission}
                      className="w-full py-1.5 px-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                    >
                      Allow Browser Notifications
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">In-App Toast:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Always Active</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
