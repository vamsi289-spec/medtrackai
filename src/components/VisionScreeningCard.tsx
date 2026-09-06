import React from 'react';
import { VisionPreScreening } from '../types';
import { Eye, Shield, AlertCircle, Stethoscope, Sparkles, Check, ChevronRight } from 'lucide-react';

interface VisionScreeningCardProps {
  data: VisionPreScreening;
}

export const VisionScreeningCard: React.FC<VisionScreeningCardProps> = ({ data }) => {
  if (!data || !data.differentialDiagnoses) return null;

  return (
    <div
      id="vision-prescreening-card"
      className="bg-white/95 dark:bg-slate-900/95 rounded-2xl border border-teal-100 dark:border-slate-800 shadow-xs overflow-hidden my-4 transition-colors"
    >
      <div className="bg-slate-900 dark:bg-slate-950 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-teal-800 text-teal-300 rounded-lg">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight font-display">Multimodal Visual Pre-Screening</span>
            <div className="text-[11px] text-teal-300">AI Clinical Pattern &amp; Morphology Analysis</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-950 text-teal-300 border border-teal-800/80">
            Confidence: {data.confidenceScore || 'Moderate'}
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Morphology & Location Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-teal-50/50 dark:bg-teal-950/30 p-3.5 rounded-xl border border-teal-100/80 dark:border-teal-900/40">
          <div>
            <span className="font-semibold text-teal-950 dark:text-teal-300 block">Anatomical Region / Presentation:</span>
            <span className="text-slate-600 dark:text-slate-300">{data.anatomicalLocation || 'Skin surface'}</span>
          </div>
          <div>
            <span className="font-semibold text-teal-950 dark:text-teal-300 block">Visual Morphology Observed:</span>
            <span className="text-slate-600 dark:text-slate-300">{data.visualMorphology || 'Erythema with demarcated border'}</span>
          </div>
        </div>

        {/* Differential Diagnoses */}
        <div>
          <h4 className="text-xs font-bold text-teal-950 dark:text-teal-300 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Potential Differential Conditions:</span>
            <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 lowercase">(for doctor discussion)</span>
          </h4>

          <div className="space-y-2.5">
            {data.differentialDiagnoses.map((diff, index) => {
              const isHigh = diff.likelihood === 'High';
              const isMod = diff.likelihood === 'Moderate';

              return (
                <div
                  key={index}
                  className="p-3.5 rounded-xl border border-teal-100 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-xs transition-all text-xs"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      {diff.condition}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        isHigh
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          : isMod
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {diff.likelihood} Likelihood
                    </span>
                  </div>

                  <p className="text-slate-600 dark:text-slate-300 mb-1 leading-relaxed">{diff.educationalInfo}</p>
                  <div className="text-slate-600 dark:text-slate-300 italic bg-teal-50/40 dark:bg-teal-950/40 p-2 rounded-lg border border-teal-100/60 dark:border-teal-900/40 mt-1.5">
                    <strong className="text-teal-950 dark:text-teal-200">Distinguishing Features:</strong> {diff.distinguishingFeatures}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Home Comfort & Specialist pathway */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="bg-teal-50/40 dark:bg-teal-950/30 p-3.5 rounded-xl border border-teal-100 dark:border-teal-900/40">
            <span className="font-bold text-teal-950 dark:text-teal-300 flex items-center gap-1 mb-1.5">
              <Shield className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              Symptom Relief Comfort Measures:
            </span>
            <ul className="space-y-1 text-slate-600 dark:text-slate-300">
              {data.homeComfortMeasures?.map((measure, i) => (
                <li key={i} className="flex items-start gap-1">
                  <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                  <span>{measure}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-linear-to-br from-teal-50/80 to-emerald-50/60 dark:from-teal-950/40 dark:to-emerald-950/30 p-3.5 rounded-xl border border-teal-200 dark:border-teal-900/50 flex flex-col justify-between">
            <div>
              <span className="font-bold text-teal-950 dark:text-teal-200 flex items-center gap-1 mb-1">
                <Stethoscope className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                Recommended Specialist:
              </span>
              <p className="text-teal-900 dark:text-teal-100 font-bold">{data.specialistToSee || 'Dermatologist'}</p>
              <p className="text-[11px] text-teal-800 dark:text-teal-300 mt-1">
                Bring this visual pre-screening log and note lesion evolution timeline.
              </p>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
              *Preliminary AI visual pre-screening. Not a diagnostic biopsy or skin culture.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
