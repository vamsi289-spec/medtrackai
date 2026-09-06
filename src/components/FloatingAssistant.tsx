import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  ShieldCheck,
  Minimize2,
  Maximize2,
  ChevronDown,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { MedtrackLogo } from './MedtrackLogo';
import { AuthUser, UserRole, MedTrackAssistantMessage } from '../types';

interface FloatingAssistantProps {
  currentUser: AuthUser | null;
  currentPage: string;
  activePatient?: any;
  onNavigate?: (page: string) => void;
}

export const FloatingAssistant: React.FC<FloatingAssistantProps> = ({
  currentUser,
  currentPage,
  activePatient,
  onNavigate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const role: UserRole = currentUser?.role || 'patient';

  const defaultGreeting: MedTrackAssistantMessage = {
    id: 'msg_welcome',
    role: 'assistant',
    content:
      role === 'doctor'
        ? `Hello, Dr. ${currentUser?.name || 'Doctor'}. I am **MedTrack AI**, your clinical co-pilot. I can assist you with patient triage protocols, reviewing clinical notes, finding nearby medical facilities, and navigating the doctor workspace.`
        : `Hello ${currentUser?.name || 'there'}! I am **MedTrack AI**, your personal health assistant. I can help answer health-related questions, explain medical reports, locate pharmacies, or guide you through your dashboard. How may I assist you today?`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  const [messages, setMessages] = useState<MedTrackAssistantMessage[]>([defaultGreeting]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  // Contextual quick prompt chips based on current page and role
  const getContextualChips = () => {
    if (role === 'doctor') {
      switch (currentPage) {
        case 'patients':
          return [
            'How do I add a new patient?',
            'Standard vitals threshold guidelines',
            'Differential diagnosis reference',
          ];
        case 'appointments':
          return [
            'How to confirm a scheduled consultation',
            'Follow-up interval recommendations',
          ];
        case 'maps':
          return [
            'Locate nearby tertiary referral hospitals',
            'Find 24/7 pharmacies with oxygen supply',
          ];
        default:
          return [
            'Review clinical red-flag checklist',
            'Explain abnormal biomarker ranges',
            'How to export patient clinical brief',
          ];
      }
    } else {
      switch (currentPage) {
        case 'records':
        case 'consultation':
          return [
            'How to upload my blood test report',
            'Can you pre-screen a rash photo?',
            'What does high fasting glucose mean?',
          ];
        case 'appointments':
          return [
            'How to book a consultation',
            'Questions to prepare for my doctor',
          ];
        case 'maps':
          return [
            'Find the nearest open pharmacy',
            'Where is the closest emergency room?',
          ];
        default:
          return [
            'How do I calculate my BMI & water intake?',
            'What are common symptoms of dehydration?',
            'How to set up daily health reminders',
          ];
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    const userMsg: MedTrackAssistantMessage = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          role,
          currentPage,
          patientContext: activePatient || null,
          chatHistory: messages.slice(-4),
        }),
      });

      const data = await response.json();

      const aiMsg: MedTrackAssistantMessage = {
        id: `msg_a_${Date.now()}`,
        role: 'assistant',
        content:
          data.text ||
          "I'm MedTrack AI, designed specifically for healthcare and MedTrack-related assistance. I can't assist with unrelated external topics.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: data.sources || [],
        isWarning: data.isWarning || false,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_err_${Date.now()}`,
          role: 'assistant',
          content:
            "I'm currently unable to reach the clinical assistant server. Please check your internet connection or retry shortly.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="medtrack-floating-assistant" className="fixed bottom-5 right-5 z-40 print:hidden">
      {/* Floating Trigger Button when closed */}
      {!isOpen && (
        <button
          id="open-floating-assistant-btn"
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 border border-teal-400/30"
          aria-label="Open MedTrack AI Assistant"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-white" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-300 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full" />
          </div>
          <span className="text-xs font-bold tracking-wide">MedTrack AI</span>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-medium">
            {role === 'doctor' ? 'Clinical' : 'Assistant'}
          </span>
        </button>
      )}

      {/* Expanded Assistant Card */}
      {isOpen && (
        <div
          className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-all flex flex-col ${
            isMinimized ? 'w-80 h-14' : 'w-88 sm:w-96 h-[560px] max-h-[82vh]'
          }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold tracking-tight">MedTrack AI</h3>
                  <span className="text-[9px] bg-white/25 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">
                    {role}
                  </span>
                </div>
                <p className="text-[10px] text-teal-100 font-medium">
                  {currentPage.charAt(0).toUpperCase() + currentPage.slice(1)} Context Active
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Context bar */}
              <div className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  Healthcare & Navigation Grounding
                </span>
                <span className="text-[10px] text-slate-400">MedTrack v2.0</span>
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div
                      className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-teal-600 text-white rounded-tr-none'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200/60 dark:border-slate-700/60'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                      <div
                        className={`text-[9px] mt-1 text-right ${
                          msg.role === 'user' ? 'text-teal-200' : 'text-slate-400'
                        }`}
                      >
                        {msg.timestamp}
                      </div>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-2.5 items-center text-xs text-slate-500 dark:text-slate-400">
                    <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-3.5 py-2.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                      <span className="text-[11px] ml-1">Analyzing clinical context...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Context chips */}
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex gap-1.5 overflow-x-auto no-scrollbar">
                {getContextualChips().map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(chip)}
                    className="shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors whitespace-nowrap"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Input toolbar */}
              <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    id="floating-assistant-input"
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask MedTrack AI about healthcare or navigation..."
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 dark:text-white"
                  />
                  <button
                    id="floating-assistant-send-btn"
                    type="submit"
                    disabled={!inputMessage.trim() || isLoading}
                    className="p-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>

                {/* Medical Disclaimer footnote */}
                <div className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 text-center leading-tight">
                  Informational AI assistance only. Does not replace professional medical advice.
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
