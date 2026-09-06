import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  X,
  Check,
  Clock,
  Volume2,
  VolumeX,
  Sparkles,
  Scale,
  FileBadge,
  ShieldCheck,
  Play,
  Square,
  Upload,
  Music,
  Sliders,
  Trash2,
  Search,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { NotificationSettings, RingtoneSound, UserProfile } from '../types';
import { safeLocalStorageGet, safeLocalStorageSet, safeLocalStorageRemove } from '../utils/safeStorage';
import {
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  isBrowserNotificationSupported,
  playNotificationRingtone,
  stopActiveRingtone,
  unlockBrowserAudioContext,
  isAudioAutoplayUnlocked,
  ALL_RINGTONES,
  RingtoneDefinition,
} from '../utils/notifications';
import { BrowserNotificationUnblockGuide } from './BrowserNotificationUnblockGuide';

interface ReminderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: NotificationSettings;
  onSaveSettings: (newSettings: NotificationSettings) => void;
  onTriggerTestNotification: (customSettings?: NotificationSettings) => void;
  currentProfile: UserProfile;
}

export const ReminderSettingsModal: React.FC<ReminderSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onTriggerTestNotification,
  currentProfile,
}) => {
  const [formData, setFormData] = useState<NotificationSettings>({
    ...settings,
    ringtoneSound: settings.ringtoneSound || 'harmonic_chime',
    ringtoneDuration: settings.ringtoneDuration || 4,
    ringtoneVolume: settings.ringtoneVolume ?? 0.8,
  });
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(() =>
    getBrowserNotificationPermission()
  );
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [showUnblockGuide, setShowUnblockGuide] = useState(false);
  const [testSentSuccess, setTestSentSuccess] = useState(false);
  const [activePlayingSound, setActivePlayingSound] = useState<RingtoneSound | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'classical' | 'ambient' | 'modern' | 'clinical' | 'custom'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const allFilesInputRef = useRef<HTMLInputElement>(null);
  const previewTimerRef = useRef<number | null>(null);

  // Sync state if modal reopens and monitor focus for permission changes
  useEffect(() => {
    if (isOpen) {
      // Check if custom audio is saved in localStorage
      const savedCustomUrl = safeLocalStorageGet('medtrack_custom_audio_url') || safeLocalStorageGet('pulsehealth_custom_audio_url') || settings.customAudioUrl;
      const savedCustomName = safeLocalStorageGet('medtrack_custom_audio_name') || safeLocalStorageGet('pulsehealth_custom_audio_name') || settings.customAudioName;

      setFormData({
        ...settings,
        ringtoneSound: settings.ringtoneSound || 'harmonic_chime',
        ringtoneDuration: settings.ringtoneDuration || 4,
        ringtoneVolume: settings.ringtoneVolume ?? 0.8,
        customAudioUrl: savedCustomUrl,
        customAudioName: savedCustomName,
      });

      const currentPerm = getBrowserNotificationPermission();
      setPermissionStatus(currentPerm);
      if (currentPerm === 'denied') {
        setShowUnblockGuide(true);
      }
      setTestSentSuccess(false);
      setActivePlayingSound(null);
    } else {
      stopActiveRingtone();
      if (previewTimerRef.current) {
        window.clearTimeout(previewTimerRef.current);
      }
    }
  }, [isOpen, settings]);

  // Real-time permission sync when user interacts with browser settings
  useEffect(() => {
    if (!isOpen) return;

    const handleCheck = () => {
      const updated = getBrowserNotificationPermission();
      setPermissionStatus(updated);
      if (updated === 'granted') {
        setFormData((prev) => ({ ...prev, enabled: true }));
      }
    };

    window.addEventListener('focus', handleCheck);
    document.addEventListener('visibilitychange', handleCheck);
    const interval = setInterval(handleCheck, 2500);

    return () => {
      window.removeEventListener('focus', handleCheck);
      document.removeEventListener('visibilitychange', handleCheck);
      clearInterval(interval);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    setIsRequestingPermission(true);
    const result = await requestBrowserNotificationPermission();
    setPermissionStatus(result);
    setIsRequestingPermission(false);
    if (result === 'granted') {
      setFormData((prev) => ({ ...prev, enabled: true }));
      setShowUnblockGuide(false);
    } else if (result === 'denied') {
      setShowUnblockGuide(true);
    }
  };

  const handleQuickPresetTime = (timeStr: string) => {
    setFormData((prev) => ({ ...prev, time: timeStr, enabled: true }));
  };

  const handleSetTimeInOneMinute = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const nextTime = `${hh}:${mm}`;
    setFormData((prev) => ({ ...prev, time: nextTime, enabled: true }));
  };

  const handleTogglePreviewAudio = (soundToTest?: RingtoneSound, customDuration?: number, customVol?: number) => {
    const targetSound = soundToTest || formData.ringtoneSound;

    if (activePlayingSound === targetSound && customDuration === undefined && customVol === undefined) {
      stopActiveRingtone();
      setActivePlayingSound(null);
      if (previewTimerRef.current) {
        window.clearTimeout(previewTimerRef.current);
        previewTimerRef.current = null;
      }
      return;
    }

    stopActiveRingtone();
    if (previewTimerRef.current) {
      window.clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }

    const duration = customDuration !== undefined ? customDuration : (formData.ringtoneDuration || 4);
    const volume = customVol !== undefined ? customVol : (formData.ringtoneVolume ?? 0.8);

    setActivePlayingSound(targetSound);
    playNotificationRingtone(targetSound, duration, volume, formData.customAudioUrl);

    previewTimerRef.current = window.setTimeout(() => {
      setActivePlayingSound(null);
      previewTimerRef.current = null;
    }, duration * 1000 + 250);
  };

  const processAudioFile = (file: File) => {
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('The selected audio file is larger than 15MB. Please choose a smaller track or MP3.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const result = loadEvt.target?.result as string;
      if (result) {
        setFormData((prev) => ({
          ...prev,
          ringtoneSound: 'custom_upload',
          customAudioUrl: result,
          customAudioName: file.name,
        }));
        try {
          if (result.length < 150000) {
            safeLocalStorageSet('medtrack_custom_audio_url', result);
            safeLocalStorageSet('medtrack_custom_audio_name', file.name);
          }
        } catch (e) {
          console.warn('Could not cache custom audio in localStorage:', e);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCustomAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAudioFile(file);
      e.target.value = '';
    }
  };

  const handleDropAudio = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processAudioFile(file);
    }
  };

  const handleRemoveCustomAudio = () => {
    stopActiveRingtone();
    setActivePlayingSound(null);
    safeLocalStorageRemove('medtrack_custom_audio_url');
    safeLocalStorageRemove('medtrack_custom_audio_name');
    safeLocalStorageRemove('pulsehealth_custom_audio_url');
    safeLocalStorageRemove('pulsehealth_custom_audio_name');
    setFormData((prev) => ({
      ...prev,
      ringtoneSound: 'harmonic_chime',
      customAudioUrl: undefined,
      customAudioName: undefined,
    }));
  };

  // Instant pre-loaded demo music loader
  const handleLoadSampleMusic = (trackName: string, soundPreset: RingtoneSound) => {
    setFormData((prev) => ({
      ...prev,
      ringtoneSound: soundPreset,
    }));
    handleTogglePreviewAudio(soundPreset);
  };

  const handleTestNow = () => {
    stopActiveRingtone();
    onTriggerTestNotification(formData);
    setTestSentSuccess(true);
    setTimeout(() => setTestSentSuccess(false), 4000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    stopActiveRingtone();
    onSaveSettings(formData);
    onClose();
  };

  const isSupported = isBrowserNotificationSupported();

  const filteredRingtones = ALL_RINGTONES.filter((item) => {
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesSearch =
      searchQuery.trim() === '' ||
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const durationOptions = [
    { value: 2, label: '2s (Short)' },
    { value: 4, label: '4s (Standard)' },
    { value: 7, label: '7s (Extended)' },
    { value: 10, label: '10s (Long)' },
    { value: 15, label: '15s (Chime)' },
    { value: 30, label: '30s (Max)' },
  ];

  return (
    <div
      id="reminder-settings-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="reminder-settings-modal-container"
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-teal-100/90 dark:border-slate-800 w-full max-w-2xl my-6 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 transition-colors"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-linear-to-r from-teal-700 via-teal-800 to-emerald-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-xs border border-white/20 shadow-inner">
              <Music className="w-5 h-5 text-teal-200 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg font-display text-white">
                  Medtrack Music &amp; Ringtone Hub
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 text-teal-100 px-2 py-0.5 rounded-full">
                  All Music Enabled
                </span>
              </div>
              <p className="text-xs text-teal-100/90">
                17+ Polyphonic synthesized melodies or upload any custom music track
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopActiveRingtone();
              onClose();
            }}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 grow">
          {/* Permission Status Banner & Unblock Guide */}
          {!isSupported ? (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-200">
                <p className="font-bold">Browser Notifications Not Fully Supported</p>
                <p className="mt-0.5 text-amber-700 dark:text-amber-300">
                  Your current browser does not support the Web Notification API, but audio alarms and in-app reminder banners will still trigger smoothly.
                </p>
              </div>
            </div>
          ) : permissionStatus === 'default' ? (
            <div className="p-3.5 bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <div className="text-xs text-indigo-950 dark:text-indigo-200">
                  <span className="font-bold block">Enable System Notifications</span>
                  <span className="text-indigo-700 dark:text-indigo-300">
                    Allow Medtrack to send desktop alerts when tab is in background.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRequestPermission}
                disabled={isRequestingPermission}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
              >
                {isRequestingPermission ? 'Requesting...' : 'Grant Permission'}
              </button>
            </div>
          ) : permissionStatus === 'denied' ? (
            <div className="space-y-3">
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-900 dark:text-rose-200">
                    <span className="font-bold block">
                      System Notifications Blocked in Browser Settings
                    </span>
                    <span className="text-rose-700 dark:text-rose-300">
                      Permission is blocked by your browser. Unblock in address bar / site settings to receive desktop push alerts.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowUnblockGuide((prev) => !prev)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>{showUnblockGuide ? 'Hide Guide' : 'How to Unblock'}</span>
                    {showUnblockGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {showUnblockGuide && (
                <div className="animate-in fade-in zoom-in-95 duration-200">
                  <BrowserNotificationUnblockGuide
                    onPermissionChange={(newPerm) => {
                      setPermissionStatus(newPerm);
                      if (newPerm === 'granted') {
                        setFormData((prev) => ({ ...prev, enabled: true }));
                      }
                    }}
                    onOpenTestNotification={() => {
                      onTriggerTestNotification(formData);
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  System Notification Alerts Enabled &amp; Authorized
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 px-2 py-0.5 rounded-full">
                  Active
                </span>
                <button
                  type="button"
                  onClick={() => setShowUnblockGuide((prev) => !prev)}
                  className="text-[11px] text-emerald-800 dark:text-emerald-300 hover:underline font-semibold cursor-pointer"
                >
                  {showUnblockGuide ? 'Hide Info' : 'Settings Guide'}
                </button>
              </div>
            </div>
          )}

          {/* Optional Unblock Guide when granted or general review */}
          {showUnblockGuide && permissionStatus === 'granted' && (
            <div className="animate-in fade-in zoom-in-95 duration-200">
              <BrowserNotificationUnblockGuide
                onPermissionChange={(newPerm) => {
                  setPermissionStatus(newPerm);
                }}
                onOpenTestNotification={() => {
                  onTriggerTestNotification(formData);
                }}
              />
            </div>
          )}

          {/* Master Enable & Reminder Type Toggle */}
          <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-slate-800/60 border border-teal-100/90 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-bold text-slate-900 dark:text-slate-100 block font-display">
                  Daily Health Reminder Schedule
                </label>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Receive a daily reminder notification with chosen music ringtone
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData((prev) => ({ ...prev, enabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-teal-600"></div>
              </label>
            </div>

            {/* Reminder Type Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-teal-100/60 dark:border-slate-700/60">
              <div
                onClick={() => setFormData((prev) => ({ ...prev, reminderType: 'metrics' }))}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  formData.reminderType === 'metrics'
                    ? 'border-teal-500 bg-white dark:bg-slate-800 ring-2 ring-teal-200 dark:ring-teal-900 shadow-2xs'
                    : 'border-slate-200 dark:border-slate-700 hover:border-teal-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                      Daily Metrics
                    </span>
                    <span className="text-[10px] text-slate-500">Weight, BP, Steps</span>
                  </div>
                </div>
                {formData.reminderType === 'metrics' && (
                  <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                )}
              </div>

              <div
                onClick={() => setFormData((prev) => ({ ...prev, reminderType: 'consultation_summary' }))}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  formData.reminderType === 'consultation_summary'
                    ? 'border-teal-500 bg-white dark:bg-slate-800 ring-2 ring-teal-200 dark:ring-teal-900 shadow-2xs'
                    : 'border-slate-200 dark:border-slate-700 hover:border-teal-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileBadge className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                      Doctor Brief
                    </span>
                    <span className="text-[10px] text-slate-500">Consultation logs</span>
                  </div>
                </div>
                {formData.reminderType === 'consultation_summary' && (
                  <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                )}
              </div>

              <div
                onClick={() => setFormData((prev) => ({ ...prev, reminderType: 'both' }))}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  formData.reminderType === 'both'
                    ? 'border-teal-500 bg-white dark:bg-slate-800 ring-2 ring-teal-200 dark:ring-teal-900 shadow-2xs'
                    : 'border-slate-200 dark:border-slate-700 hover:border-teal-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                      All-in-One
                    </span>
                    <span className="text-[10px] text-slate-500">Metrics + Brief</span>
                  </div>
                </div>
                {formData.reminderType === 'both' && (
                  <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                )}
              </div>
            </div>
          </div>

          {/* SCHEDULE TIME PICKER & PRESETS */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-teal-100/90 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-teal-950 dark:text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                Scheduled Daily Time
              </label>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-lg">
                {formData.time}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData((prev) => ({ ...prev, time: e.target.value }))}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold text-base focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Triggered automatically every day
              </span>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleQuickPresetTime('08:00')}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-300 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                🌅 08:00 AM (Morning)
              </button>
              <button
                type="button"
                onClick={() => handleQuickPresetTime('13:00')}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-300 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                ☀️ 13:00 PM (Midday)
              </button>
              <button
                type="button"
                onClick={() => handleQuickPresetTime('20:30')}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-300 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                🌙 20:30 PM (Evening)
              </button>
              <button
                type="button"
                onClick={handleSetTimeInOneMinute}
                className="px-2.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-900 dark:text-indigo-300 font-semibold text-xs transition-all text-center cursor-pointer"
                title="Schedule 1 minute from now to test automatic trigger"
              >
                ⏱️ +1 Minute Test
              </button>
            </div>
          </div>

          {/* ALL MUSIC RINGTONES SELECTION & LIBRARY */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-teal-100/90 dark:border-slate-700/80 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <label className="text-xs font-bold text-teal-950 dark:text-teal-300 uppercase tracking-wider">
                  Music Ringtone Library ({ALL_RINGTONES.length} Melodies)
                </label>
              </div>

              {/* Master Play/Stop Preview Button */}
              <button
                type="button"
                onClick={() => handleTogglePreviewAudio(formData.ringtoneSound)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                  activePlayingSound === formData.ringtoneSound
                    ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                    : 'bg-teal-600 hover:bg-teal-700 text-white'
                }`}
              >
                {activePlayingSound === formData.ringtoneSound ? (
                  <>
                    <Square className="w-3 h-3 fill-current" />
                    <span>Stop Preview ({formData.ringtoneDuration}s)</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 fill-current" />
                    <span>Test Selected Tone</span>
                  </>
                )}
              </button>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'all', label: `🌟 All (${ALL_RINGTONES.length})` },
                { id: 'classical', label: '🎼 Classical (4)' },
                { id: 'ambient', label: '🧘 Relax & Zen (5)' },
                { id: 'modern', label: '🎸 Modern & Pop (5)' },
                { id: 'clinical', label: '🩺 Clinical (3)' },
                { id: 'custom', label: '📁 Custom File' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id as any)}
                  className={`px-2.5 py-1 rounded-xl whitespace-nowrap font-medium transition-colors cursor-pointer ${
                    categoryFilter === cat.id
                      ? 'bg-teal-600 text-white font-bold shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-700/70 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Search Filter Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search melodies by title, vibe, instrument, or composer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Ringtone Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {filteredRingtones.map((opt) => {
                const isSelected = formData.ringtoneSound === opt.id;
                const isThisPlaying = activePlayingSound === opt.id;

                return (
                  <div
                    key={opt.id}
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, ringtoneSound: opt.id }));
                      if (opt.id === 'custom_upload' && !formData.customAudioUrl) {
                        audioFileInputRef.current?.click();
                      }
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between group relative ${
                      isSelected
                        ? 'border-teal-500 dark:border-teal-400 bg-teal-50/90 dark:bg-teal-950/60 ring-2 ring-teal-200 dark:ring-teal-900 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-teal-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base shrink-0">{opt.icon}</span>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-xs font-display block leading-tight">
                            {opt.label}
                          </span>
                          <span className="text-[10px] text-teal-700 dark:text-teal-300 font-medium">
                            {opt.categoryLabel}
                          </span>
                        </div>
                      </div>

                      {/* Mini Play / Stop button on card */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData((prev) => ({ ...prev, ringtoneSound: opt.id }));
                          handleTogglePreviewAudio(opt.id);
                        }}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
                          isThisPlaying
                            ? 'bg-rose-600 text-white animate-pulse'
                            : isSelected
                            ? 'bg-teal-600 text-white hover:bg-teal-700'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-teal-100 hover:text-teal-900'
                        }`}
                        title={isThisPlaying ? 'Stop Audio' : `Preview ${opt.label}`}
                      >
                        {isThisPlaying ? (
                          <Square className="w-3 h-3 fill-current" />
                        ) : (
                          <Play className="w-3 h-3 fill-current" />
                        )}
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      {opt.id === 'custom_upload' && formData.customAudioName
                        ? `Loaded: ${formData.customAudioName}`
                        : opt.desc}
                    </p>

                    {opt.badge && (
                      <span className="absolute bottom-2 right-2 text-[9px] font-bold bg-teal-100/80 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 px-1.5 py-0.2 rounded-md">
                        {opt.badge}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Custom Music Upload Drag & Drop Box */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDropAudio}
              className={`p-4 rounded-2xl border-2 border-dashed transition-all ${
                formData.ringtoneSound === 'custom_upload'
                  ? 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/50 shadow-xs'
                  : isDragOver
                  ? 'border-teal-400 bg-teal-50/80 dark:bg-teal-950/60 ring-2 ring-teal-300'
                  : 'border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40'
              }`}
            >
              {/* Standard Audio Picker */}
              <input
                ref={audioFileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac,.wma,.aiff,.webm,.opus,.m4r,.mid,.midi"
                onChange={handleCustomAudioUpload}
                className="hidden"
              />
              {/* Unrestricted All Files Picker for Windows/macOS if OS filters audio */}
              <input
                ref={allFilesInputRef}
                type="file"
                accept="*/*"
                onChange={handleCustomAudioUpload}
                className="hidden"
              />

              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 shadow-inner">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {formData.customAudioName ? `Active Track: ${formData.customAudioName}` : 'Custom Music or Desktop Audio Track'}
                        </h5>
                        {formData.customAudioUrl && (
                          <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/70 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-full">
                            Loaded &amp; Ready
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Supports MP3, WAV, OGG, M4A, FLAC, AAC, WebM — Drag &amp; drop from desktop or browse below.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => audioFileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      {formData.customAudioUrl ? 'Change Audio Track' : 'Browse Audio Files'}
                    </button>

                    <button
                      type="button"
                      onClick={() => allFilesInputRef.current?.click()}
                      className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer"
                      title="Shows all file extensions in Windows/Mac file dialog"
                    >
                      Show All Files (*.*)
                    </button>

                    {formData.customAudioUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveCustomAudio}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors cursor-pointer"
                        title="Remove uploaded audio"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Browser Audio Policy & Autoplay Status Banner */}
                <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-200/80 dark:border-teal-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-start gap-2 text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-teal-950 dark:text-teal-200 flex items-center gap-1.5">
                        <span>Browser Audio &amp; Autoplay Policy:</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.2 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Authorized &amp; Ready
                        </span>
                      </div>
                      <p className="text-[11px] text-teal-800/80 dark:text-teal-300/80 mt-0.5">
                        Medtrack unlocks browser audio contexts on user interactions (clicks, uploads, or tests) so scheduled alarms and custom MP3s play without restrictions.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      await unlockBrowserAudioContext();
                      handleTogglePreviewAudio(formData.ringtoneSound);
                    }}
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 text-teal-900 dark:text-teal-200 text-xs font-bold rounded-xl border border-teal-300 dark:border-teal-700 transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Unlock audio context and test playback"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>Test Audio Channel</span>
                  </button>
                </div>

                {/* Instant Pre-composed Sample Tracks Quick Picker */}
                <div className="pt-2.5 border-t border-slate-200/70 dark:border-slate-700/70">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-teal-900 dark:text-teal-300 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      Or Load Instant High-Quality Sample Music:
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      { id: 'beethoven_ode', label: '🎼 Ode to Joy', desc: 'Classical Symphony' },
                      { id: 'zen_singing_bowl', label: '🧘 432Hz Zen Bowl', desc: 'Relax & Meditate' },
                      { id: 'lofi_chill', label: '☕ Lo-Fi Chill Hop', desc: 'Mellow Study Beat' },
                      { id: 'marimba_island', label: '🌴 Tropical Marimba', desc: 'Upbeat Acoustic' },
                    ].map((demo) => (
                      <button
                        key={demo.id}
                        type="button"
                        onClick={() => handleLoadSampleMusic(demo.label, demo.id as RingtoneSound)}
                        className={`p-2 rounded-xl text-left border transition-all text-xs cursor-pointer flex flex-col ${
                          formData.ringtoneSound === demo.id
                            ? 'border-teal-500 bg-white dark:bg-slate-800 text-teal-900 dark:text-teal-200 ring-1 ring-teal-400 font-bold'
                            : 'border-slate-200 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-teal-300'
                        }`}
                      >
                        <span className="truncate">{demo.label}</span>
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 truncate">{demo.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Audio Playing Waveform Indicator */}
          {activePlayingSound && (
            <div className="p-3 bg-linear-to-r from-teal-600 via-teal-700 to-emerald-700 text-white rounded-2xl flex items-center justify-between animate-in fade-in shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 h-5">
                  <span className="w-1 h-3 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1 h-5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1 h-4 bg-white rounded-full animate-bounce"></span>
                  <span className="w-1 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.2s]"></span>
                </div>
                <div>
                  <span className="text-xs font-bold block">
                    Now Playing: {ALL_RINGTONES.find((r) => r.id === activePlayingSound)?.label || 'Custom Track'}
                  </span>
                  <span className="text-[10px] text-teal-100">
                    Volume: {Math.round((formData.ringtoneVolume ?? 0.8) * 100)}% | Duration: {formData.ringtoneDuration}s
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopActiveRingtone();
                  setActivePlayingSound(null);
                }}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl backdrop-blur-xs transition-colors cursor-pointer flex items-center gap-1"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop</span>
              </button>
            </div>
          )}

          {/* RINGTONE DURATION & VOLUME CONTROL */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-teal-100/90 dark:border-slate-700/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-teal-950 dark:text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                Ringtone Duration &amp; Volume Level
              </label>
              <span className="text-xs font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-lg border border-teal-200 dark:border-teal-800">
                Duration: {formData.ringtoneDuration}s
              </span>
            </div>

            {/* Duration Selector Buttons */}
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
                Select Ringtone Alarm Duration:
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {durationOptions.map((dur) => {
                  const isSelected = formData.ringtoneDuration === dur.value;
                  return (
                    <button
                      key={dur.value}
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, ringtoneDuration: dur.value }));
                        if (activePlayingSound) {
                          handleTogglePreviewAudio(activePlayingSound, dur.value, formData.ringtoneVolume);
                        }
                      }}
                      className={`p-2 rounded-xl border text-center transition-all text-xs cursor-pointer ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/60 text-teal-900 dark:text-teal-200 font-bold shadow-2xs ring-1 ring-teal-300 dark:ring-teal-800'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-teal-200'
                      }`}
                    >
                      {dur.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Volume Slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  {formData.soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  Alarm Volume
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {Math.round((formData.ringtoneVolume ?? 0.8) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={formData.ringtoneVolume ?? 0.8}
                onChange={(e) => {
                  const newVol = parseFloat(e.target.value);
                  setFormData((prev) => ({
                    ...prev,
                    ringtoneVolume: newVol,
                    soundEnabled: true,
                  }));
                }}
                className="w-full accent-teal-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Test Reminder Trigger Button */}
          <div className="p-3.5 rounded-2xl bg-linear-to-r from-teal-50/80 to-emerald-50/60 dark:from-teal-950/40 dark:to-emerald-950/30 border border-teal-200/80 dark:border-teal-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-teal-950 dark:text-teal-200 block">
                Instant Notification &amp; Sound Test
              </span>
              <span className="text-[11px] text-slate-600 dark:text-slate-400">
                Triggers selected {formData.ringtoneDuration}s ringtone tone and browser alert immediately.
              </span>
            </div>
            <button
              type="button"
              id="send-test-notification-btn"
              onClick={handleTestNow}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 text-teal-900 dark:text-teal-200 border border-teal-300 dark:border-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-all shrink-0 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>{testSentSuccess ? '✓ Ringing & Sent!' : 'Test Ringtone & Alert'}</span>
            </button>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-teal-100/90 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                stopActiveRingtone();
                onClose();
              }}
              className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium rounded-xl text-xs sm:text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-reminder-settings-btn"
              className="px-5 py-2 bg-linear-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save Ringtone &amp; Schedule</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
