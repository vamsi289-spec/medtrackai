/**
 * Safe LocalStorage Utility with automatic QuotaExceeded recovery and payload pruning.
 * Protects the app from browser 5MB storage limits when large images, audio tracks, or attachments are cached.
 */

export function isQuotaExceededError(err: unknown): boolean {
  if (!err) return false;
  const e = err as { name?: string; code?: number; number?: number; message?: string };
  return (
    e.name === 'QuotaExceededError' ||
    e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    e.code === 22 ||
    e.code === 1014 ||
    e.number === -2147024882 ||
    (typeof e.message === 'string' && /quota/i.test(e.message))
  );
}

/**
 * Prunes heavy base64 and multimedia payloads from stored data to free up quota.
 */
export function purgeHeavyLocalStorageData(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    // 1. Clean up or prune messages with large base64 attachments
    const rawMessages = localStorage.getItem('medtrack_messages') || localStorage.getItem('pulsehealth_messages');
    if (rawMessages) {
      try {
        const msgs = JSON.parse(rawMessages);
        if (Array.isArray(msgs)) {
          // Keep the last 15 messages and strip heavy base64 attachment data
          const lightweightMsgs = msgs.slice(-15).map((msg: any) => ({
            ...msg,
            attachments: Array.isArray(msg.attachments)
              ? msg.attachments.map((att: any) => ({
                  ...att,
                  data: typeof att.data === 'string' && att.data.length > 5000 ? '' : att.data,
                  previewUrl: typeof att.previewUrl === 'string' && att.previewUrl.length > 5000 ? '' : att.previewUrl,
                }))
              : [],
          }));
          localStorage.setItem('medtrack_messages', JSON.stringify(lightweightMsgs));
          localStorage.removeItem('pulsehealth_messages');
        }
      } catch {
        localStorage.removeItem('medtrack_messages');
        localStorage.removeItem('pulsehealth_messages');
      }
    }

    // 2. Remove heavy custom audio cache if it's hogging quota
    localStorage.removeItem('pulsehealth_custom_audio_url');
    const medtrackCustomAudio = localStorage.getItem('medtrack_custom_audio_url');
    if (medtrackCustomAudio && medtrackCustomAudio.length > 100000) {
      localStorage.removeItem('medtrack_custom_audio_url');
    }
  } catch (cleanErr) {
    console.warn('Could not complete localStorage purge:', cleanErr);
  }
}

/**
 * Safely sets an item in localStorage with quota recovery.
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;

  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    if (isQuotaExceededError(err)) {
      console.warn(`LocalStorage quota exceeded while setting "${key}". Triggering storage cleanup...`);
      purgeHeavyLocalStorageData();

      // If the current payload itself is notification settings with a huge customAudioUrl, sanitize it
      let adjustedValue = value;
      if (key.includes('notification_settings')) {
        try {
          const parsed = JSON.parse(value);
          if (parsed.customAudioUrl && parsed.customAudioUrl.length > 50000) {
            delete parsed.customAudioUrl;
            adjustedValue = JSON.stringify(parsed);
          }
        } catch {}
      }

      try {
        localStorage.setItem(key, adjustedValue);
        return true;
      } catch (retryErr) {
        console.warn(`LocalStorage setItem still failed after cleanup for "${key}":`, retryErr);
        return false;
      }
    }
    console.warn(`LocalStorage setItem failed for "${key}":`, err);
    return false;
  }
}

/**
 * Safely gets an item from localStorage.
 */
export function safeLocalStorageGet(key: string, fallback: string | null = null): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  try {
    const val = localStorage.getItem(key);
    return val !== null ? val : fallback;
  } catch (err) {
    console.warn(`LocalStorage getItem failed for "${key}":`, err);
    return fallback;
  }
}

/**
 * Safely removes an item from localStorage.
 */
export function safeLocalStorageRemove(key: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`LocalStorage removeItem failed for "${key}":`, err);
  }
}
