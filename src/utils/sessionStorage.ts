import { ChatSession, ConsultationMessage, UserProfile } from '../types';
import { safeLocalStorageGet, safeLocalStorageSet } from './safeStorage';

const SESSIONS_STORAGE_KEY = 'medtrack_chat_sessions';
const ACTIVE_SESSION_ID_KEY = 'medtrack_active_session_id';

export const INITIAL_SAMPLE_SESSIONS: ChatSession[] = [
  {
    id: 'session_sample_1',
    title: 'Dermatology: Annular Erythematous Rash',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: 'rash',
    triageLevel: 'Level 2: Routine Consultation',
    profileName: 'Alex Rivera',
    summary: 'Annular erythematous plaque with central clearing on left forearm, suspected fungal/contact dermatosis.',
    messages: [
      {
        id: 'msg_s1_user',
        role: 'user',
        content: 'I noticed this ring-shaped red rash with mild itching on my left forearm 3 days ago. It has a slightly raised border with clear skin in the middle.',
        timestamp: 'Yesterday 14:20',
      },
      {
        id: 'msg_s1_asst',
        role: 'assistant',
        content: `### 1. Personalized Triage & Clinical Assessment\n- **Triage Level:** Level 2: Routine Consultation\n- **Morphology:** Distinct annular (ring-shaped) erythematous plaque with active raised peripheral margin and central clearing.\n- **Primary Differential:** Tinea Corporis (Ringworm / Dermatophytosis), Contact Dermatitis, or Mild Erythema Annulare Centrifugum.\n\n### 2. Patient-Specific Context\n- Patient Alex Rivera (Age 34, Sedentary/Software Engineer), no known drug allergies. High stress score noted.\n\n### 3. Non-Prescription & Home Comfort Measures\n- Keep area dry and clean with mild soap.\n- Avoid tight synthetic fabrics.\n- OTC topical terbinafine or clotrimazole 1% applied twice daily for 2 weeks if confirmed by a clinician.\n\n### 4. When to Seek Urgent Care\n- If warmth, spreading purulent drainage, or systemic fever > 38.5°C develops.`,
        timestamp: 'Yesterday 14:21',
        triageLevel: 'Level 2: Routine Consultation',
        sources: [
          { title: 'American Academy of Dermatology: Ringworm Guidelines', uri: 'https://www.aad.org' },
          { title: 'CDC Fungal Diseases: Tinea Corporis', uri: 'https://www.cdc.gov' },
        ],
      },
    ],
  },
  {
    id: 'session_sample_2',
    title: 'Lipid Panel & Metabolic Biomarker Review',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // ~3 days ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 71).toISOString(),
    category: 'lab_report',
    triageLevel: 'Level 2: Routine Consultation',
    profileName: 'Alex Rivera',
    summary: 'Routine comprehensive lipid panel showing mildly elevated LDL-C (142 mg/dL) and borderline triglycerides.',
    messages: [
      {
        id: 'msg_s2_user',
        role: 'user',
        content: 'Here are my annual lipid panel results: Total Cholesterol 228 mg/dL, LDL 142 mg/dL, HDL 46 mg/dL, Triglycerides 178 mg/dL, Fasting Glucose 98 mg/dL.',
        timestamp: '3 days ago',
      },
      {
        id: 'msg_s2_asst',
        role: 'assistant',
        content: `### 1. Laboratory Biomarker Interpretation\n- **Total Cholesterol:** 228 mg/dL *(Elevated, Normal < 200)*\n- **LDL-C ("Bad"):** 142 mg/dL *(Borderline High, Target < 100)*\n- **HDL-C ("Good"):** 46 mg/dL *(Normal Male > 40)*\n- **Triglycerides:** 178 mg/dL *(Borderline High, Target < 150)*\n- **Fasting Blood Glucose:** 98 mg/dL *(Normal Optimal < 100)*\n\n### 2. Cardiovascular Risk & Lifestyle Action Plan\n- **Dietary Adjustments:** Increase soluble fiber (oats, legumes, flaxseeds, psyllium). Replace saturated trans fats with omega-3 fatty acids (walnuts, salmon, olive oil).\n- **Physical Activity:** Aim for at least 150 min/week of moderate cardiovascular exercise.\n\n### 3. Suggested Follow-Up\n- Repeat fasting lipid profile in 3 to 6 months with your primary physician to assess lifestyle intervention response.`,
        timestamp: '3 days ago',
        triageLevel: 'Level 2: Routine Consultation',
        sources: [
          { title: 'AHA: 2018 Cholesterol Clinical Guidelines', uri: 'https://www.heart.org' },
          { title: 'NIH NHLBI: High Blood Cholesterol Reference', uri: 'https://www.nhlbi.nih.gov' },
        ],
      },
    ],
  },
];

/**
 * Loads all saved chat sessions from localStorage, with fallback to initial samples.
 */
export function getStoredChatSessions(): ChatSession[] {
  try {
    const raw = safeLocalStorageGet(SESSIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load chat sessions:', err);
  }
  return INITIAL_SAMPLE_SESSIONS;
}

/**
 * Saves chat sessions to localStorage safely.
 */
export function saveChatSessions(sessions: ChatSession[]): void {
  try {
    // Strip heavy base64 attachment data from messages before saving sessions
    const lightweightSessions = sessions.slice(0, 30).map((session) => ({
      ...session,
      messages: session.messages.slice(-20).map((msg) => ({
        ...msg,
        attachments: msg.attachments?.map((att) => ({
          ...att,
          data: typeof att.data === 'string' && att.data.length > 5000 ? '' : att.data,
          previewUrl: typeof att.previewUrl === 'string' && att.previewUrl.length > 5000 ? '' : att.previewUrl,
        })),
      })),
    }));

    safeLocalStorageSet(SESSIONS_STORAGE_KEY, JSON.stringify(lightweightSessions));
  } catch (err) {
    console.warn('Failed to save chat sessions:', err);
  }
}

/**
 * Generates an automatic title from the first message content.
 */
export function generateSessionTitle(firstMessage: string): string {
  if (!firstMessage) return 'New Consultation';
  const clean = firstMessage.replace(/^[#*\s]+/, '').trim();
  if (clean.length <= 40) return clean;
  return clean.slice(0, 37) + '...';
}

/**
 * Creates a brand new empty chat session.
 */
export function createNewSession(profile?: UserProfile): ChatSession {
  return {
    id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: 'New Consultation',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
    profileName: profile?.name || 'User',
    category: 'general',
  };
}
