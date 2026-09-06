// Health-Only Domain Guard for MedTrack AI
// Enforces strict clinical domain restrictions: only health, medicine, wellness, symptoms,
// medications, lab biomarkers, nutrition, fitness, and MedTrack healthcare navigation are permitted.

export const HEALTH_REFUSAL_MESSAGE = 
`I am **MedTrack AI**, an intelligent clinical healthcare assistant. I am specialized strictly to provide assistance for **health, medical conditions, symptoms, medications, lab test biomarkers, nutrition, wellness, and healthcare navigation**.

I cannot answer questions outside of health and medical topics. Please feel free to ask any question regarding your health, symptoms, medications, vital signs, or clinical care!`;

// Broad list of healthcare, medical, biological, wellness, and MedTrack keywords/stems
const HEALTH_TOPIC_PATTERNS: RegExp[] = [
  // Symptoms & sensations
  /\b(pain|ache|aching|hurts?|sore|soreness|swelling|swollen|fever|temperature|chills|cough|coughing|cold|flu|congestion|phlegm|mucus|sneeze|sneezing|runny nose|throat)\b/i,
  /\b(nausea|nauseous|vomit|vomiting|diarrhea|constipat|indigestion|heartburn|acid reflux|gerd|stomach|cramp|bloat|gas|abdomen|abdominal)\b/i,
  /\b(headache|migraine|dizzy|dizziness|lightheaded|vertigo|fatigue|tired|exhaust|weak|weakness|letharg|faint|blackout|syncope)\b/i,
  /\b(rash|itch|itching|itchy|hive|hives|eczema|psoriasis|dermatitis|acne|lesion|bump|blister|bruise|cut|wound|burn|bite|sting|erythema)\b/i,
  /\b(breath|breathing|shortness of breath|dyspnea|wheeze|wheezing|chest|palpitation|arrhythmia|heart rate|pulse|tachycardia|bradycardia)\b/i,
  /\b(numb|numbness|tingle|tingling|tremor|seizure|convulsion|paralysis|droop|stroke|spasm|stiffness|cramps?)\b/i,
  /\b(sleep|insomnia|apnea|snoring|somnolence|drowsy|drowsiness|nightmare|restless)\b/i,
  /\b(ear|ears|hearing|tinnitus|eye|eyes|vision|blurred vision|redness|conjunctivitis|mouth|tongue|gum|tooth|teeth|dental|sinus)\b/i,
  /\b(joint|joints|muscle|muscles|bone|bones|spine|back|neck|shoulder|knee|hip|ankle|wrist|fracture|sprain|strain|tear)\b/i,
  /\b(urine|urinary|urination|bladder|kidney|pee|peeing|hematuria|incontinence|stool|bowel|poop|rectal|anus)\b/i,
  /\b(bleed|bleeding|blood|hemorrhage|clot|clotting|thrombus|hematoma)\b/i,
  /\b(allergy|allergies|allergic|anaphylaxis|reaction|pollen|dust|peanut|histamine)\b/i,
  /\b(mental|anxiety|anxious|depress|depression|panic|stress|stressed|phobia|trauma|ptsd|bipolar|schizo|mood|ocd|adhd)\b/i,

  // Diseases & Conditions
  /\b(disease|disorder|syndrome|infection|infectious|virus|viral|bacteria|bacterial|fungal|parasite|pathogen)\b/i,
  /\b(diabetes|diabetic|glucose|sugar|insulin|hypoglycemia|hyperglycemia|hba1c)\b/i,
  /\b(hypertension|hypotension|blood pressure|bp|cholesterol|triglyceride|lipid|atherosclerosis)\b/i,
  /\b(cancer|carcinoma|tumor|malignan|benign|melanoma|leukemia|lymphoma|chemo|radiation|oncology)\b/i,
  /\b(asthma|copd|bronchitis|pneumonia|covid|coronavirus|influenza|tuberculosis|strep)\b/i,
  /\b(arthritis|osteoarthritis|rheumatoid|gout|osteoporosis|fibromyalgia)\b/i,
  /\b(hepatitis|cirrhosis|liver|fatty liver|jaundice|pancreatitis|cholecystitis|gallbladder|gallstones)\b/i,
  /\b(celiac|crohn|colitis|ibs|ibd|gastritis|ulcer)\b/i,
  /\b(thyroid|hypothyroid|hyperthyroid|hashimoto|graves|tsh|t3|t4|hormone|endocrine)\b/i,

  // Anatomy & Physiology
  /\b(body|anatomy|organ|brain|heart|lung|lungs|stomach|intestine|colon|liver|kidney|bladder|pancreas|spleen|skin|skeleton|vein|artery|capillary|nerve|neuron|synapse|cell|immune|lymph)\b/i,

  // Medications, Pharmacology & Treatments
  /\b(medicine|medication|drug|pill|tablet|capsule|syrup|injection|shot|infusion|iv|dose|dosage|prescription|rx|otc|over-the-counter)\b/i,
  /\b(antibiotic|antiviral|antifungal|analgesic|painkiller|anti-inflammatory|nsaid|steroid|corticosteroid|antihistamine|decongestant|sedative|antidepressant)\b/i,
  /\b(paracetamol|acetaminophen|ibuprofen|aspirin|amoxicillin|metformin|lisinopril|atorvastatin|omeprazole|cetirizine|albuterol|ventolin|azithromycin|losartan|insulin)\b/i,
  /\b(vaccine|vaccination|immunization|booster|side effects?|contraindication|interaction|refill|pharmacy|pharmacist|chemist)\b/i,
  /\b(therapy|physiotherapy|physical therapy|surgery|operation|procedure|biopsy|transplant|dialysis|first aid|cpr|bandage|dressing)\b/i,

  // Diagnostics, Labs & Biomarkers
  /\b(lab|laboratory|test|tests|screening|screen|diagnostic|biomarker|blood test|urine test|panel|cbc|wbc|rbc|platelet|hemoglobin|creatinine|bun|ast|alt|bilirubin|electrolytes|sodium|potassium)\b/i,
  /\b(x-ray|xray|mri|ct scan|ultrasound|ecg|ekg|eeg|mammogram|biopsy|endoscopy|colonoscopy|vital signs|spo2|oxygen saturation|bmi|body mass index)\b/i,

  // Nutrition, Fitness & Lifestyle
  /\b(diet|nutrition|nutritional|nutrient|calorie|calories|protein|carbohydrate|carbs|fat|fiber|vitamin|mineral|supplement|iron|calcium|zinc|magnesium|potassium)\b/i,
  /\b(hydration|water intake|dehydrat|exercise|workout|fitness|cardio|aerobic|strength|walking|jogging|running|gym|posture|ergonomic|ergonomics)\b/i,
  /\b(weight|weight loss|weight gain|obese|obesity|underweight|metabolism|metabolic|fasting|intermittent fasting|sleep hygiene|smoking|tobacco|alcohol|sobriety)\b/i,
  /\b(pregnancy|pregnant|prenatal|postpartum|trimester|infant|baby|pediatric|child health|elderly|geriatric|menopause|menstrual|period|fertility)\b/i,

  // Healthcare system, Providers & MedTrack AI Platform
  /\b(doctor|physician|clinician|nurse|pediatrician|cardiologist|dermatologist|endocrinologist|neurologist|psychiatrist|psychologist|gynecologist|surgeon|general practitioner|gp|pcp)\b/i,
  /\b(hospital|clinic|er|emergency room|urgent care|intensive care|icu|ambulance|appointment|consultation|triage|medical record|health record|patient|doctor notes)\b/i,
  /\b(medtrack|pharmacy locator|hospital finder|medication reminder|health alert|daily reminder)\b/i,
];

// Specific non-health / off-topic patterns that should be strictly blocked
const OFF_TOPIC_EXCLUSION_PATTERNS: RegExp[] = [
  // Programming & Software Development
  /\b(write (python|javascript|typescript|java|c\+\+|c#|ruby|rust|php|sql|bash|html|css|code|script)|debug this code|coding interview|leetcode|git commit|npm install|react component|docker container|regex pattern|sql query)\b/i,
  /\b(write a program|write code|code generator|binary search|bubble sort|linked list|software architecture|api key generation)\b/i,

  // Politics & Non-Health Governance
  /\b(who is the president|who won the election|prime minister of|political party|senate vote|parliament election|republican vs democrat|foreign policy|military tank|fighter jet|war tactics)\b/i,

  // Finance, Crypto & Trading
  /\b(bitcoin price|ethereum|cryptocurrency|crypto wallet|stock market|how to trade options|forex trading|invest in stocks|nft collection|get rich quick|mutual fund yield)\b/i,

  // Entertainment, Gaming & Pop Culture
  /\b(movie review|latest film|box office|actor in movie|hollywood gossip|celebrity scandal|playstation 5|xbox series|gta 6|minecraft server|fortnite skin|nintendo switch)\b/i,
  /\b(who won the (super bowl|world cup|nba finals|champions league|ipl trophy)|cricket score|football match result)\b/i,

  // Homework & Pure Science (Non-Biological)
  /\b(solve this (algebra|calculus|equation|geometry proof|math problem)|integral of|derivative of|quantum physics equation|speed of light in a vacuum|periodic table element 79|capital of (france|germany|spain|japan|australia|canada|brazil))\b/i,

  // Creative writing & Miscellaneous off-topic
  /\b(write a poem about (cars|planes|computers|money|space)|write a fictional story|tell me a joke about robots|recipe for chocolate cake|car engine repair|oil change for toyota)\b/i,

  // Jailbreak / Persona overrides
  /\b(ignore (all )?previous instructions|pretend you are (an unfiltered|a general|evil)|jailbreak mode|dan mode|unrestricted ai)\b/i,
];

/**
 * Validates whether a user's query and context is health/clinical related.
 */
export function validateHealthQuery(
  query: string,
  options?: {
    hasAttachments?: boolean;
    role?: string;
    currentPage?: string;
  }
): { isAllowed: boolean; refusalReason?: string } {
  const clean = (query || '').trim();

  // If user provided clinical attachments (photos of rash, lab PDF, medicine strip), allow it!
  if (options?.hasAttachments) {
    return { isAllowed: true };
  }

  // If query is empty or very short greeting like "hi", "hello", "good morning", allow it so assistant can greet and introduce health capabilities
  if (clean.length === 0) {
    return { isAllowed: true };
  }

  const lower = clean.toLowerCase();

  // 1. Check for explicit off-topic exclusion patterns first
  for (const pattern of OFF_TOPIC_EXCLUSION_PATTERNS) {
    if (pattern.test(lower)) {
      return {
        isAllowed: false,
        refusalReason: 'unrelated_off_topic',
      };
    }
  }

  // 2. Short greetings / polite openings are allowed with health context
  if (/^(hi|hello|hey|good (morning|afternoon|evening)|how are you|who are you|help|start)\b/i.test(lower) && clean.split(/\s+/).length <= 4) {
    return { isAllowed: true };
  }

  // 3. Platform navigation questions ("how to find hospital", "where is maps", "how to book appointment")
  if (/\b(how to (use|navigate|find|book|open|save|export|upload|view)|where is|where can i)\b/i.test(lower) &&
      /\b(app|profile|patient|doctor|appointment|consultation|map|hospital|pharmacy|record|reminder|alarm|medtrack)\b/i.test(lower)) {
    return { isAllowed: true };
  }

  // 4. Check if query matches any health/medical patterns
  for (const pattern of HEALTH_TOPIC_PATTERNS) {
    if (pattern.test(lower)) {
      return { isAllowed: true };
    }
  }

  // If the query is sufficiently long (> 4 words) and does not match ANY health, medical, wellness, symptom, or platform pattern, reject it
  const wordCount = clean.split(/\s+/).filter(Boolean).length;
  if (wordCount >= 3) {
    return {
      isAllowed: false,
      refusalReason: 'non_health_query',
    };
  }

  // Default to allowing short ambiguous queries, but Gemini prompt will enforce health-only boundary
  return { isAllowed: true };
}
