import React, { useState, useEffect } from 'react';
import { NotificationSettings } from '../types';
import {
  Bell,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Volume2,
  VolumeX,
  Sliders,
  Check,
  Trash2,
} from 'lucide-react';
import { playGentleNotificationChime } from '../utils/notifications';

interface NotificationsCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: NotificationSettings;
  onUpdateSettings: (newSettings: NotificationSettings) => void;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'emergency' | 'appointment' | 'medication' | 'system';
  isRead: boolean;
  createdAt: string;
}

export const NotificationsCenterModal: React.FC<NotificationsCenterModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'inbox' | 'settings'>('inbox');
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif_1',
      title: 'Clinical Safety Protocol Active',
      message: 'MedTrack AI triage engine initialized with WHO & CDC guidelines.',
      type: 'system',
      isRead: false,
      createdAt: 'Just now',
    },
    {
      id: 'notif_2',
      title: 'Hydration & Micro-break Reminder',
      message: 'Take a 5-minute movement break and drink 250ml of water.',
      type: 'medication',
      isRead: true,
      createdAt: '2 hours ago',
    },
    {
      id: 'notif_3',
      title: 'Upcoming Preventive Checkup',
      message: 'Consultation with Dr. Sarah Lin is scheduled for tomorrow at 10:30 AM.',
      type: 'appointment',
      isRead: false,
      createdAt: 'Yesterday',
    },
  ]);

  if (!isOpen) return null;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Notifications Center</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500 text-white">
                    {unreadCount} new
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Clinical alerts, appointments, and health reminders
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('inbox')}
            className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${
              activeTab === 'inbox'
                ? 'border-teal-600 text-teal-700 dark:text-teal-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Alerts ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${
              activeTab === 'settings'
                ? 'border-teal-600 text-teal-700 dark:text-teal-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Sound &amp; Preferences
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {activeTab === 'inbox' ? (
            <>
              <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
                <span>Recent Updates</span>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="text-teal-600 dark:text-teal-400 hover:underline font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAll}
                      className="text-slate-400 hover:text-rose-500 transition-colors"
                      title="Clear notifications"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {notifications.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <span>No notifications in your inbox.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 rounded-xl border transition-all text-left flex gap-3 ${
                        n.isRead
                          ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80'
                          : 'bg-teal-50/50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800/80 shadow-2xs'
                      }`}
                    >
                      <div className="mt-0.5">
                        {n.type === 'emergency' ? (
                          <AlertTriangle className="w-4 h-4 text-rose-500" />
                        ) : n.type === 'appointment' ? (
                          <Clock className="w-4 h-4 text-teal-600" />
                        ) : (
                          <Info className="w-4 h-4 text-sky-500" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {n.title}
                          </h4>
                          <span className="text-[10px] text-slate-400 shrink-0">{n.createdAt}</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                          {n.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Sound Alerts
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Play audio chimes for reminders and triage alerts
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...settings, soundEnabled: !settings.soundEnabled };
                    onUpdateSettings(updated);
                    if (!settings.soundEnabled) {
                      playGentleNotificationChime();
                    }
                  }}
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${
                    settings.soundEnabled
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {settings.soundEnabled ? (
                    <Volume2 className="w-4 h-4" />
                  ) : (
                    <VolumeX className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Audio Test Chime
                  </span>
                  <button
                    type="button"
                    onClick={() => playGentleNotificationChime()}
                    className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Play Chime
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Tests web browser audio synthesis and notification volume.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
