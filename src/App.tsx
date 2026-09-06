import React, { useState, useEffect, useRef } from 'react';
import {
  UserProfile,
  ConsultationMessage,
  AttachmentItem,
  TriageLevel,
  AuthUser,
  NotificationSettings,
  ChatSession,
} from './types';
import { safeLocalStorageGet, safeLocalStorageSet, safeLocalStorageRemove } from './utils/safeStorage';
import { PRESET_PROFILES } from './utils/healthCalculators';
import {
  getStoredChatSessions,
  saveChatSessions,
  generateSessionTitle,
  createNewSession,
} from './utils/sessionStorage';
import {
  getStoredNotificationSettings,
  saveNotificationSettings,
  getReminderContent,
  dispatchBrowserNotification,
  playNotificationRingtone,
  playGentleNotificationChime,
  stopActiveRingtone,
  setupBrowserAudioPolicyUnlock,
  ReminderContent,
} from './utils/notifications';
import { Header } from './components/Header';
import { ChatHistorySidebar } from './components/ChatHistorySidebar';
import { EmergencyBanner } from './components/EmergencyBanner';
import { ConsultationFeed } from './components/ConsultationFeed';
import { InputToolbar } from './components/InputToolbar';
import { ProfileModal } from './components/ProfileModal';
import { SampleScenariosModal } from './components/SampleScenariosModal';
import { ClinicalBriefModal } from './components/ClinicalBriefModal';
import { AuthModal } from './components/AuthModal';
import { GoogleAuthModal } from './components/GoogleAuthModal';
import { ReminderSettingsModal } from './components/ReminderSettingsModal';
import { ReminderToast } from './components/ReminderToast';
import { TesterHubModal } from './components/TesterHubModal';
import { OpeningScreen } from './components/OpeningScreen';
import { PharmacyLocatorModal } from './components/PharmacyLocatorModal';
import { NotificationBar } from './components/NotificationBar';
import { DoctorDashboard } from './components/DoctorDashboard';
import { PatientDashboard } from './components/PatientDashboard';
import { PatientManagement } from './components/PatientManagement';
import { AppointmentsView } from './components/AppointmentsView';
import { MapsView } from './components/MapsView';
import { FloatingAssistant } from './components/FloatingAssistant';
import { NewPatientModal } from './components/NewPatientModal';
import { NewAppointmentModal } from './components/NewAppointmentModal';
import { NotificationsCenterModal } from './components/NotificationsCenterModal';

export default function App() {
  // Authentication user state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const saved = safeLocalStorageGet('medtrack_auth_user') || safeLocalStorageGet('pulsehealth_auth_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse saved auth user:', e);
      }
    }
    return null;
  });

  // Local storage state initialization
  const [currentProfile, setCurrentProfile] = useState<UserProfile>(() => {
    const saved = safeLocalStorageGet('medtrack_profile') || safeLocalStorageGet('pulsehealth_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse saved profile:', e);
      }
    }
    return PRESET_PROFILES[0]; // Alex Rivera default
  });

  // Chat Sessions and History Management
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => getStoredChatSessions());
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const sessions = getStoredChatSessions();
    return sessions[0]?.id || 'session_default';
  });

  const [messages, setMessages] = useState<ConsultationMessage[]>(() => {
    const sessions = getStoredChatSessions();
    const active = sessions[0];
    if (active && active.messages && active.messages.length > 0) {
      return active.messages;
    }
    const saved = safeLocalStorageGet('medtrack_messages') || safeLocalStorageGet('pulsehealth_messages');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse saved messages:', e);
      }
    }
    return [];
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  // Notification and daily reminder settings
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(() =>
    getStoredNotificationSettings()
  );
  const [isReminderSettingsOpen, setIsReminderSettingsOpen] = useState(false);
  const [activeReminderToast, setActiveReminderToast] = useState<ReminderContent | null>(null);

  // Dark mode state management with localStorage & system preference fallback
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = safeLocalStorageGet('medtrack_dark_mode') || safeLocalStorageGet('pulsehealth_dark_mode');
    if (saved !== null) {
      return saved === 'true';
    }
    return (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isEmergencyBannerOpen, setIsEmergencyBannerOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSampleScenariosOpen, setIsSampleScenariosOpen] = useState(false);
  const [isClinicalBriefOpen, setIsClinicalBriefOpen] = useState(false);
  const [isTesterHubOpen, setIsTesterHubOpen] = useState(false);
  const [isPharmacyModalOpen, setIsPharmacyModalOpen] = useState(false);
  const [pharmacyInitialMeds, setPharmacyInitialMeds] = useState<string[]>([]);
  
  // Front-end opening welcome screen with custom logo - starts with app image & all capabilities
  const [isOpeningScreenOpen, setIsOpeningScreenOpen] = useState<boolean>(true);

  // When user opens website, ask to login or sign in if not authenticated
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState<boolean>(false);

  // Active page navigation state ('dashboard', 'patients', 'appointments', 'consultation', 'maps')
  const [activePage, setActivePage] = useState<string>('dashboard');
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState<boolean>(false);
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState<boolean>(false);
  const [isNotificationsCenterOpen, setIsNotificationsCenterOpen] = useState<boolean>(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);

  // Apply dark mode class to document element and persist in localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    safeLocalStorageSet('medtrack_dark_mode', darkMode ? 'true' : 'false');
  }, [darkMode]);

  // Sync to local storage
  useEffect(() => {
    if (currentUser) {
      safeLocalStorageSet('medtrack_auth_user', JSON.stringify(currentUser));
    } else {
      safeLocalStorageRemove('medtrack_auth_user');
      safeLocalStorageRemove('pulsehealth_auth_user');
    }
  }, [currentUser]);

  // Set up global browser audio policy unlocking for autoplay compliance
  useEffect(() => {
    const cleanupAudioUnlock = setupBrowserAudioPolicyUnlock();
    return cleanupAudioUnlock;
  }, []);

  useEffect(() => {
    safeLocalStorageSet('medtrack_profile', JSON.stringify(currentProfile));
  }, [currentProfile]);

  // Auto-sync active session with messages
  useEffect(() => {
    setChatSessions((prevSessions) => {
      const existingIndex = prevSessions.findIndex((s) => s.id === activeSessionId);
      if (existingIndex >= 0) {
        const existing = prevSessions[existingIndex];
        const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant');
        const updatedSession: ChatSession = {
          ...existing,
          messages,
          updatedAt: new Date().toISOString(),
          triageLevel: lastAssistantMsg?.triageLevel || existing.triageLevel,
          title:
            (existing.title === 'New Consultation' || !existing.title) && messages.length > 0
              ? generateSessionTitle(messages[0].content)
              : existing.title,
        };
        const newSessions = [...prevSessions];
        newSessions[existingIndex] = updatedSession;
        saveChatSessions(newSessions);
        return newSessions;
      } else if (messages.length > 0) {
        const newSession: ChatSession = {
          id: activeSessionId,
          title: generateSessionTitle(messages[0].content),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages,
          triageLevel: messages.find((m) => m.triageLevel)?.triageLevel,
          profileName: currentProfile.name,
        };
        const newSessions = [newSession, ...prevSessions];
        saveChatSessions(newSessions);
        return newSessions;
      }
      return prevSessions;
    });

    // Also persist simple messages fallback
    try {
      const lightweightMsgs = messages.slice(-20).map((msg) => ({
        ...msg,
        attachments: msg.attachments?.map((att) => ({
          ...att,
          data: typeof att.data === 'string' && att.data.length > 10000 ? '' : att.data,
          previewUrl: typeof att.previewUrl === 'string' && att.previewUrl.length > 10000 ? '' : att.previewUrl,
        })),
      }));
      safeLocalStorageSet('medtrack_messages', JSON.stringify(lightweightMsgs));
    } catch (e) {
      console.warn('Could not persist messages to localStorage:', e);
    }
  }, [messages, activeSessionId, currentProfile.name]);

  useEffect(() => {
    saveNotificationSettings(notificationSettings);
  }, [notificationSettings]);

  // Stable refs for background reminder tickers to prevent dependency loop re-renders
  const notificationSettingsRef = useRef<NotificationSettings>(notificationSettings);
  notificationSettingsRef.current = notificationSettings;

  const currentProfileRef = useRef<UserProfile>(currentProfile);
  currentProfileRef.current = currentProfile;

  const lastTriggerMinuteRef = useRef<string>('');

  // Background ticker loop for scheduled daily health reminders
  useEffect(() => {
    if (!notificationSettings.enabled) return;

    const checkReminderSchedule = () => {
      const settings = notificationSettingsRef.current;
      if (!settings.enabled) return;

      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${hh}:${mm}`;
      const todayDateStr = now.toISOString().split('T')[0];
      const currentMinuteKey = `${todayDateStr}_${currentTimeStr}`;

      const targetTimes = [
        settings.time || '09:00',
        ...(settings.scheduleSlots || []),
      ];

      const isScheduledMatch = targetTimes.includes(currentTimeStr);

      if (
        isScheduledMatch &&
        lastTriggerMinuteRef.current !== currentMinuteKey &&
        settings.lastTriggeredDate !== currentMinuteKey
      ) {
        lastTriggerMinuteRef.current = currentMinuteKey;

        const profileName = currentProfileRef.current?.name || 'User';
        const content = getReminderContent(
          settings.reminderType || 'both',
          profileName
        );

        // Trigger browser native notification
        dispatchBrowserNotification(content, () => {
          if (content.reminderType === 'metrics') {
            setIsProfileModalOpen(true);
          } else {
            setIsClinicalBriefOpen(true);
          }
        });

        // Trigger in-app interactive toast
        setActiveReminderToast(content);

        // Sound selected ringtone / music if enabled
        if (settings.soundEnabled) {
          playNotificationRingtone(
            settings.ringtoneSound || 'harmonic_chime',
            settings.ringtoneDuration || 4,
            settings.ringtoneVolume ?? 0.85,
            settings.customAudioUrl
          );
        }

        // Save lastTriggeredDate without infinite re-render loop
        setNotificationSettings((prev) => ({
          ...prev,
          lastTriggeredDate: currentMinuteKey,
        }));
      }
    };

    checkReminderSchedule();
    const timer = setInterval(checkReminderSchedule, 10000);
    return () => clearInterval(timer);
  }, [notificationSettings.enabled, notificationSettings.time]);

  const handleTriggerTestNotification = (customSettings?: NotificationSettings) => {
    const config = customSettings || notificationSettings;
    const content = getReminderContent(config.reminderType, currentProfile.name);

    // Dispatch native browser notification
    dispatchBrowserNotification(content, () => {
      if (content.reminderType === 'metrics') {
        setIsProfileModalOpen(true);
      } else {
        setIsClinicalBriefOpen(true);
      }
    });

    // Display in-app toast preview
    setActiveReminderToast(content);

    // Sound selected ringtone / custom audio if enabled
    if (config.soundEnabled) {
      playNotificationRingtone(
        config.ringtoneSound || 'harmonic_chime',
        config.ringtoneDuration || 4,
        config.ringtoneVolume ?? 0.8,
        config.customAudioUrl
      );
    }
  };

  const handleSnooze = (minutes: number) => {
    setActiveReminderToast(null);
    stopActiveRingtone();
    setTimeout(() => {
      const content = getReminderContent(
        notificationSettings.reminderType,
        currentProfile.name
      );
      setActiveReminderToast(content);
      if (notificationSettings.soundEnabled) {
        playNotificationRingtone(
          notificationSettings.ringtoneSound || 'harmonic_chime',
          notificationSettings.ringtoneDuration || 4,
          notificationSettings.ringtoneVolume ?? 0.8,
          notificationSettings.customAudioUrl
        );
      }
    }, minutes * 60 * 1000);
  };

  // Fetch unread notifications count whenever user changes or notifications center is toggled
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('medtrack_token') : null;
        if (!token) return;
        const res = await fetch('/api/notifications', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const unread = (data.notifications || []).filter((n: any) => !n.is_read).length;
          setUnreadNotificationsCount(unread);
        }
      } catch (e) {
        console.warn('Failed to load notifications count:', e);
      }
    };

    fetchUnreadCount();
  }, [currentUser, isNotificationsCenterOpen]);

  // Unified application-wide navigation handler
  const handleNavigate = (page: string) => {
    if (page === 'profile') {
      setIsProfileModalOpen(true);
      return;
    }
    if (page === 'notifications') {
      setIsNotificationsCenterOpen(true);
      return;
    }
    if (page === 'reminders' || page === 'settings') {
      setIsReminderSettingsOpen(true);
      return;
    }
    if (page === 'brief') {
      setIsClinicalBriefOpen(true);
      return;
    }
    if (page === 'pharmacy') {
      setPharmacyInitialMeds(currentProfile.healthHistory.currentMedications || []);
      setIsPharmacyModalOpen(true);
      return;
    }
    setActivePage(page);
  };

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    // Sync authenticated user's name into profile
    setCurrentProfile((prev) => ({
      ...prev,
      name: user.name || prev.name,
    }));
    setIsAuthModalOpen(false);
    setActivePage('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('medtrack_auth_user');
    localStorage.removeItem('pulsehealth_auth_user');
    localStorage.removeItem('medtrack_token');
    setActivePage('dashboard');
    setIsAuthModalOpen(true);
  };

  // Clear cache and reset local storage state
  const handleClearCache = () => {
    localStorage.removeItem('medtrack_profile');
    localStorage.removeItem('medtrack_messages');
    localStorage.removeItem('medtrack_auth_user');
    localStorage.removeItem('medtrack_notification_settings');
    localStorage.removeItem('pulsehealth_profile');
    localStorage.removeItem('pulsehealth_messages');
    localStorage.removeItem('pulsehealth_auth_user');
    localStorage.removeItem('pulsehealth_notification_settings');
    setCurrentProfile({ ...PRESET_PROFILES[0] });
    setMessages([]);
    setCurrentUser(null);
    setNotificationSettings(getStoredNotificationSettings());
  };

  // Force data refresh & biometric calculation sync
  const handleDataRefresh = () => {
    setCurrentProfile((prev) => {
      const updated = { ...prev };
      localStorage.setItem('medtrack_profile', JSON.stringify(updated));
      return updated;
    });
  };

  // Handle new message consultation
  const handleSendMessage = async (text: string, attachments: AttachmentItem[] = []) => {
    const userMessageId = `msg_user_${Date.now()}`;
    const userMsg: ConsultationMessage = {
      id: userMessageId,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setIsLoading(true);

    try {
      // Check if we have specialized attachments (lab report vs rash) to run parallel extraction
      const imageAttachment = attachments.find((a) => a.type === 'image' || a.category === 'rash');
      const documentAttachment = attachments.find(
        (a) => a.type === 'document' || a.category === 'lab_report'
      );

      // Execute main consultation, vision prescreening, and biomarker analysis in PARALLEL with safe parsing
      const consultPayload = {
        userProfile: currentProfile,
        message: text,
        attachments,
        chatHistory: newHistory.map((m) => ({ role: m.role, content: m.content })),
      };

      // Safe fallback builder if network or server is temporarily unavailable
      const getEmergencyOrFallbackAssessment = (symptomText: string, profile: UserProfile) => {
        const lower = (symptomText || '').toLowerCase();
        const isEmerg =
          lower.includes('chest pain') ||
          lower.includes('crushing') ||
          lower.includes('shortness of breath') ||
          lower.includes('stroke') ||
          lower.includes('slurred speech') ||
          lower.includes('facial droop') ||
          lower.includes('severe bleeding');

        const age = profile?.demographics?.age || 30;
        const profession = profile?.demographics?.profession || 'Desk Professional';
        const allergies = profile?.healthHistory?.allergies?.join(', ') || 'None reported';
        const conditions = profile?.healthHistory?.knownConditions?.join(', ') || 'None reported';

        if (isEmerg) {
          return {
            triageLevel: 'Level 4: Critical Emergency',
            text: `🚨 **LEVEL 4: CRITICAL MEDICAL EMERGENCY — CALL LOCAL EMERGENCY SERVICES IMMEDIATELY (911 / 112 / 108)**\n\n### Immediate Life-Safety Protocol\n- **Action Required:** Do NOT drive yourself. Call local emergency services immediately or have someone transport you to the nearest Emergency Department.\n- **Patient Baseline:** Age ${age}, History: ${conditions}, Allergies: ${allergies}.\n- **Immediate Steps:** Sit upright in a comfortable position, stay calm, and unlock your door for responders.`,
            sources: [
              { title: 'Mayo Clinic: Emergency Signs & Symptoms', uri: 'https://www.mayoclinic.org' },
              { title: 'CDC: Recognize Stroke & Heart Attack Signs', uri: 'https://www.cdc.gov' },
            ],
          };
        }

        const isUrgent =
          lower.includes('fever') ||
          lower.includes('rash') ||
          lower.includes('infection') ||
          lower.includes('severe pain') ||
          lower.includes('swelling');
        const triageLevel = isUrgent ? 'Level 3: Urgent Care within 24 Hours' : 'Level 2: Routine Consultation';

        return {
          triageLevel,
          text: `### 1. Personalized Triage & Assessment\n- **Triage Level:** ${triageLevel}\n- **Preliminary Assessment:** Based on your reported symptoms (*"${symptomText || 'General Consultation'}"*) and baseline profile (${age}y, Profession: ${profession}, Known Allergies: ${allergies}), your presentation warrants close clinical observation and evidence-based self-care.\n\n### 2. Tailored Lifestyle & Ergonomic Recommendations\n- Maintain adequate hydration (${profile?.lifestyle?.waterIntakeLiters || 2.5}L water daily) and ensure 7–8 hours of restorative sleep.\n- For your daily baseline as a ${profession}, schedule 5-minute movement micro-breaks.\n\n### 3. Medical Education & Authoritative Evidence\n- Consult verified evidence-based health resources from the CDC, Mayo Clinic, and NIH MedlinePlus.\n\n### 4. Over-The-Counter (OTC) & Home Care Guidance\n- Confirm that any OTC measures or symptom relief products are compatible with your health history and allergies (${allergies}). Consult your pharmacist or doctor for specific dosing.\n\n### 5. Recommended Doctor Specialties & Next Steps\n- **Specialist:** Primary Care Physician / General Practitioner.\n- **Questions for Your Doctor:**\n  1. *"Could my work posture or daily routine be contributing to these symptoms?"*\n  2. *"Are routine blood panels or screenings recommended for my age group (${age})?"*`,
          sources: [
            { title: 'NIH MedlinePlus Encyclopedia', uri: 'https://medlineplus.gov' },
            { title: 'CDC Public Health Guidelines', uri: 'https://www.cdc.gov' },
            { title: 'Mayo Clinic Clinical Reference', uri: 'https://www.mayoclinic.org' },
          ],
        };
      };

      const executeConsult = async () => {
        try {
          const res = await fetch('/api/consult', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(consultPayload),
          });

          const rawText = await res.text();
          let data: any = null;
          try {
            data = JSON.parse(rawText);
          } catch {
            console.warn('Non-JSON response from /api/consult:', rawText);
          }

          if (data && data.success && data.text) {
            return data;
          }

          // Generate fallback if server returned error
          const fallback = getEmergencyOrFallbackAssessment(text, currentProfile);
          return {
            success: true,
            text: fallback.text,
            triageLevel: fallback.triageLevel,
            sources: fallback.sources,
          };
        } catch (netErr: any) {
          console.warn('Network error reaching consultation API, using clinical protocols:', netErr);
          const fallback = getEmergencyOrFallbackAssessment(text, currentProfile);
          return {
            success: true,
            text: fallback.text,
            triageLevel: fallback.triageLevel,
            sources: fallback.sources,
          };
        }
      };

      const executeVision = async () => {
        if (!imageAttachment) return undefined;
        try {
          const res = await fetch('/api/vision-prescreen', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              attachment: imageAttachment,
              symptomNotes: text,
              userProfile: currentProfile,
            }),
          });
          const raw = await res.text();
          try {
            const json = JSON.parse(raw);
            return json?.success && json?.data ? json.data : undefined;
          } catch {
            return undefined;
          }
        } catch {
          return undefined;
        }
      };

      const executeBiomarker = async () => {
        if (!documentAttachment) return undefined;
        try {
          const res = await fetch('/api/extract-biomarkers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              attachment: documentAttachment,
              userProfile: currentProfile,
            }),
          });
          const raw = await res.text();
          try {
            const json = JSON.parse(raw);
            return json?.success && json?.data ? json.data : undefined;
          } catch {
            return undefined;
          }
        } catch {
          return undefined;
        }
      };

      const [consultResult, visionPreScreeningData, biomarkerAnalysisData] = await Promise.all([
        executeConsult(),
        executeVision(),
        executeBiomarker(),
      ]);

      const isEmergency =
        consultResult.triageLevel?.includes('Level 4') ||
        consultResult.text.includes('LEVEL 4') ||
        consultResult.text.includes('Critical Emergency');

      if (isEmergency) {
        setIsEmergencyBannerOpen(true);
        playNotificationRingtone('clinical_pager', 3, 0.95);
      } else {
        playGentleNotificationChime();
      }

      const assistantMsg: ConsultationMessage = {
        id: `msg_asst_${Date.now()}`,
        role: isEmergency ? 'emergency' : 'assistant',
        content: consultResult.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        triageLevel: consultResult.triageLevel as TriageLevel,
        sources: consultResult.sources || [],
        ragGrounding: consultResult.ragGrounding || undefined,
        visionPreScreening: visionPreScreeningData || undefined,
        biomarkerAnalysis: biomarkerAnalysisData || undefined,
        isEmergencyOverride: isEmergency,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Consultation error:', err);
      const errorMsg: ConsultationMessage = {
        id: `msg_err_${Date.now()}`,
        role: 'assistant',
        content: `### ⚠️ Consultation Processing Notice\nWe were unable to complete the analysis at this moment: *${
          err.message || 'Network or API timeout'
        }*.\n\nPlease check your internet connection or verify your API settings in Settings > Secrets.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        triageLevel: 'Level 2: Routine Consultation',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for 1-click test scenarios
  const handleSelectScenario = (
    prompt: string,
    attachments: AttachmentItem[],
    targetProfile?: UserProfile
  ) => {
    if (targetProfile) {
      setCurrentProfile(targetProfile);
    }
    handleSendMessage(prompt, attachments);
  };

  // Session Management Handlers
  const handleSelectSession = (sessionId: string) => {
    if (sessionId === activeSessionId) return;
    const target = chatSessions.find((s) => s.id === sessionId);
    if (target) {
      setActiveSessionId(sessionId);
      setMessages(target.messages || []);
      setIsEmergencyBannerOpen(
        (target.messages || []).some((m) => m.triageLevel?.includes('Level 4') || m.isEmergencyOverride)
      );
    }
  };

  const handleNewSession = () => {
    const fresh = createNewSession(currentProfile);
    setChatSessions((prev) => [fresh, ...prev]);
    setActiveSessionId(fresh.id);
    setMessages([]);
    setIsEmergencyBannerOpen(false);
  };

  const handleDeleteSession = (sessionId: string) => {
    setChatSessions((prev) => {
      const updated = prev.filter((s) => s.id !== sessionId);
      saveChatSessions(updated);
      if (activeSessionId === sessionId) {
        const nextSession = updated[0] || createNewSession(currentProfile);
        setActiveSessionId(nextSession.id);
        setMessages(nextSession.messages || []);
      }
      return updated;
    });
  };

  const handleRenameSession = (sessionId: string, newTitle: string) => {
    setChatSessions((prev) => {
      const updated = prev.map((s) => (s.id === sessionId ? { ...s, title: newTitle } : s));
      saveChatSessions(updated);
      return updated;
    });
  };

  const handleClearAllSessions = () => {
    const fresh = createNewSession(currentProfile);
    setChatSessions([fresh]);
    setActiveSessionId(fresh.id);
    setMessages([]);
    saveChatSessions([fresh]);
    setIsEmergencyBannerOpen(false);
  };

  const handleResetConsultation = () => {
    stopActiveRingtone();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    // Start a new consultation session while strictly preserving all chat history in the sidebar
    handleNewSession();
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-[#F0FDF4]/30 via-[#F8FAFC] to-[#F0F9FF]/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col font-sans selection:bg-teal-200 dark:selection:bg-teal-800 selection:text-teal-950 dark:selection:text-teal-100 transition-colors duration-300">
      {/* Front-End Welcome & Opening Screen: Starts with App Image first & Shows All Capabilities */}
      {isOpeningScreenOpen && (
        <OpeningScreen
          userProfile={currentProfile}
          onStartConsultation={() => {
            setIsOpeningScreenOpen(false);
            setActivePage('consultation');
          }}
          onOpenMaps={() => {
            setIsOpeningScreenOpen(false);
            setActivePage('maps');
          }}
          onOpenDashboard={() => {
            setIsOpeningScreenOpen(false);
            setActivePage('dashboard');
          }}
          onOpenProfile={() => {
            setIsOpeningScreenOpen(false);
            setIsProfileModalOpen(true);
          }}
          onOpenReminders={() => {
            setIsOpeningScreenOpen(false);
            setIsReminderSettingsOpen(true);
          }}
          onOpenGoogleLogin={() => {
            setIsOpeningScreenOpen(false);
            setIsGoogleModalOpen(true);
          }}
        />
      )}

      {/* Top Header with Brand and Unified Features Hub */}
      <Header
        currentProfile={currentProfile}
        currentUser={currentUser}
        notificationSettings={notificationSettings}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenGoogleLogin={() => setIsGoogleModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onOpenReminderSettings={() => setIsReminderSettingsOpen(true)}
        onTriggerEmergencyBanner={() => setIsEmergencyBannerOpen(true)}
        onOpenClinicalBrief={() => setIsClinicalBriefOpen(true)}
        onResetConsultation={handleResetConsultation}
        onOpenSampleScenarios={() => setIsSampleScenariosOpen(true)}
        onOpenTesterHub={() => setIsTesterHubOpen(true)}
        onOpenOpeningScreen={() => setIsOpeningScreenOpen(true)}
        onOpenPharmacyLocator={() => {
          setPharmacyInitialMeds(currentProfile.healthHistory.currentMedications || []);
          setIsPharmacyModalOpen(true);
        }}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        onNewSession={handleNewSession}
        activePage={activePage}
        onNavigate={handleNavigate}
        onOpenNotificationsCenter={() => setIsNotificationsCenterOpen(true)}
        unreadNotificationsCount={unreadNotificationsCount}
      />

      {/* Main Workspace based on activePage */}
      {activePage === 'consultation' ? (
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left Side Dashboard: Chat History */}
          <ChatHistorySidebar
            isOpen={isSidebarOpen}
            onToggle={() => setIsSidebarOpen((prev) => !prev)}
            sessions={chatSessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
            onDeleteSession={handleDeleteSession}
            onRenameSession={handleRenameSession}
            onClearAllSessions={handleClearAllSessions}
            currentProfile={currentProfile}
            onOpenProfileModal={() => setIsProfileModalOpen(true)}
          />

          {/* Center / Right Main Content Workspace */}
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
            {/* Prominent Daily Health Notification & Reminder Bar */}
            <NotificationBar
              settings={notificationSettings}
              onUpdateSettings={(newSettings) => setNotificationSettings(newSettings)}
              onTriggerTestNotification={handleTriggerTestNotification}
              onOpenReminderSettings={() => setIsReminderSettingsOpen(true)}
              onOpenProfileModal={() => setIsProfileModalOpen(true)}
              currentProfile={currentProfile}
            />

            {/* Emergency Red-Flag Banner (Sticky/Dismissable) */}
            <EmergencyBanner
              isOpen={isEmergencyBannerOpen}
              onClose={() => setIsEmergencyBannerOpen(false)}
            />

            {/* Main Consultation Feed */}
            <main className="flex-1 overflow-y-auto">
              <ConsultationFeed
                messages={messages}
                currentProfile={currentProfile}
                isLoading={isLoading}
                onOpenProfileModal={() => setIsProfileModalOpen(true)}
                onOpenSampleScenarios={() => setIsSampleScenariosOpen(true)}
                onOpenPharmacyLocator={(meds) => {
                  if (meds && meds.length > 0) {
                    setPharmacyInitialMeds(meds);
                  } else {
                    setPharmacyInitialMeds(currentProfile.healthHistory.currentMedications || []);
                  }
                  setIsPharmacyModalOpen(true);
                }}
              />
            </main>

            {/* Multimodal Input Toolbar */}
            <InputToolbar
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              onOpenSampleScenarios={() => setIsSampleScenariosOpen(true)}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
          {activePage === 'dashboard' && (
            currentUser?.role === 'doctor' ? (
              <DoctorDashboard
                currentUser={currentUser}
                onNavigate={handleNavigate}
                onSelectPatient={(p) => {
                  setSelectedPatientId(p.id);
                  setActivePage('patients');
                }}
                onOpenNewPatientModal={() => setIsNewPatientModalOpen(true)}
                onOpenNewAppointmentModal={() => setIsNewAppointmentModalOpen(true)}
              />
            ) : (
              <PatientDashboard
                currentUser={
                  currentUser || {
                    id: 'usr_guest',
                    name: currentProfile.name || 'Alex Rivera',
                    email: 'patient@medtrack.local',
                    role: 'patient',
                    isVerified: true,
                    createdAt: new Date().toISOString(),
                  }
                }
                userProfile={currentProfile}
                onNavigate={handleNavigate}
                onOpenNewAppointmentModal={() => setIsNewAppointmentModalOpen(true)}
                onStartConsultation={() => setActivePage('consultation')}
              />
            )
          )}

          {activePage === 'patients' && (
            <PatientManagement
              onOpenNewPatientModal={() => setIsNewPatientModalOpen(true)}
              selectedPatientId={selectedPatientId}
            />
          )}

          {activePage === 'appointments' && (
            <AppointmentsView
              currentUser={currentUser}
              onOpenNewAppointmentModal={() => setIsNewAppointmentModalOpen(true)}
            />
          )}

          {activePage === 'maps' && (
            <MapsView onBack={() => setActivePage('dashboard')} />
          )}
        </div>
      )}

      {/* Floating MedTrack AI Assistant on all pages */}
      <FloatingAssistant
        currentUser={currentUser}
        currentPage={activePage}
        onNavigate={handleNavigate}
      />

      {/* User Profile & Baseline Editor Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentProfile={currentProfile}
        onSaveProfile={(updated) => setCurrentProfile(updated)}
        onClearCache={handleClearCache}
        onOpenReminderSettings={() => setIsReminderSettingsOpen(true)}
        messages={messages}
        onRefreshData={handleDataRefresh}
        onOpenPharmacyLocator={(meds) => {
          if (meds && meds.length > 0) {
            setPharmacyInitialMeds(meds);
          }
          setIsPharmacyModalOpen(true);
        }}
      />

      {/* Interactive Sample Scenarios Modal */}
      <SampleScenariosModal
        isOpen={isSampleScenariosOpen}
        onClose={() => setIsSampleScenariosOpen(false)}
        onSelectScenario={handleSelectScenario}
      />

      {/* Doctor Printable Clinical Summary Modal */}
      <ClinicalBriefModal
        isOpen={isClinicalBriefOpen}
        onClose={() => setIsClinicalBriefOpen(false)}
        currentProfile={currentProfile}
        messages={messages}
      />

      {/* Google Maps Medical Store & Pharmacy Locator with GPS */}
      <PharmacyLocatorModal
        isOpen={isPharmacyModalOpen}
        onClose={() => setIsPharmacyModalOpen(false)}
        userProfile={currentProfile}
        initialMedicines={pharmacyInitialMeds}
      />

      {/* Daily Scheduled Reminder & Notification Settings Modal */}
      <ReminderSettingsModal
        isOpen={isReminderSettingsOpen}
        onClose={() => setIsReminderSettingsOpen(false)}
        settings={notificationSettings}
        onSaveSettings={(newSettings) => setNotificationSettings(newSettings)}
        onTriggerTestNotification={handleTriggerTestNotification}
        currentProfile={currentProfile}
      />

      {/* Multi-User Personas & Audio Alarm QA Testing Hub */}
      <TesterHubModal
        isOpen={isTesterHubOpen}
        onClose={() => setIsTesterHubOpen(false)}
        currentProfile={currentProfile}
        onSelectProfile={(p) => setCurrentProfile(p)}
        currentUser={currentUser}
        onLoginAsUser={(u) => handleLoginSuccess(u)}
        onSeedConsultation={(seeded) => setMessages(seeded)}
        onClearConsultation={() => setMessages([])}
        notificationSettings={notificationSettings}
        onTriggerTestNotification={() => handleTriggerTestNotification()}
        onTriggerEmergencyBanner={() => setIsEmergencyBannerOpen(true)}
        onOpenClinicalBrief={() => setIsClinicalBriefOpen(true)}
        onOpenReminderSettings={() => setIsReminderSettingsOpen(true)}
        onOpenPharmacyLocator={() => {
          setPharmacyInitialMeds(currentProfile.healthHistory.currentMedications || []);
          setIsPharmacyModalOpen(true);
        }}
      />

      {/* Interactive In-App Scheduled Reminder Toast Prompt */}
      <ReminderToast
        content={activeReminderToast}
        onClose={() => {
          stopActiveRingtone();
          setActiveReminderToast(null);
        }}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onOpenClinicalBrief={() => setIsClinicalBriefOpen(true)}
        onSnooze={handleSnooze}
        notificationSettings={notificationSettings}
        onStopAudio={stopActiveRingtone}
      />

      {/* Authentication Login / Sign In Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Universal Standalone Google Auth Modal */}
      <GoogleAuthModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* New Patient Registration Modal */}
      <NewPatientModal
        isOpen={isNewPatientModalOpen}
        onClose={() => setIsNewPatientModalOpen(false)}
        onPatientAdded={() => {
          setIsNewPatientModalOpen(false);
        }}
      />

      {/* New Appointment Booking Modal */}
      <NewAppointmentModal
        isOpen={isNewAppointmentModalOpen}
        onClose={() => setIsNewAppointmentModalOpen(false)}
        onAppointmentCreated={() => {
          setIsNewAppointmentModalOpen(false);
        }}
        currentUser={currentUser}
      />

      {/* Interactive Clinical & Reminder Notifications Center */}
      <NotificationsCenterModal
        isOpen={isNotificationsCenterOpen}
        onClose={() => setIsNotificationsCenterOpen(false)}
        settings={notificationSettings}
        onUpdateSettings={(newSettings) => setNotificationSettings(newSettings)}
      />
    </div>
  );
}
