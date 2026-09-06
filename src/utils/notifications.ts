import { NotificationSettings, NotificationReminderType, RingtoneSound } from '../types';
import { safeLocalStorageGet, safeLocalStorageSet } from './safeStorage';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  time: '09:00',
  scheduleSlots: ['09:00', '14:00', '20:00'],
  frequency: 'once_daily',
  reminderType: 'both',
  soundEnabled: true,
  ringtoneSound: 'harmonic_chime',
  ringtoneDuration: 4, // 4 seconds default
  ringtoneVolume: 0.85,
};

export const NOTIFICATION_STORAGE_KEY = 'medtrack_notification_settings';

// Active audio tracking for stopping previews or active alarms
let sharedAudioContext: AudioContext | null = null;
let activeHtmlAudio: HTMLAudioElement | null = null;
let activeBufferSource: AudioBufferSourceNode | null = null;
let activeRingtoneGainNode: GainNode | null = null;
let activeOscillators: OscillatorNode[] = [];
let activeStopTimer: number | null = null;
let isAudioPolicyUnlocked = false;

/**
 * Safely retrieves or initializes a shared persistent AudioContext singleton.
 * Recycles context across sounds to prevent reaching browser hardware context limits.
 */
export function getOrCreateAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return null;

    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
      sharedAudioContext = new AudioContextClass();
    }

    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().catch(() => {
        // Silently handled until next user gesture
      });
    }

    return sharedAudioContext;
  } catch (e) {
    console.warn('Could not initialize AudioContext safely:', e);
    return null;
  }
}

/**
 * Initializes global browser gesture listeners to unlock AudioContext and HTML5 Audio
 * in compliance with modern browser autoplay policies (Chrome, Safari, Edge, Firefox, iOS, Android).
 */
export function setupBrowserAudioPolicyUnlock(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleUserGesture = () => {
    unlockBrowserAudioContext()
      .then(() => {
        isAudioPolicyUnlocked = true;
      })
      .catch(() => {});
  };

  const events = ['pointerdown', 'touchstart', 'touchend', 'keydown', 'click', 'focus'];
  events.forEach((evt) => {
    window.addEventListener(evt, handleUserGesture, { capture: true, passive: true, once: false });
  });

  return () => {
    events.forEach((evt) => {
      window.removeEventListener(evt, handleUserGesture, { capture: true });
    });
  };
}

/**
 * Proactively un-suspends the Web Audio API context and primes hardware output
 * to satisfy browser media/audio policies before scheduled alarms fire.
 */
export async function unlockBrowserAudioContext(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // Play a micro-silent 1-sample buffer to reliably unlock hardware audio gates on iOS & Safari
    try {
      const silentBuffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch {
      // Ignored
    }

    isAudioPolicyUnlocked = true;
    return true;
  } catch (e) {
    console.warn('Could not auto-unlock AudioContext:', e);
    return false;
  }
}

export function isAudioAutoplayUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  if (isAudioPolicyUnlocked) return true;
  if (sharedAudioContext && sharedAudioContext.state === 'running') return true;
  return false;
}

export function getStoredNotificationSettings(): NotificationSettings {
  try {
    const stored = safeLocalStorageGet(NOTIFICATION_STORAGE_KEY);
    let parsed: Partial<NotificationSettings> = {};
    if (stored) {
      parsed = JSON.parse(stored);
    }

    // Check fallback keys for custom uploaded audio
    if (parsed.ringtoneSound === 'custom_upload' && !parsed.customAudioUrl) {
      const cachedUrl = safeLocalStorageGet('medtrack_custom_audio_url');
      const cachedName = safeLocalStorageGet('medtrack_custom_audio_name');
      if (cachedUrl) {
        parsed.customAudioUrl = cachedUrl;
        parsed.customAudioName = cachedName || 'Custom Audio Track';
      }
    }

    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...parsed };
  } catch (e) {
    console.warn('Failed to load notification settings:', e);
  }
  return DEFAULT_NOTIFICATION_SETTINGS;
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  try {
    // If settings has an oversized base64 custom audio URL (> 50KB), handle it cleanly
    const safeSettings = { ...settings };
    if (safeSettings.customAudioUrl && safeSettings.customAudioUrl.length > 50000) {
      delete safeSettings.customAudioUrl;
    }
    safeLocalStorageSet(NOTIFICATION_STORAGE_KEY, JSON.stringify(safeSettings));
  } catch (e) {
    console.warn('Could not save notification settings:', e);
  }
}

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getBrowserNotificationPermission(): NotificationPermission {
  if (!isBrowserNotificationSupported()) {
    return 'denied';
  }
  try {
    return Notification.permission;
  } catch {
    return 'denied';
  }
}

/**
 * Detects the user's browser family for targeted unblocking instructions
 */
export function detectBrowserFamily():
  | 'chrome'
  | 'safari'
  | 'firefox'
  | 'edge'
  | 'mobile_chrome'
  | 'mobile_safari'
  | 'other' {
  if (typeof window === 'undefined' || !navigator) return 'chrome';
  const ua = (navigator.userAgent || '').toLowerCase();

  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);

  if (/edg\//.test(ua)) return 'edge';
  if (/firefox|fxios/.test(ua)) return 'firefox';
  if (isMobile && (/iphone|ipad|ipod/.test(ua) || (/safari/.test(ua) && !/chrome|crios/.test(ua)))) {
    return 'mobile_safari';
  }
  if (isMobile && /chrome|crios|android/.test(ua)) {
    return 'mobile_chrome';
  }
  if (/safari/.test(ua) && !/chrome|crios/.test(ua)) return 'safari';
  if (/chrome|crios/.test(ua)) return 'chrome';

  return isMobile ? 'mobile_chrome' : 'chrome';
}

/**
 * Flashes browser document title for visual alert when in background tab
 */
let titleFlashTimer: number | null = null;
let originalDocumentTitle = '';

export function flashDocumentTitle(alertText: string = '🔔 Medtrack Health Alert!'): void {
  if (typeof document === 'undefined') return;
  if (!originalDocumentTitle) {
    originalDocumentTitle = document.title || 'Medtrack';
  }

  if (titleFlashTimer !== null) {
    clearInterval(titleFlashTimer);
  }

  let toggle = false;
  let count = 0;
  titleFlashTimer = window.setInterval(() => {
    document.title = toggle ? alertText : originalDocumentTitle;
    toggle = !toggle;
    count++;
    if (count > 20) {
      if (titleFlashTimer !== null) {
        clearInterval(titleFlashTimer);
        titleFlashTimer = null;
      }
      document.title = originalDocumentTitle;
    }
  }, 900);

  // Restore on user focus
  const handleWindowFocus = () => {
    if (titleFlashTimer !== null) {
      clearInterval(titleFlashTimer);
      titleFlashTimer = null;
    }
    document.title = originalDocumentTitle;
    window.removeEventListener('focus', handleWindowFocus);
  };
  window.addEventListener('focus', handleWindowFocus);
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (!isBrowserNotificationSupported()) {
    return 'denied';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (e) {
    console.error('Failed to request notification permission:', e);
    return 'denied';
  }
}

/**
 * Converts a base64 Data URL or remote URL to an ArrayBuffer for Web Audio decoding
 */
async function getAudioArrayBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    if (url.startsWith('data:')) {
      const base64Data = url.split(',')[1];
      if (!base64Data) return null;
      const binaryStr = window.atob(base64Data);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      return bytes.buffer;
    } else {
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.arrayBuffer();
    }
  } catch (e) {
    console.warn('Could not extract audio buffer for Web Audio playback:', e);
    return null;
  }
}

/**
 * Stops any currently active ringtone, custom track, or preview audio cleanly and instantly
 */
export function stopActiveRingtone(): void {
  if (activeStopTimer !== null) {
    window.clearTimeout(activeStopTimer);
    activeStopTimer = null;
  }

  // Instantly mute and disconnect master ringtone gain node
  if (activeRingtoneGainNode && sharedAudioContext) {
    try {
      activeRingtoneGainNode.gain.cancelScheduledValues(sharedAudioContext.currentTime);
      activeRingtoneGainNode.gain.setValueAtTime(0, sharedAudioContext.currentTime);
      activeRingtoneGainNode.disconnect();
    } catch {
      // Ignored
    }
    activeRingtoneGainNode = null;
  }

  // Stop and clear all active scheduled synthesizer oscillators
  if (activeOscillators.length > 0) {
    activeOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Ignored
      }
    });
    activeOscillators = [];
  }

  // Stop custom Web Audio buffer source if playing
  if (activeBufferSource) {
    try {
      activeBufferSource.stop();
      activeBufferSource.disconnect();
    } catch {
      // Ignored
    }
    activeBufferSource = null;
  }

  // Stop HTML5 Audio if playing
  if (activeHtmlAudio) {
    try {
      activeHtmlAudio.pause();
      activeHtmlAudio.currentTime = 0;
      activeHtmlAudio.src = '';
    } catch {
      // Ignored
    }
    activeHtmlAudio = null;
  }
}

export interface RingtoneDefinition {
  id: RingtoneSound;
  label: string;
  category: 'classical' | 'ambient' | 'modern' | 'clinical' | 'custom';
  categoryLabel: string;
  desc: string;
  icon: string;
  badge?: string;
}

export const ALL_RINGTONES: RingtoneDefinition[] = [
  // Classical & Masterpiece Melodies
  {
    id: 'beethoven_ode',
    label: 'Ode to Joy (Beethoven)',
    category: 'classical',
    categoryLabel: 'Classical & Symphony',
    desc: 'Iconic classical symphony melody in pure acoustic harmony',
    icon: '🎼',
    badge: 'Popular',
  },
  {
    id: 'vivaldi_spring',
    label: 'Spring Symphony (Vivaldi)',
    category: 'classical',
    categoryLabel: 'Classical & Symphony',
    desc: 'Joyful baroque strings and flute arpeggios',
    icon: '🎻',
  },
  {
    id: 'mozart_allegro',
    label: 'Eine Kleine Nachtmusik (Mozart)',
    category: 'classical',
    categoryLabel: 'Classical & Symphony',
    desc: 'Crisp allegro classical violin serenade',
    icon: '👑',
  },
  {
    id: 'canon_in_d',
    label: "Pachelbel's Canon in D",
    category: 'classical',
    categoryLabel: 'Classical & Symphony',
    desc: 'Timeless warm acoustic baroque chord progression',
    icon: '🏰',
  },

  // Relax & Zen Soundscapes
  {
    id: 'zen_singing_bowl',
    label: 'Tibetan Singing Bowl (432Hz)',
    category: 'ambient',
    categoryLabel: 'Relax & Zen',
    desc: 'Deep 432Hz resonant meditative gong & soothing harmonics',
    icon: '🧘',
    badge: 'Healing',
  },
  {
    id: 'lofi_chill',
    label: 'Lo-Fi Dreamy Chill Hop',
    category: 'ambient',
    categoryLabel: 'Relax & Zen',
    desc: 'Warm electric Rhodes chords & mellow soothing melody',
    icon: '☕',
  },
  {
    id: 'ocean_breeze',
    label: 'Ocean Waves & Zen Flute',
    category: 'ambient',
    categoryLabel: 'Relax & Zen',
    desc: 'Peaceful bamboo pentatonic notes over gentle breeze',
    icon: '🌊',
  },
  {
    id: 'soothing_harp',
    label: 'Celestial Harp Arpeggio',
    category: 'ambient',
    categoryLabel: 'Relax & Zen',
    desc: 'Ascending peaceful harp glissando with crystal decay',
    icon: '🎵',
  },
  {
    id: 'gentle_bell',
    label: '528Hz Solfeggio Miracle Bell',
    category: 'ambient',
    categoryLabel: 'Relax & Zen',
    desc: '528Hz pure resonance bell for mindful calm',
    icon: '🔔',
  },

  // Modern & Acoustic Pop
  {
    id: 'marimba_island',
    label: 'Tropical Marimba Breeze',
    category: 'modern',
    categoryLabel: 'Modern & Acoustic',
    desc: 'Bright wooden marimba mallets with cheerful bounce',
    icon: '🌴',
    badge: 'Upbeat',
  },
  {
    id: 'acoustic_strum',
    label: 'Acoustic Guitar Reverie',
    category: 'modern',
    categoryLabel: 'Modern & Acoustic',
    desc: 'Warm nylon fingerstyle guitar chord melody',
    icon: '🎸',
  },
  {
    id: 'synthwave_neon',
    label: '80s Retro Synthwave Pulse',
    category: 'modern',
    categoryLabel: 'Modern & Acoustic',
    desc: 'Vintage analog synth lead with rolling rhythmic bass',
    icon: '🕹️',
  },
  {
    id: 'uplifting_pulse',
    label: 'Modern Uplifting EDM Lead',
    category: 'modern',
    categoryLabel: 'Modern & Acoustic',
    desc: 'Energizing high-frequency modern synthesizer pulse',
    icon: '⚡',
  },
  {
    id: 'cosmic_ambient',
    label: 'Starlight Cosmic Pad',
    category: 'modern',
    categoryLabel: 'Modern & Acoustic',
    desc: 'Lush celestial chords with spacious stereo sustain',
    icon: '✨',
  },

  // Clinical & Medical
  {
    id: 'harmonic_chime',
    label: 'Medtrack Crystal Chime',
    category: 'clinical',
    categoryLabel: 'Clinical & Alert',
    desc: 'Signature dual-tone balanced health check acoustic chime',
    icon: '🩺',
    badge: 'Default',
  },
  {
    id: 'nurse_call_soft',
    label: 'Hospital Gentle Call Chime',
    category: 'clinical',
    categoryLabel: 'Clinical & Alert',
    desc: 'Friendly hospital patient notification bell',
    icon: '🏥',
  },
  {
    id: 'clinical_pager',
    label: 'Vital Signs Monitor Pulse',
    category: 'clinical',
    categoryLabel: 'Clinical & Alert',
    desc: 'Crisp medical telemetry vital pulse bleeps',
    icon: '📟',
  },

  // Custom Audio Upload
  {
    id: 'custom_upload',
    label: 'Custom Audio / Music File',
    category: 'custom',
    categoryLabel: 'Custom Upload',
    desc: 'Upload any MP3, WAV, OGG, M4A, FLAC, or AAC track',
    icon: '📁',
    badge: 'Any Format',
  },
];

/**
 * Plays the customized ringtone configured by the user with procedural multi-instrument Web Audio synthesis or uploaded track.
 * Enhanced for high audibility, dynamic range compression, and zero browser audio playback errors.
 */
export function playNotificationRingtone(
  sound: RingtoneSound = 'harmonic_chime',
  durationSeconds: number = 4,
  volume: number = 0.85,
  customAudioUrl?: string
): void {
  stopActiveRingtone();

  // If custom uploaded audio exists and selected
  if (sound === 'custom_upload' && customAudioUrl) {
    const safeVol = Math.max(0.05, Math.min(1.0, volume));

    // Pipeline 1: HTML5 Audio with safe autoplay handling
    try {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.preload = 'auto';
      audio.src = customAudioUrl;
      audio.volume = safeVol;
      audio.loop = durationSeconds > 3;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            activeHtmlAudio = audio;
            activeStopTimer = window.setTimeout(() => {
              stopActiveRingtone();
            }, durationSeconds * 1000);
          })
          .catch(async () => {
            // Pipeline 2: Web Audio API AudioBufferSourceNode fallback
            try {
              const ctx = getOrCreateAudioContext();
              if (ctx) {
                if (ctx.state === 'suspended') {
                  await ctx.resume();
                }

                const bufferData = await getAudioArrayBuffer(customAudioUrl);
                if (bufferData) {
                  const decoded = await ctx.decodeAudioData(bufferData);
                  const source = ctx.createBufferSource();
                  source.buffer = decoded;
                  source.loop = durationSeconds > decoded.duration;

                  const gain = ctx.createGain();
                  gain.gain.setValueAtTime(safeVol, ctx.currentTime);
                  activeRingtoneGainNode = gain;

                  source.connect(gain);
                  gain.connect(ctx.destination);

                  source.start(0);
                  activeBufferSource = source;

                  activeStopTimer = window.setTimeout(() => {
                    stopActiveRingtone();
                  }, durationSeconds * 1000);
                  return;
                }
              }
            } catch {
              // Fallback to signature acoustic chime
            }

            // Pipeline 3: Fallback to signature acoustic chime so sound is ALWAYS audible
            playNotificationRingtone('harmonic_chime', durationSeconds, volume);
          });
      }
      return;
    } catch {
      // Failed playing custom audio, falling back to procedural synthesizer
    }
  }

  // High-Fidelity Web Audio Synthesizer Engine with Master Compression & Rich Layering
  try {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Dynamic Master Compressor & Limiter to ensure maximum clarity and audibility without clipping
    const masterCompressor = ctx.createDynamicsCompressor();
    masterCompressor.threshold.setValueAtTime(-14, ctx.currentTime);
    masterCompressor.knee.setValueAtTime(8, ctx.currentTime);
    masterCompressor.ratio.setValueAtTime(5, ctx.currentTime);
    masterCompressor.attack.setValueAtTime(0.003, ctx.currentTime);
    masterCompressor.release.setValueAtTime(0.12, ctx.currentTime);
    masterCompressor.connect(ctx.destination);

    const masterGain = ctx.createGain();
    // Strong, clear output gain level (0.1 to 1.0 calibrated)
    const safeVolume = Math.max(0.15, Math.min(1.0, volume * 0.95));
    masterGain.gain.setValueAtTime(safeVolume, ctx.currentTime);
    masterGain.connect(masterCompressor);

    // Save active ringtone gain node for instantaneous clean mute/stop
    activeRingtoneGainNode = masterGain;

    const startTime = ctx.currentTime + 0.02;

    // Helper to play a rich synthesizer note with natural ADSR curve
    const playNote = (
      freq: number,
      time: number,
      duration: number,
      type: OscillatorType = 'sine',
      gainLevel = 0.5,
      detune = 0
    ) => {
      if (time >= startTime + durationSeconds) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, time);
        if (detune !== 0) {
          osc.detune.setValueAtTime(detune, time);
        }

        // Smooth natural ADSR envelope
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(gainLevel, time + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(time);
        osc.stop(time + duration + 0.08);

        activeOscillators.push(osc);
      } catch {
        // Ignored
      }
    };

    // Helper for playing rich dual-oscillator acoustic chords
    const playChord = (
      frequencies: number[],
      time: number,
      duration: number,
      type: OscillatorType = 'triangle',
      gainLevel = 0.45
    ) => {
      frequencies.forEach((freq) => {
        playNote(freq, time, duration, type, gainLevel / frequencies.length);
        playNote(freq * 1.003, time, duration, 'sine', (gainLevel / frequencies.length) * 0.7, 4);
      });
    };

    // Synthesizer preset sound engines
    switch (sound) {
      // 1. BEETHOVEN: Ode to Joy (Beethoven's 9th)
      case 'beethoven_ode': {
        const loopLen = 3.8;
        const loops = Math.max(1, Math.ceil(durationSeconds / loopLen));
        const melody = [
          { f: 329.63, d: 0.22 }, // E4
          { f: 329.63, d: 0.22 }, // E4
          { f: 349.23, d: 0.22 }, // F4
          { f: 392.0, d: 0.35 },  // G4
          { f: 392.0, d: 0.22 },  // G4
          { f: 349.23, d: 0.22 }, // F4
          { f: 329.63, d: 0.22 }, // E4
          { f: 293.66, d: 0.35 }, // D4
          { f: 261.63, d: 0.22 }, // C4
          { f: 261.63, d: 0.22 }, // C4
          { f: 293.66, d: 0.22 }, // D4
          { f: 329.63, d: 0.35 }, // E4
          { f: 329.63, d: 0.3 },  // E4
          { f: 293.66, d: 0.15 }, // D4
          { f: 293.66, d: 0.45 }, // D4
        ];
        for (let l = 0; l < loops; l++) {
          let currTime = startTime + l * loopLen;
          melody.forEach((note) => {
            playNote(note.f, currTime, note.d * 1.35, 'triangle', 0.55);
            playNote(note.f * 2, currTime, note.d * 1.15, 'sine', 0.35);
            if (currTime % 0.8 < 0.25) {
              playNote(note.f / 2, currTime, 0.45, 'sine', 0.4);
            }
            currTime += note.d + 0.04;
          });
        }
        break;
      }

      // 2. VIVALDI: Spring (Four Seasons)
      case 'vivaldi_spring': {
        const loopLen = 3.2;
        const loops = Math.max(1, Math.ceil(durationSeconds / loopLen));
        const notes = [
          { f: 659.25, d: 0.35 }, // E5
          { f: 830.61, d: 0.18 }, // G#5
          { f: 830.61, d: 0.18 }, // G#5
          { f: 830.61, d: 0.35 }, // G#5
          { f: 739.99, d: 0.18 }, // F#5
          { f: 659.25, d: 0.18 }, // E5
          { f: 987.77, d: 0.45 }, // B5
          { f: 830.61, d: 0.35 }, // G#5
          { f: 659.25, d: 0.4 },  // E5
        ];
        for (let l = 0; l < loops; l++) {
          let curr = startTime + l * loopLen;
          notes.forEach((n) => {
            playNote(n.f, curr, n.d * 1.25, 'sawtooth', 0.38);
            playNote(n.f, curr, n.d * 1.45, 'sine', 0.48);
            playNote(n.f / 2, curr, n.d * 1.5, 'triangle', 0.3);
            curr += n.d + 0.03;
          });
        }
        break;
      }

      // 3. MOZART: Eine Kleine Nachtmusik
      case 'mozart_allegro': {
        const loopLen = 3.4;
        const loops = Math.max(1, Math.ceil(durationSeconds / loopLen));
        const notes = [
          { f: 392.0, d: 0.28 },  // G4
          { f: 293.66, d: 0.15 }, // D4
          { f: 392.0, d: 0.28 },  // G4
          { f: 293.66, d: 0.15 }, // D4
          { f: 392.0, d: 0.15 },  // G4
          { f: 293.66, d: 0.15 }, // D4
          { f: 392.0, d: 0.2 },   // G4
          { f: 493.88, d: 0.2 },  // B4
          { f: 587.33, d: 0.45 }, // D5
          { f: 523.25, d: 0.25 }, // C5
          { f: 440.0, d: 0.15 },  // A4
          { f: 523.25, d: 0.25 }, // C5
          { f: 440.0, d: 0.15 },  // A4
          { f: 392.0, d: 0.5 },   // G4
        ];
        for (let l = 0; l < loops; l++) {
          let curr = startTime + l * loopLen;
          notes.forEach((n) => {
            playNote(n.f, curr, n.d * 1.25, 'triangle', 0.52);
            playNote(n.f * 2, curr, n.d * 0.95, 'sine', 0.3);
            curr += n.d + 0.03;
          });
        }
        break;
      }

      // 4. PACHELBEL'S CANON IN D
      case 'canon_in_d': {
        const loopLen = 3.6;
        const loops = Math.max(1, Math.ceil(durationSeconds / loopLen));
        const canonNotes = [
          { f: 587.33, bass: 293.66, d: 0.4 }, // D5 (D4 bass)
          { f: 554.37, bass: 220.0, d: 0.4 },  // C#5 (A3 bass)
          { f: 493.88, bass: 246.94, d: 0.4 }, // B4 (B3 bass)
          { f: 440.0, bass: 185.0, d: 0.4 },   // A4 (F#3 bass)
          { f: 392.0, bass: 196.0, d: 0.4 },   // G4 (G3 bass)
          { f: 369.99, bass: 146.83, d: 0.4 }, // F#4 (D3 bass)
          { f: 392.0, bass: 196.0, d: 0.4 },   // G4 (G3 bass)
          { f: 440.0, bass: 220.0, d: 0.5 },   // A4 (A3 bass)
        ];
        for (let l = 0; l < loops; l++) {
          let curr = startTime + l * loopLen;
          canonNotes.forEach((n) => {
            playNote(n.f, curr, 0.7, 'sine', 0.55);
            playNote(n.bass, curr, 0.75, 'triangle', 0.45);
            playNote(n.f * 1.5, curr + 0.1, 0.45, 'sine', 0.25);
            curr += n.d;
          });
        }
        break;
      }

      // 5. TIBETAN SINGING BOWL (432Hz)
      case 'zen_singing_bowl': {
        const loopLen = 2.4;
        const loops = Math.max(1, Math.ceil(durationSeconds / loopLen));
        for (let l = 0; l < loops; l++) {
          const off = startTime + l * loopLen;
          playNote(432, off, 2.3, 'sine', 0.65);
          playNote(436, off, 2.3, 'sine', 0.45); // Binaural +4Hz Theta beat
          playNote(216, off, 2.4, 'sine', 0.55); // Sub-harmonic gong body
          playNote(1296, off + 0.05, 1.8, 'sine', 0.2); // High crystal overtone
          playNote(864, off + 0.02, 2.0, 'sine', 0.3); // Mid shimmer
        }
        break;
      }

      // 6. LO-FI DREAMY CHILL HOP
      case 'lofi_chill': {
        const loopLen = 3.2;
        const loops = Math.max(1, Math.ceil(durationSeconds / loopLen));
        const chords = [
          [261.63, 329.63, 392.0, 493.88], // Cmaj7
          [220.0, 261.63, 329.63, 392.0],  // Am7
          [293.66, 349.23, 440.0, 523.25], // Dm7
          [196.0, 246.94, 293.66, 349.23], // G7
        ];
        for (let l = 0; l < loops; l++) {
          chords.forEach((chord, idx) => {
            const chordTime = startTime + l * loopLen + idx * 0.75;
            playChord(chord, chordTime, 0.75, 'triangle', 0.55);
            playNote(chord[3] * 1.5, chordTime + 0.15, 0.5, 'sine', 0.35);
            playNote(chord[2] * 2, chordTime + 0.4, 0.35, 'sine', 0.3);
          });
        }
        break;
      }

      // 7. OCEAN WAVES & ZEN BAMBOO FLUTE
      case 'ocean_breeze': {
        const loopLen = 2.8;
        const loops = Math.max(1, Math.ceil(durationSeconds / loopLen));
        const fluteNotes = [440, 523.25, 587.33, 659.25, 783.99, 880];
        for (let l = 0; l < loops; l++) {
          const off = startTime + l * loopLen;
          playNote(fluteNotes[0], off, 0.85, 'sine', 0.5);
          playNote(fluteNotes[2], off + 0.35, 0.75, 'sine', 0.5);
          playNote(fluteNotes[3], off + 0.75, 0.95, 'sine', 0.55);
          playNote(fluteNotes[5], off + 1.2, 1.25, 'sine', 0.45);
          playNote(130.81, off, 2.6, 'triangle', 0.25);
          playNote(261.63, off, 2.4, 'sine', 0.25);
        }
        break;
      }

      // 8. TROPICAL MARIMBA BREEZE
      case 'marimba_island': {
        const loopLen = 2.4;
        const loops = Math.max(1, Math.ceil(durationSeconds / loopLen));
        const marimbaNotes = [
          { f: 523.25, t: 0.0 },  // C5
          { f: 659.25, t: 0.18 }, // E5
          { f: 783.99, t: 0.36 }, // G5
          { f: 880.0, t: 0.54 },  // A5
          { f: 1046.5, t: 0.72 }, // C6
          { f: 880.0, t: 0.95 },  // A5
          { f: 783.99, t: 1.15 }, // G5
          { f: 659.25, t: 1.4 },  // E5
          { f: 523.25, t: 1.7 },  // C5
        ];
        for (let l = 0; l < loops; l++) {
          marimbaNotes.forEach((n) => {
            const noteTime = startTime + l * loopLen + n.t;
            playNote(n.f, noteTime, 0.32, 'triangle', 0.65);
            playNote(n.f * 3, noteTime, 0.09, 'sine', 0.35);
          });
        }
        break;
      }

      // 9. ACOUSTIC GUITAR REVERIE
      case 'acoustic_strum': {
        const loopLen = 2.6;
        const loops = Math.max(1, Math.ceil(durationSeconds / loopLen));
        const patterns = [
          { bass: 164.81, notes: [329.63, 392.0, 493.88, 659.25] }, // Em
          { bass: 220.0, notes: [349.23, 440.0, 523.25, 698.46] },  // F
          { bass: 196.0, notes: [392.0, 493.88, 587.33, 783.99] },  // G
        ];
        for (let l = 0; l < loops; l++) {
          patterns.forEach((pat, pIdx) => {
            const pTime = startTime + l * loopLen + pIdx * 0.82;
            playNote(pat.bass, pTime, 0.8, 'triangle', 0.55);
            pat.notes.forEach((nf, nIdx) => {
              playNote(nf, pTime + (nIdx + 1) * 0.12, 0.6, 'sine', 0.45);
            });
          });
        }
        break;
      }

      // 10. 80s RETRO SYNTHWAVE
      case 'synthwave_neon': {
        const loopLen = 2.0;
        const loops = Math.max(1, Math.ceil(durationSeconds / loopLen));
        const synthNotes = [
          { f: 440, t: 0.0 },   // A4
          { f: 554.37, t: 0.2 },// C#5
          { f: 659.25, t: 0.4 },// E5
          { f: 880, t: 0.6 },   // A5
          { f: 739.99, t: 0.8 },// F#5
          { f: 659.25, t: 1.1 },// E5
          { f: 554.37, t: 1.3 },// C#5
          { f: 440, t: 1.5 },   // A4
        ];
        for (let l = 0; l < loops; l++) {
          const base = startTime + l * loopLen;
          synthNotes.forEach((sn) => {
            playNote(sn.f, base + sn.t, 0.24, 'sawtooth', 0.45);
            playNote(sn.f / 2, base + sn.t, 0.22, 'square', 0.25);
          });
          for (let b = 0; b < 8; b++) {
            playNote(110, base + b * 0.24, 0.18, 'sawtooth', 0.35);
          }
        }
        break;
      }

      // 11. STARLIGHT COSMIC AMBIENT PAD
      case 'cosmic_ambient': {
        const loopLen = 3.0;
        const loops = Math.max(1, Math.ceil(durationSeconds / loopLen));
        const spaceChords = [
          [293.66, 369.99, 440.0, 554.37], // Dmaj7
          [246.94, 293.66, 369.99, 440.0], // Bm7
          [196.0, 246.94, 293.66, 369.99],  // Gmaj7
        ];
        for (let l = 0; l < loops; l++) {
          spaceChords.forEach((chord, cIdx) => {
            const cTime = startTime + l * loopLen + cIdx * 0.95;
            playChord(chord, cTime, 0.95, 'sine', 0.65);
            playNote(chord[2] * 4, cTime + 0.3, 0.45, 'sine', 0.2);
            playNote(chord[3] * 4, cTime + 0.6, 0.45, 'sine', 0.2);
          });
        }
        break;
      }

      // 12. SOFT NURSE CALL CHIME
      case 'nurse_call_soft': {
        const loopLen = 1.6;
        const loops = Math.max(1, Math.ceil(durationSeconds / loopLen));
        for (let l = 0; l < loops; l++) {
          const off = startTime + l * loopLen;
          playNote(587.33, off, 0.75, 'sine', 0.55);
          playNote(880.0, off + 0.2, 1.15, 'sine', 0.65);
          playNote(1174.66, off + 0.2, 0.95, 'sine', 0.3);
        }
        break;
      }

      // 13. ZEN MEDITATION BELL (528Hz)
      case 'gentle_bell': {
        const loopLen = 1.8;
        const loops = Math.max(1, Math.ceil(durationSeconds / loopLen));
        for (let l = 0; l < loops; l++) {
          const off = startTime + l * loopLen;
          playNote(528, off, 1.7, 'sine', 0.7);
          playNote(1056, off, 1.3, 'triangle', 0.35);
          playNote(1584, off, 0.9, 'sine', 0.2);
        }
        break;
      }

      // 14. CLINICAL PAGER
      case 'clinical_pager': {
        const loopLen = 0.65;
        const loops = Math.max(1, Math.ceil(durationSeconds / loopLen));
        for (let l = 0; l < loops; l++) {
          const off = startTime + l * loopLen;
          for (let p = 0; p < 3; p++) {
            playNote(987.77, off + p * 0.13, 0.09, 'sine', 0.7);
            playNote(1975.5, off + p * 0.13, 0.07, 'triangle', 0.4);
          }
        }
        break;
      }

      // 15. SOOTHING HARP
      case 'soothing_harp': {
        const loopLen = 1.6;
        const loops = Math.max(1, Math.ceil(durationSeconds / loopLen));
        const notes = [523.25, 659.25, 783.99, 1046.5];
        for (let l = 0; l < loops; l++) {
          const off = startTime + l * loopLen;
          notes.forEach((freq, idx) => {
            playNote(freq, off + idx * 0.16, 0.85, 'sine', 0.55);
            playNote(freq * 2, off + idx * 0.16, 0.6, 'sine', 0.25);
          });
        }
        break;
      }

      // 16. UPLIFTING PULSE
      case 'uplifting_pulse': {
        const loopLen = 1.4;
        const loops = Math.max(1, Math.ceil(durationSeconds / loopLen));
        const notes = [739.99, 932.33, 1108.73, 1396.91];
        for (let l = 0; l < loops; l++) {
          const off = startTime + l * loopLen;
          notes.forEach((freq, idx) => {
            playNote(freq, off + idx * 0.12, 0.55, 'triangle', 0.55);
            playNote(freq * 1.5, off + idx * 0.12, 0.35, 'sine', 0.3);
          });
        }
        break;
      }

      // 17. HARMONIC CHIME (Signature Default)
      case 'harmonic_chime':
      default: {
        const loopLen = 1.3;
        const loops = Math.max(1, Math.ceil(durationSeconds / loopLen));
        for (let l = 0; l < loops; l++) {
          const off = startTime + l * loopLen;
          playNote(587.33, off, 0.75, 'sine', 0.55);
          playNote(880.0, off + 0.15, 0.95, 'sine', 0.65);
          playNote(1318.51, off + 0.3, 0.75, 'sine', 0.4);
          playNote(293.66, off, 0.8, 'triangle', 0.35); // warm acoustic body
        }
        break;
      }
    }

    activeStopTimer = window.setTimeout(() => {
      stopActiveRingtone();
    }, durationSeconds * 1000 + 300);
  } catch (e) {
    console.warn('Audio synthesis error:', e);
  }
}

/**
 * Backward compatible helper for default chime
 */
export function playGentleNotificationChime(): void {
  playNotificationRingtone('harmonic_chime', 2, 0.85);
}

/**
 * Robust Cross-Browser Text-to-Speech Engine
 * Solves Chrome 15-second speech cutoff, Safari voice loading, and mobile audio suspension.
 */
let speechUtteranceQueue: SpeechSynthesisUtterance[] = [];
let speechChunkIndex = 0;
let isSpeakingActive = false;

export function stopSpeakingAloud(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    speechUtteranceQueue = [];
    speechChunkIndex = 0;
    isSpeakingActive = false;
  } catch {
    // Ignored
  }
}

export function speakConsultationAloud(
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: () => void
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onError) onError();
    return false;
  }

  stopSpeakingAloud();

  // Clean markdown tags, code blocks, URLs, and disclaimers for natural clinical recitation
  const cleanText = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[#*`_\[\]()]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/Disclaimer:[\s\S]*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText) {
    if (onEnd) onEnd();
    return false;
  }

  // Split into sentence chunks (~140 chars each) to prevent Chromium 15s freeze bug
  const rawSentences = cleanText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleanText];
  const chunks: string[] = [];
  let buffer = '';

  for (const sentence of rawSentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;
    if (buffer.length + trimmed.length > 140) {
      if (buffer) chunks.push(buffer.trim());
      buffer = trimmed;
    } else {
      buffer = buffer ? `${buffer} ${trimmed}` : trimmed;
    }
  }
  if (buffer) chunks.push(buffer.trim());

  if (chunks.length === 0) {
    if (onEnd) onEnd();
    return false;
  }

  const voices = window.speechSynthesis.getVoices();
  const englishVoice =
    voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Siri'))) ||
    voices.find((v) => v.lang.startsWith('en')) ||
    voices[0];

  speechUtteranceQueue = chunks.map((chunk) => {
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.rate = 1.02;
    utterance.pitch = 1.0;
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
    return utterance;
  });

  speechChunkIndex = 0;
  isSpeakingActive = true;

  if (onStart) onStart();

  const speakNextChunk = () => {
    if (!isSpeakingActive || speechChunkIndex >= speechUtteranceQueue.length) {
      isSpeakingActive = false;
      if (onEnd) onEnd();
      return;
    }

    const currentUtterance = speechUtteranceQueue[speechChunkIndex];
    speechChunkIndex++;

    currentUtterance.onend = () => {
      speakNextChunk();
    };

    currentUtterance.onerror = () => {
      if (isSpeakingActive) {
        speakNextChunk();
      }
    };

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.speak(currentUtterance);
    } catch {
      isSpeakingActive = false;
      if (onError) onError();
    }
  };

  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    speakNextChunk();
    return true;
  } catch (e) {
    console.warn('Speech synthesis speak failed:', e);
    if (onError) onError();
    return false;
  }
}

export interface ReminderContent {
  title: string;
  body: string;
  actionText: string;
  secondaryActionText: string;
  reminderType: NotificationReminderType;
}

export function getReminderContent(
  type: NotificationReminderType,
  userName: string = 'User'
): ReminderContent {
  switch (type) {
    case 'medications':
      return {
        title: `Medtrack: Medication & Prescription Dose Reminder 💊`,
        body: `Hi ${userName}, it's time for your scheduled medication dose. Please take your prescribed medicine with a glass of water as directed by your doctor.`,
        actionText: 'View Medicines',
        secondaryActionText: 'Mark Taken',
        reminderType: 'medications',
      };
    case 'hydration':
      return {
        title: `Medtrack: Hydration & Movement Break 💧`,
        body: `Hi ${userName}, remember to drink a glass of water (target ~2.5L daily) and take a 3-minute walking micro-break to reduce physical strain and boost energy.`,
        actionText: 'Log Water (250ml)',
        secondaryActionText: 'Dismiss',
        reminderType: 'hydration',
      };
    case 'metrics':
      return {
        title: `Medtrack: Daily Health Metrics Check-in 📊`,
        body: `Hi ${userName}, take 30 seconds to log today's weight, sleep, hydration, and activity in Medtrack to keep your health baseline accurate.`,
        actionText: 'Log Metrics Now',
        secondaryActionText: 'Remind Later',
        reminderType: 'metrics',
      };
    case 'consultation_summary':
      return {
        title: `Medtrack: Clinical Review Reminder 📑`,
        body: `Hi ${userName}, review your Medtrack physician consultation summary and doctor discussion points before your next clinical visit.`,
        actionText: 'Review Brief',
        secondaryActionText: 'Dismiss',
        reminderType: 'consultation_summary',
      };
    case 'both':
    default:
      return {
        title: `Medtrack: Daily Health & Consultation Check-in 🌿`,
        body: `Hi ${userName}, remember to track your daily biometrics and review your physician consultation notes to maintain proactive wellness.`,
        actionText: 'Log Metrics',
        secondaryActionText: 'Review Brief',
        reminderType: 'both',
      };
  }
}

/**
 * Triggers a browser native notification if permitted and plays configured notification sound
 */
export function dispatchBrowserNotification(
  content: ReminderContent,
  onClick?: () => void,
  playSound = false
): boolean {
  // Flash document title for visual awareness even if browser notifications are blocked or tab is in background
  flashDocumentTitle(`🔔 ${content.title}`);

  // Audible notification ringtone playback if explicitly requested
  if (playSound) {
    try {
      const settings = getStoredNotificationSettings();
      if (settings.soundEnabled !== false) {
        playNotificationRingtone(
          settings.ringtoneSound || 'harmonic_chime',
          settings.ringtoneDuration || 4,
          settings.ringtoneVolume ?? 0.85,
          settings.customAudioUrl
        );
      }
    } catch (e) {
      console.warn('Could not play notification audio:', e);
    }
  }

  if (!isBrowserNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    const notification = new Notification(content.title, {
      body: content.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'medtrack-daily-reminder',
      requireInteraction: true,
    });

    notification.onclick = (e) => {
      e.preventDefault();
      window.focus();
      if (onClick) onClick();
      notification.close();
    };

    return true;
  } catch (e) {
    console.error('Error dispatching browser notification:', e);
    return false;
  }
}
