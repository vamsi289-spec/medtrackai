import React from 'react';
import { BiomarkerAnalysis } from '../types';
import { FileText, AlertCircle, CheckCircle2, TrendingUp, TrendingDown, HelpCircle, Calendar } from 'lucide-react';

interface BiomarkerCardProps {
  data: BiomarkerAnalysis;
}

export const BiomarkerCard: React.FC<BiomarkerCardProps> = ({ data }) => {
  if (!data || !data.biomarkers || data.biomarkers.length === 0) return null;

  return (
    <div
      id="biomarker-analysis-card"
      className="bg-white/95 dark:bg-slate-900/95 rounded-2xl border border-teal-100 dark:border-slate-800 shadow-xs overflow-hidden my-4 transition-colors"
    >
      <div className="bg-slate-900 dark:bg-slate-950 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-teal-300" />
          <span className="font-semibold text-sm tracking-tight font-display">{data.reportTitle || 'Lab Biomarker Extraction'}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-300">
          {data.testDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {data.testDate}
            </span>
          )}
          <span className="px-2.5 py-0.5 rounded-full bg-teal-950 text-teal-300 font-medium border border-teal-800/80 text-[11px]">
            {data.abnormalCount > 0 ? `${data.abnormalCount} Abnormal Values` : 'All Within Range'}
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {data.summary && (
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 bg-teal-50/50 dark:bg-teal-950/30 p-3.5 rounded-xl border border-teal-100/80 dark:border-teal-900/40 mb-4 leading-relaxed">
            <strong className="text-teal-950 dark:text-teal-200 font-bold">Clinical Interpretation:</strong> {data.summary}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="pb-2.5 font-medium">Biomarker</th>
                <th className="pb-2.5 font-medium">Result Value</th>
                <th className="pb-2.5 font-medium">Standard Reference Range</th>
                <th className="pb-2.5 font-medium">Status Flag</th>
                <th className="pb-2.5 font-medium">Plain-Language Meaning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.biomarkers.map((bm, index) => {
                const isHigh = bm.status?.toLowerCase() === 'high';
                const isLow = bm.status?.toLowerCase() === 'low';
                const isNormal = !isHigh && !isLow;

                return (
                  <tr key={index} className="hover:bg-teal-50/30 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200">{bm.name}</td>
                    <td className="py-2.5 font-bold">
                      <span
                        className={
                          isHigh
                            ? 'text-rose-700 dark:text-rose-400 font-extrabold'
                            : isLow
                            ? 'text-amber-700 dark:text-amber-400 font-extrabold'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }
                      >
                        {bm.value} {bm.unit}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400">{bm.referenceRange || 'Standard'}</td>
                    <td className="py-2.5">
                      {isHigh && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          <TrendingUp className="w-3 h-3 text-rose-600 dark:text-rose-400" /> HIGH
                        </span>
                      )}
                      {isLow && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <TrendingDown className="w-3 h-3 text-amber-600 dark:text-amber-400" /> LOW
                        </span>
                      )}
                      {isNormal && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Normal
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-300 max-w-xs leading-relaxed">{bm.plainLanguageMeaning}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {data.keyRecommendations && data.keyRecommendations.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-teal-900 dark:text-teal-300 uppercase tracking-wider mb-2">
              Key Biomarker Follow-up Recommendations:
            </h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
              {data.keyRecommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-1.5 bg-teal-50/60 dark:bg-teal-950/30 p-2.5 rounded-xl border border-teal-100 dark:border-teal-900/40 text-slate-700 dark:text-slate-300">
                  <span className="text-teal-600 dark:text-teal-400 font-bold">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
