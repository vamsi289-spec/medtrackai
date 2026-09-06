import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ConsultationMessage, UserProfile } from '../types';
import { TriageBadge } from './TriageBadge';
import { BiomarkerCard } from './BiomarkerCard';
import { VisionScreeningCard } from './VisionScreeningCard';
import { MedtrackLogo } from './MedtrackLogo';
import { speakConsultationAloud, stopSpeakingAloud } from '../utils/notifications';
import {
  Bot,
  User,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Stethoscope,
  BookOpen,
  Pill,
  HeartPulse,
  Share2,
  ShieldCheck,
  Sparkles,
  MapPin,
} from 'lucide-react';

interface ConsultationFeedProps {
  messages: ConsultationMessage[];
  currentProfile: UserProfile;
  isLoading: boolean;
  onOpenProfileModal: () => void;
  onOpenSampleScenarios: () => void;
  onOpenPharmacyLocator?: (meds?: string[]) => void;
}

export const ConsultationFeed: React.FC<ConsultationFeedProps> = ({
  messages,
  currentProfile,
  isLoading,
  onOpenProfileModal,
  onOpenSampleScenarios,
  onOpenPharmacyLocator,
}) => {
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // High-reliability Web Speech API Text-to-Speech with chunking & un-suspension
  const handleSpeak = (id: string, text: string) => {
    if (speakingMessageId === id) {
      stopSpeakingAloud();
      setSpeakingMessageId(null);
      return;
    }

    setSpeakingMessageId(id);
    speakConsultationAloud(
      text,
      () => setSpeakingMessageId(id),
      () => setSpeakingMessageId(null),
      () => setSpeakingMessageId(null)
    );
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (messages.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 flex flex-col items-center justify-center text-center">
        <div className="p-3.5 rounded-3xl bg-linear-to-b from-teal-50 to-emerald-50 dark:from-slate-800 dark:to-slate-900 border border-teal-100 dark:border-slate-800 flex items-center justify-center mb-4 shadow-sm">
          <MedtrackLogo size={64} animated={true} />
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight font-display">
          Welcome to Medtrack AI
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-lg mt-2 leading-relaxed">
          Your hyper-personalized public health &amp; clinical triage assistant. We combine your lifestyle baseline, multimodal vision pre-screening, and real-time medical knowledge retrieval.
        </p>

        {/* Current Active Baseline Card */}
        <div className="mt-6 p-4.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-teal-100/90 dark:border-slate-800 shadow-xs text-left w-full max-w-lg transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-teal-900 dark:text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Active Patient Baseline
            </span>
            <button
              onClick={onOpenProfileModal}
              className="text-xs text-teal-700 dark:text-teal-400 font-semibold hover:text-teal-900 dark:hover:text-teal-200 underline decoration-teal-300 cursor-pointer"
            >
              Edit Baseline
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200">Patient:</span> {currentProfile.name} (
              {currentProfile.demographics.age}y {currentProfile.demographics.gender})
            </div>
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200">BMI:</span> {currentProfile.metrics.bmi}{' '}
              ({currentProfile.metrics.bmiCategory})
            </div>
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200">Profession:</span>{' '}
              {currentProfile.demographics.profession}
            </div>
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200">Known:</span>{' '}
              {currentProfile.healthHistory.knownConditions.slice(0, 2).join(', ') || 'None noted'}
            </div>
          </div>
        </div>

        {/* Quick Launch Cards */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-4 gap-3 w-full max-w-3xl text-left">
          <div
            onClick={onOpenSampleScenarios}
            className="p-3.5 rounded-2xl bg-linear-to-br from-teal-50/70 via-white to-emerald-50/40 dark:from-teal-950/40 dark:via-slate-900 dark:to-emerald-950/30 border border-teal-100 dark:border-teal-900/40 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-md cursor-pointer transition-all group"
          >
            <div className="p-2 bg-teal-100/80 dark:bg-teal-900/80 text-teal-800 dark:text-teal-200 rounded-xl w-fit mb-2.5 group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 font-display">Interactive Scenarios</h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Test rash dermatology, blood panel OCR, and red flags in 1 click.
            </p>
          </div>

          <div
            onClick={onOpenProfileModal}
            className="p-3.5 rounded-2xl bg-linear-to-br from-indigo-50/70 via-white to-sky-50/40 dark:from-indigo-950/40 dark:via-slate-900 dark:to-sky-950/30 border border-indigo-100 dark:border-indigo-900/40 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md cursor-pointer transition-all group"
          >
            <div className="p-2 bg-indigo-100/80 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-200 rounded-xl w-fit mb-2.5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <User className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 font-display">Patient Context</h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Customize metrics, sleep, medications, and allergies.
            </p>
          </div>

          <div
            onClick={() => onOpenPharmacyLocator && onOpenPharmacyLocator()}
            className="p-3.5 rounded-2xl bg-linear-to-br from-emerald-50/70 via-white to-teal-50/40 dark:from-emerald-950/40 dark:via-slate-900 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-900/40 hover:border-emerald-400 dark:hover:border-emerald-700 hover:shadow-md cursor-pointer transition-all group"
          >
            <div className="p-2 bg-emerald-100/80 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 rounded-xl w-fit mb-2.5 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <MapPin className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 font-display">Nearby Medical Stores</h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Google Maps GPS lookup for your required medicines &amp; pharmacies.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-linear-to-br from-sky-50/70 via-white to-emerald-50/40 dark:from-sky-950/40 dark:via-slate-900 dark:to-emerald-950/30 border border-sky-100 dark:border-sky-900/40 shadow-2xs">
            <div className="p-2 bg-sky-100/80 dark:bg-sky-900/80 text-sky-800 dark:text-sky-200 rounded-xl w-fit mb-2.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 font-display">Clinical Safety</h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Evidence-based clinical triage and patient wellness guidance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {messages.map((msg) => {
        const isUser = msg.role === 'user';
        const isEmergency = msg.isEmergencyOverride || msg.triageLevel?.includes('Level 4');

        return (
          <div
            key={msg.id}
            id={`message-${msg.id}`}
            className={`flex items-start gap-3 sm:gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs overflow-hidden ${
                isUser
                  ? currentProfile.avatarUrl
                    ? 'border border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-800 dark:bg-slate-700 text-white'
                  : isEmergency
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-linear-to-tr from-teal-600 to-emerald-500 text-white'
              }`}
            >
              {isUser ? (
                currentProfile.avatarUrl ? (
                  <img
                    src={currentProfile.avatarUrl}
                    alt={currentProfile.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5" />
                )
              ) : (
                <Bot className="w-5 h-5" />
              )}
            </div>

            {/* Message Bubble Container */}
            <div className={`flex-1 max-w-3xl ${isUser ? 'items-end text-right' : 'items-start text-left'}`}>
              {/* Sender Name & Timestamp */}
              <div className="flex items-center gap-2 mb-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium px-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{isUser ? currentProfile.name : 'MedTrack AI'}</span>
                <span>•</span>
                <span>{msg.timestamp}</span>
              </div>

              {/* Main Content Box */}
              <div
                className={`p-4 sm:p-5 rounded-2xl shadow-xs text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-slate-800 dark:bg-slate-800 text-white border border-slate-700 dark:border-slate-700 rounded-tr-xs shadow-slate-800/10'
                    : isEmergency
                    ? 'bg-rose-50/90 dark:bg-rose-950/70 border-2 border-rose-300 dark:border-rose-700 text-slate-900 dark:text-rose-100 rounded-tl-xs shadow-rose-100/50'
                    : 'bg-white/95 dark:bg-slate-900/95 border border-teal-100/90 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-xs shadow-2xs'
                }`}
              >
                {/* User Attachments Render */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {msg.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 max-w-[200px]"
                      >
                        {att.previewUrl ? (
                          <img
                            src={att.previewUrl}
                            alt={att.name}
                            className="w-full h-28 object-cover cursor-pointer"
                            onClick={() => window.open(att.previewUrl, '_blank')}
                          />
                        ) : (
                          <div className="p-3 text-xs text-slate-700 dark:text-slate-300 font-medium">{att.name}</div>
                        )}
                        <div className="p-1.5 text-[10px] text-slate-500 dark:text-slate-400 truncate bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                          {att.name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Multimodal Pre-Screening Cards (if available) */}
                {msg.visionPreScreening && <VisionScreeningCard data={msg.visionPreScreening} />}
                {msg.biomarkerAnalysis && <BiomarkerCard data={msg.biomarkerAnalysis} />}

                {/* Formatted Markdown Content */}
                <div className="text-xs sm:text-sm leading-relaxed space-y-2 text-slate-800 dark:text-slate-200">
                  <ReactMarkdown
                    components={{
                      a: ({ ...props }) => (
                        <a
                          {...props}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-700 dark:text-teal-400 underline font-semibold hover:text-teal-900 dark:hover:text-teal-200"
                        />
                      ),
                      h1: ({ ...props }) => (
                        <h1 {...props} className="text-base sm:text-lg font-extrabold text-slate-950 dark:text-slate-100 mt-3 mb-1.5 font-display" />
                      ),
                      h2: ({ ...props }) => (
                        <h2 {...props} className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mt-2.5 mb-1 font-display" />
                      ),
                      h3: ({ ...props }) => (
                        <h3 {...props} className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mt-2.5 mb-1 font-display" />
                      ),
                      p: ({ ...props }) => <p {...props} className="mb-2 last:mb-0 leading-relaxed text-slate-800 dark:text-slate-200" />,
                      ul: ({ ...props }) => <ul {...props} className="list-disc pl-5 my-1.5 space-y-1 text-slate-800 dark:text-slate-200" />,
                      ol: ({ ...props }) => <ol {...props} className="list-decimal pl-5 my-1.5 space-y-1 text-slate-800 dark:text-slate-200" />,
                      li: ({ ...props }) => <li {...props} className="leading-relaxed pl-0.5" />,
                      strong: ({ ...props }) => <strong {...props} className="font-bold text-slate-900 dark:text-slate-100" />,
                      blockquote: ({ ...props }) => (
                        <blockquote {...props} className="border-l-4 border-teal-400 dark:border-teal-500 pl-3 py-1.5 bg-teal-50/70 dark:bg-teal-950/50 rounded-r-lg text-teal-950 dark:text-teal-200 italic my-2" />
                      ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>

                {/* Assistant Message Actions Toolbar */}
                {!isUser && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      {/* TTS Speak Aloud */}
                      <button
                        id={`speak-msg-${msg.id}`}
                        onClick={() => handleSpeak(msg.id, msg.content)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors border cursor-pointer ${
                          speakingMessageId === msg.id
                            ? 'bg-teal-100 dark:bg-teal-900/80 text-teal-900 dark:text-teal-200 font-bold border-teal-300 dark:border-teal-700'
                            : 'hover:bg-teal-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent hover:border-teal-200 dark:hover:border-slate-700'
                        }`}
                        title="Read consultation aloud"
                      >
                        {speakingMessageId === msg.id ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5" />
                            <span>Stop Speaking</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Read Aloud</span>
                          </>
                        )}
                      </button>

                      {/* Copy Text */}
                      <button
                        id={`copy-msg-${msg.id}`}
                        onClick={() => handleCopyText(msg.id, msg.content)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700 cursor-pointer"
                        title="Copy medical report"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-emerald-700 dark:text-emerald-300 font-semibold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      {/* Find Nearby Stores with Stock */}
                      <button
                        id={`pharmacy-msg-${msg.id}`}
                        onClick={() => onOpenPharmacyLocator && onOpenPharmacyLocator()}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 transition-colors border border-emerald-200 dark:border-emerald-800 text-xs font-semibold cursor-pointer"
                        title="Locate nearest pharmacies with required medicine stock via Google Maps"
                      >
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Find Nearby Pharmacies</span>
                      </button>
                    </div>

                    <div className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                      MedTrack AI • Encrypted Clinical Session
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Loading Skeleton Indicator */}
      {isLoading && (
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shrink-0 animate-pulse">
            <Bot className="w-5 h-5" />
          </div>
          <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-teal-100 dark:border-slate-800 shadow-xs text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md">
            <div className="flex items-center gap-2 mb-2 font-bold text-teal-900 dark:text-teal-200">
              <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 animate-spin" />
              <span>Analyzing baseline &amp; retrieving medical knowledge...</span>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-teal-50 dark:bg-teal-950/80 rounded-full w-5/6 animate-pulse"></div>
              <div className="h-3 bg-teal-50/70 dark:bg-teal-950/60 rounded-full w-4/6 animate-pulse"></div>
              <div className="h-3 bg-teal-50/50 dark:bg-teal-950/40 rounded-full w-3/6 animate-pulse"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

