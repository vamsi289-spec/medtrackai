import { UserProfile, ExerciseFrequency } from '../types';

export function calculateBMI(heightCm: number, weightKg: number): {
  bmi: number;
  category: 'Underweight' | 'Normal Weight' | 'Overweight' | 'Obese';
} {
  if (heightCm <= 0 || weightKg <= 0) {
    return { bmi: 22, category: 'Normal Weight' };
  }
  const heightM = heightCm / 100;
  const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));

  let category: 'Underweight' | 'Normal Weight' | 'Overweight' | 'Obese' = 'Normal Weight';
  if (bmi < 18.5) category = 'Underweight';
  else if (bmi < 25) category = 'Normal Weight';
  else if (bmi < 30) category = 'Overweight';
  else category = 'Obese';

  return { bmi, category };
}

export function calculateTDEE(
  gender: string,
  age: number,
  heightCm: number,
  weightKg: number,
  exercise: ExerciseFrequency
): number {
  if (heightCm <= 0 || weightKg <= 0 || age <= 0) return 2000;

  // Mifflin-St Jeor Equation
  let bmr: number;
  if (gender === 'Female') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }

  let activityMultiplier = 1.2; // Sedentary
  if (exercise.includes('Light')) activityMultiplier = 1.375;
  else if (exercise.includes('Moderate')) activityMultiplier = 1.55;
  else if (exercise.includes('Active')) activityMultiplier = 1.725;
  else if (exercise.includes('Athlete')) activityMultiplier = 1.9;

  return Math.round(bmr * activityMultiplier);
}

// Preloaded Realistic User Profiles
export const PRESET_PROFILES: UserProfile[] = [
  {
    id: 'user_alex_34m',
    name: 'Alex Rivera',
    avatarColor: 'from-teal-500 to-emerald-600',
    demographics: {
      age: 34,
      gender: 'Male',
      profession: 'Senior Software Engineer (Sedentary / Desk Work)',
    },
    metrics: {
      heightCm: 178,
      weightKg: 86,
      bmi: 27.1,
      bmiCategory: 'Overweight',
      tdeeKcal: 2350,
    },
    lifestyle: {
      exerciseFrequency: 'Sedentary (Rarely/Never)',
      junkFoodIntake: '3-5 times / week',
      dailySleepDurationHours: 6,
      waterIntakeLiters: 1.5,
      stressLevel: 'High',
      smokingOrVaping: 'Never',
      alcoholIntake: 'Occasional',
    },
    healthHistory: {
      knownConditions: ['Borderline Pre-Hypertension (132/86 mmHg)', 'Mild Gastroesophageal Reflux (GERD)'],
      allergies: ['Penicillin'],
      currentMedications: ['Omeprazole 20mg PRN', 'Vitamin D3 2000 IU'],
      familyHistory: ['Type 2 Diabetes (Father)', 'Hypertension (Mother)'],
    },
    customNotes: 'Spends 9+ hours sitting, reports frequent neck stiffness and late-night snacking.',
  },
  {
    id: 'user_elena_52f',
    name: 'Elena Rostova',
    avatarColor: 'from-indigo-500 to-purple-600',
    demographics: {
      age: 52,
      gender: 'Female',
      profession: 'High School Biology Teacher (On feet 5h/day)',
    },
    metrics: {
      heightCm: 165,
      weightKg: 68,
      bmi: 25.0,
      bmiCategory: 'Overweight',
      tdeeKcal: 1980,
    },
    lifestyle: {
      exerciseFrequency: 'Moderate (3-4 days/week)',
      junkFoodIntake: '1-2 times / week',
      dailySleepDurationHours: 7,
      waterIntakeLiters: 2.2,
      stressLevel: 'Moderate',
      smokingOrVaping: 'Never',
      alcoholIntake: 'Occasional',
    },
    healthHistory: {
      knownConditions: ['Essential Hypertension (Controlled)', 'Seasonal Allergic Rhinitis'],
      allergies: ['Sulfa Drugs', 'Tree Pollen'],
      currentMedications: ['Amlodipine 5mg Daily', 'Cetirizine 10mg PRN'],
      familyHistory: ['Coronary Artery Disease (Paternal Grandfather)'],
    },
    customNotes: 'Keeps consistent morning walks; checks blood pressure at home weekly.',
  },
  {
    id: 'user_marcus_22m',
    name: 'Marcus Chen',
    avatarColor: 'from-amber-500 to-orange-600',
    demographics: {
      age: 22,
      gender: 'Male',
      profession: 'University Student & Varsity Track Runner',
    },
    metrics: {
      heightCm: 182,
      weightKg: 73,
      bmi: 22.0,
      bmiCategory: 'Normal Weight',
      tdeeKcal: 2850,
    },
    lifestyle: {
      exerciseFrequency: 'Athlete (Daily intensive)',
      junkFoodIntake: 'Rarely / Clean Eater',
      dailySleepDurationHours: 5.5,
      waterIntakeLiters: 3.5,
      stressLevel: 'Moderate',
      smokingOrVaping: 'Never',
      alcoholIntake: 'None',
    },
    healthHistory: {
      knownConditions: ['Exercise-Induced Asthma'],
      allergies: ['Peanuts (Severe - carries EpiPen)'],
      currentMedications: ['Albuterol Sulfate Inhaler (2 puffs before training)'],
      familyHistory: ['Asthma (Mother)'],
    },
    customNotes: 'High physical output, but suffers from chronic sleep deprivation due to exams.',
  },
];

// Helper to generate SVG placeholder images as base64 data URLs for sample scenarios
export function generateSampleMedicalImage(type: 'rash' | 'blood_report' | 'eye_redness'): string {
  if (type === 'rash') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
      <defs>
        <radialGradient id="skin" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fbd5b5"/>
          <stop offset="100%" stop-color="#e8b896"/>
        </radialGradient>
        <radialGradient id="rashCenter" cx="50%" cy="50%" r="40%">
          <stop offset="0%" stop-color="#dc2626" stop-opacity="0.8"/>
          <stop offset="60%" stop-color="#ef4444" stop-opacity="0.5"/>
          <stop offset="100%" stop-color="#f87171" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="400" height="300" rx="12" fill="url(#skin)"/>
      <!-- Forearm contour simulation -->
      <path d="M 0 100 Q 200 80 400 90 L 400 240 Q 200 230 0 250 Z" fill="#f5cbb0" opacity="0.6"/>
      <!-- Annular erythematous rash lesion -->
      <circle cx="200" cy="160" r="65" fill="url(#rashCenter)"/>
      <circle cx="200" cy="160" r="45" fill="#e8b896" fill-opacity="0.3"/>
      <!-- Scattered erythematous papules -->
      <circle cx="160" cy="130" r="5" fill="#b91c1c"/>
      <circle cx="230" cy="140" r="6" fill="#b91c1c"/>
      <circle cx="210" cy="190" r="4" fill="#b91c1c"/>
      <circle cx="175" cy="180" r="5" fill="#dc2626"/>
      <circle cx="240" cy="175" r="4.5" fill="#dc2626"/>
      <circle cx="185" cy="145" r="5.5" fill="#b91c1c"/>
      <text x="20" y="35" font-family="sans-serif" font-size="14" font-weight="bold" fill="#78350f">Clinical Photo Sample: Annular Erythematous Forearm Rash</text>
      <text x="20" y="280" font-family="sans-serif" font-size="11" fill="#92400e">Patient report: Itchy, raised circular border, appeared 48h after gardening</text>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  if (type === 'blood_report') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="420" viewBox="0 0 500 420">
      <rect width="500" height="420" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
      <rect x="0" y="0" width="500" height="60" fill="#0f766e" rx="6"/>
      <text x="24" y="38" font-family="sans-serif" font-size="18" font-weight="bold" fill="#ffffff">METRO CLINICAL DIAGNOSTICS LAB</text>
      <text x="24" y="85" font-family="sans-serif" font-size="12" fill="#475569">Patient: Alex Rivera (34M) | Date: Aug 2026 | ID: #LAB-99201</text>
      <line x1="24" y1="95" x2="476" y2="95" stroke="#e2e8f0" stroke-width="1.5"/>

      <!-- Header Row -->
      <rect x="24" y="105" width="452" height="26" fill="#f1f5f9"/>
      <text x="32" y="122" font-family="sans-serif" font-size="11" font-weight="bold" fill="#334155">TEST / BIOMARKER</text>
      <text x="210" y="122" font-family="sans-serif" font-size="11" font-weight="bold" fill="#334155">RESULT</text>
      <text x="300" y="122" font-family="sans-serif" font-size="11" font-weight="bold" fill="#334155">REF RANGE</text>
      <text x="410" y="122" font-family="sans-serif" font-size="11" font-weight="bold" fill="#334155">FLAG</text>

      <!-- Row 1: Fasting Glucose -->
      <text x="32" y="152" font-family="sans-serif" font-size="12" fill="#1e293b">Fasting Blood Glucose</text>
      <text x="210" y="152" font-family="sans-serif" font-size="12" font-weight="bold" fill="#dc2626">118 mg/dL</text>
      <text x="300" y="152" font-family="sans-serif" font-size="12" fill="#64748b">70 - 99 mg/dL</text>
      <rect x="405" y="138" width="55" height="18" rx="4" fill="#fee2e2"/>
      <text x="418" y="151" font-family="sans-serif" font-size="10" font-weight="bold" fill="#991b1b">HIGH</text>

      <!-- Row 2: HbA1c -->
      <text x="32" y="185" font-family="sans-serif" font-size="12" fill="#1e293b">Glycated Hemoglobin (HbA1c)</text>
      <text x="210" y="185" font-family="sans-serif" font-size="12" font-weight="bold" fill="#d97706">5.9 %</text>
      <text x="300" y="185" font-family="sans-serif" font-size="12" fill="#64748b">&lt; 5.7 %</text>
      <rect x="405" y="171" width="55" height="18" rx="4" fill="#fef3c7"/>
      <text x="418" y="184" font-family="sans-serif" font-size="10" font-weight="bold" fill="#92400e">HIGH</text>

      <!-- Row 3: Total Cholesterol -->
      <text x="32" y="218" font-family="sans-serif" font-size="12" fill="#1e293b">Total Cholesterol</text>
      <text x="210" y="218" font-family="sans-serif" font-size="12" font-weight="bold" fill="#dc2626">238 mg/dL</text>
      <text x="300" y="218" font-family="sans-serif" font-size="12" fill="#64748b">&lt; 200 mg/dL</text>
      <rect x="405" y="204" width="55" height="18" rx="4" fill="#fee2e2"/>
      <text x="418" y="217" font-family="sans-serif" font-size="10" font-weight="bold" fill="#991b1b">HIGH</text>

      <!-- Row 4: LDL Cholesterol -->
      <text x="32" y="251" font-family="sans-serif" font-size="12" fill="#1e293b">LDL Cholesterol (Calculated)</text>
      <text x="210" y="251" font-family="sans-serif" font-size="12" font-weight="bold" fill="#dc2626">154 mg/dL</text>
      <text x="300" y="251" font-family="sans-serif" font-size="12" fill="#64748b">&lt; 100 mg/dL</text>
      <rect x="405" y="237" width="55" height="18" rx="4" fill="#fee2e2"/>
      <text x="418" y="250" font-family="sans-serif" font-size="10" font-weight="bold" fill="#991b1b">HIGH</text>

      <!-- Row 5: HDL Cholesterol -->
      <text x="32" y="284" font-family="sans-serif" font-size="12" fill="#1e293b">HDL Cholesterol</text>
      <text x="210" y="284" font-family="sans-serif" font-size="12" font-weight="bold" fill="#059669">44 mg/dL</text>
      <text x="300" y="284" font-family="sans-serif" font-size="12" fill="#64748b">&gt; 40 mg/dL</text>
      <rect x="405" y="270" width="55" height="18" rx="4" fill="#dcfce7"/>
      <text x="412" y="283" font-family="sans-serif" font-size="10" font-weight="bold" fill="#166534">NORMAL</text>

      <!-- Row 6: Triglycerides -->
      <text x="32" y="317" font-family="sans-serif" font-size="12" fill="#1e293b">Serum Triglycerides</text>
      <text x="210" y="317" font-family="sans-serif" font-size="12" font-weight="bold" fill="#dc2626">202 mg/dL</text>
      <text x="300" y="317" font-family="sans-serif" font-size="12" fill="#64748b">&lt; 150 mg/dL</text>
      <rect x="405" y="303" width="55" height="18" rx="4" fill="#fee2e2"/>
      <text x="418" y="316" font-family="sans-serif" font-size="10" font-weight="bold" fill="#991b1b">HIGH</text>

      <!-- Footer Note -->
      <rect x="24" y="345" width="452" height="55" rx="6" fill="#f8fafc" stroke="#e2e8f0"/>
      <text x="34" y="365" font-family="sans-serif" font-size="11" font-weight="bold" fill="#0f766e">Pathology Note:</text>
      <text x="34" y="385" font-family="sans-serif" font-size="10.5" fill="#475569">Impaired fasting glucose and dyslipidemia noted. Recommend clinical correlation &amp; lifestyle review.</text>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  // Fallback / default
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200"><rect width="400" height="200" fill="#f1f5f9"/><text x="50" y="100" font-family="sans-serif" font-size="14" fill="#64748b">Medical Attachment Sample</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
