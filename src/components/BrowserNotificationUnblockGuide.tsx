import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellOff,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Sliders,
  ShieldAlert,
  Smartphone,
  Laptop,
  HelpCircle,
  Sparkles,
  Info,
  Volume2,
} from 'lucide-react';
import {
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  detectBrowserFamily,
  dispatchBrowserNotification,
  getReminderContent,
  playNotificationRingtone,
  unlockBrowserAudioContext,
} from '../utils/notifications';

interface BrowserNotificationUnblockGuideProps {
  onPermissionChange?: (permission: NotificationPermission) => void;
  compact?: boolean;
  onOpenTestNotification?: () => void;
}

export const BrowserNotificationUnblockGuide: React.FC<BrowserNotificationUnblockGuideProps> = ({
  onPermissionChange,
  compact = false,
  onOpenTestNotification,
}) => {
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    getBrowserNotificationPermission()
  );
  const [selectedBrowser, setSelectedBrowser] = useState<
    'chrome' | 'safari' | 'edge' | 'firefox' | 'mobile'
  >(() => {
    const detected = detectBrowserFamily();
    if (detected === 'safari' || detected === 'mobile_safari') return 'safari';
    if (detected === 'edge') return 'edge';
    if (detected === 'firefox') return 'firefox';
    if (detected === 'mobile_chrome') return 'mobile';
    return 'chrome';
  });

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isRechecking, setIsRechecking] = useState(false);
  const [testNotificationSent, setTestNotificationSent] = useState(false);

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://medtrack.app';

  const checkPermission = () => {
    setIsRechecking(true);
    const updated = getBrowserNotificationPermission();
    setPermission(updated);
    if (onPermissionChange) {
      onPermissionChange(updated);
    }
    setTimeout(() => {
      setIsRechecking(false);
    }, 400);
  };

  // Re-check automatically when user tabs back into the browser window after modifying site settings
  useEffect(() => {
    const handleFocus = () => {
      checkPermission();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkPermission();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also check on interval while mounted
    const interval = setInterval(checkPermission, 3000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, []);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleRequestOrTest = async () => {
    if (permission === 'granted') {
      const content = getReminderContent('both', 'User');
      dispatchBrowserNotification(content);
      setTestNotificationSent(true);
      if (onOpenTestNotification) onOpenTestNotification();
      setTimeout(() => setTestNotificationSent(false), 3500);
    } else {
      const res = await requestBrowserNotificationPermission();
      setPermission(res);
      if (onPermissionChange) onPermissionChange(res);
    }
  };

  return (
    <div
      id="browser-notification-unblock-guide"
      className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-slate-900/90 overflow-hidden shadow-xs transition-colors text-slate-800 dark:text-slate-100"
    >
      {/* Top Banner Status */}
      <div className="p-4 sm:p-5 bg-linear-to-r from-rose-600 via-rose-700 to-amber-700 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20 shadow-inner">
            {permission === 'granted' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-300 animate-pulse" />
            ) : (
              <BellOff className="w-5 h-5 text-rose-200 animate-bounce" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm sm:text-base font-display">
                {permission === 'granted'
                  ? 'Notifications Successfully Unblocked!'
                  : 'Notifications Blocked in Browser Settings'}
              </h4>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  permission === 'granted'
                    ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40'
                    : 'bg-white/20 text-rose-100 border border-white/30'
                }`}
              >
                {permission === 'granted' ? 'Allowed' : 'Action Required'}
              </span>
            </div>
            <p className="text-xs text-rose-100/90 mt-0.5">
              {permission === 'granted'
                ? 'Your browser is authorized to deliver system health reminders and alerts.'
                : 'Follow the 3-step browser guide below to change permission from Block to Allow.'}
            </p>
          </div>
        </div>

        {/* Live Re-check & Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={checkPermission}
            disabled={isRechecking}
            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl backdrop-blur-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Checks if browser permission was changed in settings"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRechecking ? 'animate-spin' : ''}`} />
            <span>{isRechecking ? 'Checking...' : 'Re-check Status'}</span>
          </button>

          {permission === 'granted' && (
            <button
              type="button"
              onClick={handleRequestOrTest}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{testNotificationSent ? '✓ Sent Test' : 'Test Alert'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Body with Browser Tabs & Interactive Steps */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Browser Selector Tabs */}
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
            Select Your Browser For Step-by-Step Instructions:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: 'chrome', name: 'Google Chrome', icon: '🌐', tip: 'Chrome & Brave' },
              { id: 'safari', name: 'Apple Safari', icon: '🧭', tip: 'macOS & iOS' },
              { id: 'edge', name: 'Microsoft Edge', icon: '🌊', tip: 'Windows & Edge' },
              { id: 'firefox', name: 'Mozilla Firefox', icon: '🦊', tip: 'Firefox Browser' },
              { id: 'mobile', name: 'Mobile / Android', icon: '📱', tip: 'Phones & Tablets' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedBrowser(tab.id as any)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedBrowser === tab.id
                    ? 'border-rose-500 dark:border-rose-400 bg-white dark:bg-slate-800 ring-2 ring-rose-200 dark:ring-rose-900/50 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-800/40 hover:border-rose-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{tab.icon}</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {tab.name}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {tab.tip}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Step-by-step visual instruction card */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-4">
          {/* Chrome / Chromium Instructions */}
          {selectedBrowser === 'chrome' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  How to Unblock in Google Chrome / Chromium Browsers:
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Takes &lt; 10 seconds
                </span>
              </div>

              {/* Address bar visual simulation */}
              <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg border border-rose-300 dark:border-rose-700 shadow-2xs text-rose-700 dark:text-rose-300 font-bold animate-pulse">
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Click Tune / Padlock Icon 🔒</span>
                  </div>
                  <span className="text-slate-400">in address bar next to</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[220px]">
                    {currentUrl}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                  title="Copy current site URL"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUrl ? 'Copied' : 'Copy Site URL'}</span>
                </button>
              </div>

              <ol className="list-decimal list-inside space-y-2 text-xs text-slate-700 dark:text-slate-300">
                <li className="leading-relaxed">
                  Click the <strong>Tune / Padlock icon (Site Settings)</strong> on the far left of your browser address bar.
                </li>
                <li className="leading-relaxed">
                  In the menu that appears, locate <strong>Notifications</strong> and toggle or select <strong>Allow</strong> (change from <em>Block</em> to <em>Allow</em>).
                </li>
                <li className="leading-relaxed">
                  Or go to Chrome Settings: <code className="bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded text-[11px] font-mono text-rose-700 dark:text-rose-300">chrome://settings/content/notifications</code> and add this site to <em>Allowed to send notifications</em>.
                </li>
                <li className="leading-relaxed">
                  Switch back to this tab and click the <strong>"Re-check Status"</strong> button above (or reload the page).
                </li>
              </ol>
            </div>
          )}

          {/* Safari Instructions */}
          {selectedBrowser === 'safari' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  How to Unblock in Apple Safari (macOS &amp; iOS):
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  macOS &amp; iOS Safari
                </span>
              </div>

              <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-2">
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Laptop className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>On Mac (Safari Desktop):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px]">
                  <li>In the top menu bar, click <strong>Safari &gt; Settings... (or Preferences...)</strong>.</li>
                  <li>Click the <strong>Websites</strong> tab at the top.</li>
                  <li>In the left sidebar, click <strong>Notifications</strong>.</li>
                  <li>Find <em>{currentUrl}</em> in the list and change permission dropdown from <strong>Deny</strong> to <strong>Allow</strong>.</li>
                </ol>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>On iPhone / iPad (iOS Safari):</span>
                </div>
                <p className="text-[11px] pl-1">
                  On iOS, tap the <strong>Share button &gt; "Add to Home Screen"</strong> to enable Web Push notification alerts directly through iOS Notification Center.
                </p>
              </div>
            </div>
          )}

          {/* Edge Instructions */}
          {selectedBrowser === 'edge' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  How to Unblock in Microsoft Edge:
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Windows &amp; Mac Edge
                </span>
              </div>

              <ol className="list-decimal list-inside space-y-2 text-xs text-slate-700 dark:text-slate-300">
                <li className="leading-relaxed">
                  Click the <strong>Lock / Site Information icon 🔒</strong> on the left side of the Edge address bar.
                </li>
                <li className="leading-relaxed">
                  Under <strong>Permissions for this site</strong>, find <strong>Notifications</strong> and change it to <strong>Allow</strong>.
                </li>
                <li className="leading-relaxed">
                  Or enter <code className="bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded text-[11px] font-mono text-rose-700 dark:text-rose-300">edge://settings/content/notifications</code> in address bar to manage allowed sites.
                </li>
                <li className="leading-relaxed">
                  Return here and click <strong>"Re-check Status"</strong>.
                </li>
              </ol>
            </div>
          )}

          {/* Firefox Instructions */}
          {selectedBrowser === 'firefox' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  How to Unblock in Mozilla Firefox:
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Firefox Browser
                </span>
              </div>

              <ol className="list-decimal list-inside space-y-2 text-xs text-slate-700 dark:text-slate-300">
                <li className="leading-relaxed">
                  Click the <strong>Padlock / Permissions icon 🔒</strong> next to the web address.
                </li>
                <li className="leading-relaxed">
                  Under the <strong>Permissions</strong> section, locate <em>Send Notifications</em>.
                </li>
                <li className="leading-relaxed">
                  Click the <strong>"X" (Cross)</strong> next to <em>Blocked / Blocked Temporarily</em> to clear the block, or change to <strong>Allowed</strong>.
                </li>
                <li className="leading-relaxed">
                  Reload the page or click <strong>"Re-check Status"</strong>.
                </li>
              </ol>
            </div>
          )}

          {/* Mobile / Android Instructions */}
          {selectedBrowser === 'mobile' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  How to Unblock on Android Phones / Mobile Chrome:
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Mobile Browsers
                </span>
              </div>

              <ol className="list-decimal list-inside space-y-2 text-xs text-slate-700 dark:text-slate-300">
                <li className="leading-relaxed">
                  Tap the <strong>Three-Dots menu (⋮)</strong> in Chrome at top-right &gt; tap <strong>Settings</strong>.
                </li>
                <li className="leading-relaxed">
                  Tap <strong>Site Settings &gt; Notifications</strong>.
                </li>
                <li className="leading-relaxed">
                  Under the <strong>Blocked</strong> section, tap this website URL (<em>{currentUrl}</em>) and select <strong>Allow</strong>.
                </li>
                <li className="leading-relaxed">
                  Return to this browser tab and tap <strong>"Re-check Status"</strong>.
                </li>
              </ol>
            </div>
          )}

          {/* Browser Sound & Autoplay Policy Guide */}
          <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed">
                <span className="font-bold block">Browser Sound &amp; Custom Audio Policy:</span>
                <span className="text-[11px] text-emerald-800 dark:text-emerald-300">
                  Ensure <strong>Sound: Allow</strong> is enabled in Site Settings (Tune icon next to URL). Click below to unlock your browser's audio engine and verify custom tone playback.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                await unlockBrowserAudioContext();
                playNotificationRingtone('harmonic_chime', 2, 0.8);
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Test Audio Channel</span>
            </button>
          </div>

          {/* Operating System Focus / Do Not Disturb Troubleshooting */}
          <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 rounded-xl border border-amber-200/80 dark:border-amber-900/50 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
              <span className="font-bold">OS-Level Note: </span>
              If browser permission is allowed but alerts do not appear, ensure <strong>Do Not Disturb / Focus Mode</strong> is turned off in Windows Notifications or macOS Control Center, and that your browser is allowed to display banners in OS System Settings.
            </div>
          </div>
        </div>

        {/* Guaranteed In-App Fallback Guarantee */}
        <div className="p-3.5 bg-teal-50/70 dark:bg-teal-950/40 rounded-2xl border border-teal-200/70 dark:border-teal-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span className="text-xs text-teal-950 dark:text-teal-200">
              <strong>Guaranteed Alarm Protection:</strong> In-app reminder banners and customized procedural music ringtones will still fire on schedule even while browser notifications are blocked.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
