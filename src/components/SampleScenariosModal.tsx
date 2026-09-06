import React from 'react';
import { AttachmentItem, UserProfile } from '../types';
import { generateSampleMedicalImage, PRESET_PROFILES } from '../utils/healthCalculators';
import {
  Sparkles,
  X,
  Eye,
  FileText,
  ShieldAlert,
  Activity,
  ArrowRight,
  User,
} from 'lucide-react';

interface SampleScenariosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScenario: (
    prompt: string,
    attachments: AttachmentItem[],
    targetProfile?: UserProfile
  ) => void;
}

export const SampleScenariosModal: React.FC<SampleScenariosModalProps> = ({
  isOpen,
  onClose,
  onSelectScenario,
}) => {
  if (!isOpen) return null;

  const scenarios = [
    {
      id: 'dermatology_rash',
      title: 'Multimodal Vision: Annular Forearm Rash Pre-Screening',
      category: 'Vision & Dermatology',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
      icon: Eye,
      description:
        'Analyzes visual morphology of an itchy circular lesion with raised borders, comparing Ringworm (Tinea Corporis) vs Contact Dermatitis vs Eczema.',
      prompt:
        'I noticed this itchy circular rash with raised red borders on my left forearm 2 days ago after yard work. It has slight central clearing and itches intensely at night. Please analyze this photo against my profile.',
      hasAttachment: true,
      attachmentType: 'rash' as const,
      attachmentName: 'Forearm_Lesion_Photo.svg',
      profile: PRESET_PROFILES[0], // Alex Rivera
    },
    {
      id: 'blood_panel_ocr',
      title: 'Document OCR: Blood Panel Lab Biomarker Extraction',
      category: 'Lab Document & Metabolic',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      icon: FileText,
      description:
        'Extracts Fasting Blood Glucose (118 mg/dL), HbA1c (5.9%), and Lipid Panel from lab report. Flags abnormal values and explains prediabetes in plain English.',
      prompt:
        'Here is my latest annual metabolic and lipid blood panel report. Please extract the key biomarkers, highlight abnormal values, and explain what lifestyle adjustments I should make given my desk job.',
      hasAttachment: true,
      attachmentType: 'blood_report' as const,
      attachmentName: 'Metabolic_Lipid_Panel_Report.svg',
      profile: PRESET_PROFILES[0], // Alex Rivera
    },
    {
      id: 'cardiology_emergency',
      title: 'Level 4 Critical Red-Flag Emergency Check Override',
      category: 'Emergency Protocol',
      badgeColor: 'bg-rose-100 text-rose-900 border-rose-200 font-bold',
      icon: ShieldAlert,
      description:
        'Tests the instant emergency bypass: Crushing substernal chest pressure, radiation to jaw/left arm, and acute dyspnea.',
      prompt:
        'I have severe crushing chest pain like an elephant sitting on my chest, radiating to my left jaw and shoulder, with sudden sweating and shortness of breath that started 15 minutes ago.',
      hasAttachment: false,
      profile: PRESET_PROFILES[1], // Elena Rostova
    },
    {
      id: 'lifestyle_hypertension_sleep',
      title: 'Hyper-Personalized Lifestyle & Sleep Optimization',
      category: 'Public Health & Prevention',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon: Activity,
      description:
        'Evaluates hypertension baseline (132/86), 6 hours sleep, high stress, and 4x/week fast-food intake to deliver an actionable health action plan.',
      prompt:
        'Given my pre-hypertension, 6 hours of sleep, and sedentary software engineering work, what specific daily dietary swaps, ergonomic breaks, and sleep hygiene tweaks will lower my cardiovascular risk?',
      hasAttachment: false,
      profile: PRESET_PROFILES[0], // Alex Rivera
    },
  ];

  const handleLaunch = (scenario: typeof scenarios[0]) => {
    let attachments: AttachmentItem[] = [];
    if (scenario.hasAttachment && scenario.attachmentType) {
      const dataUrl = generateSampleMedicalImage(scenario.attachmentType);
      attachments = [
        {
          id: `sample_${scenario.id}`,
          name: scenario.attachmentName,
          type: scenario.attachmentType === 'blood_report' ? 'document' : 'image',
          mimeType: 'image/svg+xml',
          data: dataUrl,
          previewUrl: dataUrl,
          fileSize: 'Sample File',
          category: scenario.attachmentType === 'blood_report' ? 'lab_report' : 'rash',
        },
      ];
    }

    onSelectScenario(scenario.prompt, attachments, scenario.profile);
    onClose();
  };

  return (
    <div
      id="sample-scenarios-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="sample-scenarios-container"
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-teal-100/90 dark:border-slate-800 w-full max-w-3xl my-8 overflow-hidden max-h-[90vh] flex flex-col transition-colors"
      >
        {/* Header */}
        <div className="bg-slate-900 dark:bg-slate-950 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight font-display">Interactive Clinical Sample Scenarios</h2>
              <p className="text-xs text-slate-300">
                Test multimodal vision screening, lab document OCR, and emergency protocols in 1 click.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Scenarios */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {scenarios.map((sc) => {
            const Icon = sc.icon;
            return (
              <div
                key={sc.id}
                id={`scenario-card-${sc.id}`}
                onClick={() => handleLaunch(sc)}
                className="p-4 sm:p-5 rounded-2xl border border-teal-100/90 dark:border-slate-800 hover:border-teal-400 dark:hover:border-teal-500 hover:shadow-md bg-white dark:bg-slate-800/70 hover:bg-teal-50/40 dark:hover:bg-slate-800 transition-all cursor-pointer group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 flex-1">
                  <div className="p-3 bg-teal-50 dark:bg-slate-700 text-teal-700 dark:text-teal-300 rounded-2xl group-hover:bg-linear-to-r group-hover:from-teal-600 group-hover:to-emerald-600 group-hover:text-white transition-all shrink-0 shadow-2xs">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${sc.badgeColor}`}>
                        {sc.category}
                      </span>
                      {sc.hasAttachment && (
                        <span className="text-[10px] bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 px-2 py-0.5 rounded-md font-mono">
                          📎 Includes Sample {sc.attachmentType === 'rash' ? 'Skin Photo' : 'Lab Document'}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base group-hover:text-teal-950 dark:group-hover:text-teal-200 transition-colors font-display">
                      {sc.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{sc.description}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-teal-800 dark:text-teal-300 font-medium mt-2">
                      <User className="w-3.5 h-3.5" />
                      <span>
                        Preloads profile: <strong className="text-slate-900 dark:text-slate-100">{sc.profile.name}</strong> ({sc.profile.demographics.age}y,{' '}
                        {sc.profile.demographics.profession})
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-teal-50 dark:bg-slate-700/80 group-hover:bg-linear-to-r group-hover:from-teal-600 group-hover:to-emerald-600 text-teal-900 dark:text-teal-200 group-hover:text-white font-bold text-xs rounded-xl shadow-2xs transition-all shrink-0 cursor-pointer border border-teal-200/60 dark:border-slate-600 group-hover:border-transparent"
                >
                  <span>Launch Test</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
