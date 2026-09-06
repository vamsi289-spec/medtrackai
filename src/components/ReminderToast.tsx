import React, { useEffect, useState } from 'react';
import {
  Bell,
  X,
  Scale,
  FileBadge,
  Clock,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ReminderContent, stopActiveRingtone } from '../utils/notifications';
import { NotificationSettings } from '../types';

interface ReminderToastProps {
  content: ReminderContent | null;
  onClose: () => void;
  onOpenProfileModal: () => void;
  onOpenClinicalBrief: () => void;
  onSnooze: (minutes: number) => void;
  notificationSettings?: NotificationSettings;
  onStopAudio?: () => void;
}

export const ReminderToast: React.FC<ReminderToastProps> = ({
  content,
  onClose,
  onOpenProfileModal,
  onOpenClinicalBrief,
  onSnooze,
  notificationSettings,
  onStopAudio,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  useEffect(() => {
    if (content) {
      setIsVisible(true);
      setIsAudioMuted(false);
    } else {
      setIsVisible(false);
    }
  }, [content]);

  if (!content || !isVisible) return null;

  const handleStopSound = () => {
    stopActiveRingtone();
    setIsAudioMuted(true);
    if (onStopAudio) onStopAudio();
  };

  const handleDismiss = () => {
    stopActiveRingtone();
    setIsVisible(false);
    onClose();
  };

  const handleMetricsClick = () => {
    stopActiveRingtone();
    onOpenProfileModal();
    onClose();
  };

  const handleBriefClick = () => {
    stopActiveRingtone();
    onOpenClinicalBrief();
    onClose();
  };

  const ringtoneName = notificationSettings?.ringtoneSound === 'custom_upload'
    ? notificationSettings.customAudioName || 'Custom Uploaded Audio'
    : (notificationSettings?.ringtoneSound || 'harmonic_chime').replace(/_/g, ' ');

  return (
    <aside
      id="medtrack-reminder-toast"
      aria-label="Daily health reminder"
      className="fixed bottom-5 right-5 z-50 max-w-md w-[calc(100vw-2.5rem)] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl shadow-2xl border border-teal-200/90 dark:border-slate-800 p-4 sm:p-5 animate-in slide-in-from-bottom-5 fade-in duration-300 ring-4 ring-teal-500/10 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-teal-500/20 shrink-0">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-100/90 dark:bg-teal-950/80 text-teal-900 dark:text-teal-300 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                Scheduled Daily Reminder
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-0.5">
                <Clock className="w-3 h-3" />
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1 font-display leading-tight">
              {content.title}
            </h4>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0 cursor-pointer"
          title="Dismiss Reminder"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-300 mt-2.5 leading-relaxed bg-teal-50/50 dark:bg-teal-950/30 p-2.5 rounded-xl border border-teal-100/80 dark:border-teal-900/40">
        {content.body}
      </p>

      {/* Active Ringtone Audio Bar if Sound Enabled */}
      {notificationSettings?.soundEnabled && (
        <div className="mt-2.5 flex items-center justify-between gap-2 px-3 py-1.5 bg-teal-100/80 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/80 rounded-xl text-xs text-teal-900 dark:text-teal-200">
          <div className="flex items-center gap-2 min-w-0">
            <Volume2 className={`w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0 ${!isAudioMuted ? 'animate-pulse' : 'opacity-40'}`} />
            <span className="truncate text-[11px] font-semibold">
              {!isAudioMuted ? `Playing: ${ringtoneName}` : `Muted (${ringtoneName})`}
            </span>
          </div>
          {!isAudioMuted && (
            <button
              type="button"
              onClick={handleStopSound}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-800 dark:text-teal-200 bg-white/60 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 px-2 py-0.5 rounded-lg border border-teal-300/60 dark:border-teal-700/60 transition-colors shrink-0 cursor-pointer"
              title="Stop ringing audio"
            >
              <VolumeX className="w-3 h-3 text-rose-500" />
              <span>Mute Alarm</span>
            </button>
          )}
        </div>
      )}

      {/* Action Buttons based on type */}
      <div className="mt-3.5 pt-3 border-t border-teal-100/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {content.reminderType === 'metrics' && (
            <button
              id="toast-log-metrics-btn"
              onClick={handleMetricsClick}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-linear-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Log Daily Metrics</span>
            </button>
          )}

          {content.reminderType === 'consultation_summary' && (
            <button
              id="toast-review-brief-btn"
              onClick={handleBriefClick}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-linear-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <FileBadge className="w-3.5 h-3.5" />
              <span>Review Doctor Brief</span>
            </button>
          )}

          {content.reminderType === 'both' && (
            <>
              <button
                id="toast-both-metrics-btn"
                onClick={handleMetricsClick}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-linear-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Scale className="w-3 h-3" />
                <span>Log Metrics</span>
              </button>
              <button
                id="toast-both-brief-btn"
                onClick={handleBriefClick}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-teal-50 dark:bg-slate-800 hover:bg-teal-100 dark:hover:bg-slate-700 text-teal-900 dark:text-teal-300 border border-teal-200 dark:border-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                <FileBadge className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                <span>Doctor Brief</span>
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
          <button
            onClick={() => onSnooze(10)}
            className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-semibold px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Snooze 10m
          </button>
          <button
            onClick={handleDismiss}
            className="text-[11px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 px-2 py-1 transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </aside>
  );
};
