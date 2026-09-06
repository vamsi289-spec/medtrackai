import React from 'react';
import { TriageLevel } from '../types';
import { AlertTriangle, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';

interface TriageBadgeProps {
  level: TriageLevel | string;
  size?: 'sm' | 'md' | 'lg';
}

export const TriageBadge: React.FC<TriageBadgeProps> = ({ level, size = 'md' }) => {
  let config = {
    bg: 'bg-emerald-50/90 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    icon: CheckCircle2,
    badgeText: 'Level 1: Self-Care',
    subtitle: 'Safe for home care & symptom monitoring',
    glow: 'ring-emerald-200/60 dark:ring-emerald-900/50',
    iconBg: 'bg-white/80 dark:bg-slate-800',
  };

  if (level.includes('Level 4') || level.includes('Critical') || level.includes('Emergency')) {
    config = {
      bg: 'bg-rose-50/90 dark:bg-rose-950/70 text-rose-950 dark:text-rose-200 border-rose-300 dark:border-rose-800 animate-pulse',
      icon: ShieldAlert,
      badgeText: 'Level 4: Critical Emergency',
      subtitle: 'Immediate medical evaluation / Call 911/112/108',
      glow: 'ring-rose-300/60 dark:ring-rose-900/60',
      iconBg: 'bg-white/80 dark:bg-slate-800',
    };
  } else if (level.includes('Level 3') || level.includes('Urgent')) {
    config = {
      bg: 'bg-amber-50/90 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200 border-amber-200 dark:border-amber-800',
      icon: AlertTriangle,
      badgeText: 'Level 3: Urgent Care within 24 Hours',
      subtitle: 'Seek prompt clinic / urgent care visit',
      glow: 'ring-amber-200/60 dark:ring-amber-900/50',
      iconBg: 'bg-white/80 dark:bg-slate-800',
    };
  } else if (level.includes('Level 2') || level.includes('Routine')) {
    config = {
      bg: 'bg-sky-50/90 dark:bg-sky-950/60 text-sky-950 dark:text-sky-200 border-sky-200 dark:border-sky-800',
      icon: Clock,
      badgeText: 'Level 2: Routine Consultation',
      subtitle: 'Schedule appointment with primary physician',
      glow: 'ring-sky-200/60 dark:ring-sky-900/50',
      iconBg: 'bg-white/80 dark:bg-slate-800',
    };
  }

  const Icon = config.icon;

  if (size === 'sm') {
    return (
      <span
        id={`triage-badge-${level.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg}`}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" />
        {config.badgeText}
      </span>
    );
  }

  return (
    <div
      id={`triage-card-${level.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`}
      className={`flex items-start gap-3 p-3.5 rounded-xl border ${config.bg} ring-2 ${config.glow}`}
    >
      <div className={`p-2 rounded-lg ${config.iconBg} shadow-xs shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="font-bold text-sm tracking-tight">{config.badgeText}</div>
        <div className="text-xs opacity-90 font-medium mt-0.5">{config.subtitle}</div>
      </div>
    </div>
  );
};
