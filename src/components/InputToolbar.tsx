import React, { useState, useRef, useEffect } from 'react';
import { AttachmentItem } from '../types';
import { unlockBrowserAudioContext } from '../utils/notifications';
import { generateSampleMedicalImage } from '../utils/healthCalculators';
import {
  Send,
  Mic,
  MicOff,
  Loader2,
  AlertCircle,
  Paperclip,
  Camera,
  Globe,
  X,
  FileText,
  Image as ImageIcon,
  Check,
  Video,
} from 'lucide-react';

interface InputToolbarProps {
  onSendMessage: (message: string, attachments?: AttachmentItem[]) => void;
  isLoading: boolean;
  onOpenSampleScenarios?: () => void;
}

export const InputToolbar: React.FC<InputToolbarProps> = ({
  onSendMessage,
  isLoading,
}) => {
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [isRagActive, setIsRagActive] = useState(true);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Auto resize textarea to content height (capped at 180px)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputText]);

  // Setup Speech Recognition for voice dictation
  useEffect(() => {
    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => (result as any)[0]?.transcript || '')
            .join('');
          if (transcript) {
            setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
          }
        };

        recognition.onerror = (event: any) => {
          setIsRecordingVoice(false);
          const errType = event?.error;
          if (errType === 'not-allowed') {
            setVoiceNotice('Microphone access blocked. Please enable microphone permission in browser settings.');
            setTimeout(() => setVoiceNotice(null), 5000);
          }
        };

        recognition.onend = () => {
          setIsRecordingVoice(false);
        };

        recognitionRef.current = recognition;
      }
    } catch {
      // Ignored
    }
  }, []);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const toggleVoiceRecording = async () => {
    unlockBrowserAudioContext().catch(() => {});

    if (!recognitionRef.current) {
      setVoiceNotice('Speech recognition is not supported in this browser. Please type your message.');
      setTimeout(() => setVoiceNotice(null), 4000);
      return;
    }

    if (isRecordingVoice) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignored
      }
      setIsRecordingVoice(false);
    } else {
      try {
        setVoiceNotice(null);
        recognitionRef.current.start();
        setIsRecordingVoice(true);
      } catch {
        setIsRecordingVoice(false);
      }
    }
  };

  // Process selected files into AttachmentItems
  const processFiles = (files: FileList | File[]) => {
    Array.from(files).forEach((file) => {
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');
      const reader = new FileReader();

      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const newAtt: AttachmentItem = {
          id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          type: isImage ? 'image' : 'document',
          mimeType: file.type || (isPdf ? 'application/pdf' : 'application/octet-stream'),
          data: dataUrl,
          previewUrl: dataUrl,
          fileSize: `${(file.size / 1024).toFixed(1)} KB`,
          category: isImage ? 'rash' : 'lab_report',
        };
        setAttachments((prev) => [...prev, newAtt]);
      };

      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Camera stream handling
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraModalOpen(true);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      } else {
        // Fallback directly to native camera input
        cameraInputRef.current?.click();
        setIsCameraModalOpen(false);
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      // Fallback directly to device file/camera picker
      cameraInputRef.current?.click();
      setIsCameraModalOpen(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraModalOpen(false);
  };

  const capturePhotoSnapshot = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const newAtt: AttachmentItem = {
          id: `att_cam_${Date.now()}`,
          name: `Clinical_Snapshot_${new Date().toLocaleTimeString().replace(/:/g, '-')}.jpg`,
          type: 'image',
          mimeType: 'image/jpeg',
          data: dataUrl,
          previewUrl: dataUrl,
          fileSize: 'Photo Snapshot',
          category: 'rash',
        };
        setAttachments((prev) => [...prev, newAtt]);
      }
    }
    stopCamera();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && attachments.length === 0) || isLoading) return;

    onSendMessage(inputText.trim(), attachments);
    setInputText('');
    setAttachments([]);
  };

  return (
    <div className="bg-[#071120] dark:bg-[#071120] border-t border-slate-800/80 p-3 sm:p-4 sticky bottom-0 z-20 transition-colors duration-200">
      <div className="max-w-4xl mx-auto space-y-2.5">
        {/* Voice Dictation Notification */}
        {voiceNotice && (
          <div className="flex items-center gap-2 p-2.5 bg-amber-950/70 border border-amber-800 rounded-xl text-xs text-amber-200 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="grow">{voiceNotice}</span>
            <button
              type="button"
              onClick={() => setVoiceNotice(null)}
              className="p-1 text-amber-300 hover:text-white cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        {/* Hidden File and Camera Inputs */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*,.pdf,.doc,.docx,.txt"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        <input
          type="file"
          ref={cameraInputRef}
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Input Form Box */}
        <form
          onSubmit={handleFormSubmit}
          className="rounded-2xl border border-slate-700/80 bg-[#0c182b] focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500/40 shadow-xl transition-all"
        >
          {/* Attachment Tray */}
          {attachments.length > 0 && (
            <div className="flex items-center gap-2 p-2.5 border-b border-slate-700/60 overflow-x-auto scrollbar-none">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-1.5 p-1.5 pr-2 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-slate-200 shrink-0 animate-in fade-in"
                >
                  {att.type === 'image' && att.previewUrl ? (
                    <img
                      src={att.previewUrl}
                      alt={att.name}
                      className="w-6 h-6 rounded-lg object-cover"
                    />
                  ) : (
                    <FileText className="w-4 h-4 text-amber-400" />
                  )}
                  <span className="max-w-[120px] truncate text-[11px] font-medium">
                    {att.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="p-0.5 text-slate-400 hover:text-rose-400 rounded-full cursor-pointer"
                    title="Remove attachment"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="p-3 sm:p-3.5">
            <textarea
              ref={textareaRef}
              id="medtrack-message-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleFormSubmit(e);
                }
              }}
              rows={2}
              placeholder="Describe your symptoms (e.g. 'I noticed an itchy red rash on my arm after gardening' or 'My fasting glucose came back high')..."
              className="w-full text-xs sm:text-sm text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-transparent resize-none outline-hidden min-h-[48px] leading-relaxed"
            />

            {/* Bottom Actions Bar matching Image 2 */}
            <div className="flex items-center justify-between gap-2 pt-2.5">
              {/* Left 4 icon buttons: Paperclip, Camera, Mic, Globe */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Paperclip (File / Document / Image Attachment) */}
                <button
                  type="button"
                  id="attach-file-btn"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-teal-400 hover:text-teal-300 hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer"
                  title="Attach lab report, document, or image"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                {/* Camera (Live snapshot / photo vision) */}
                <button
                  type="button"
                  id="camera-capture-btn"
                  onClick={startCamera}
                  className="p-2 text-teal-400 hover:text-teal-300 hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer"
                  title="Take photo of rash, lesion, or clinical document"
                >
                  <Camera className="w-5 h-5" />
                </button>

                {/* Microphone (Voice dictation) */}
                <button
                  type="button"
                  id="voice-dictate-btn"
                  onClick={toggleVoiceRecording}
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${
                    isRecordingVoice
                      ? 'bg-rose-950 text-rose-300 animate-pulse border border-rose-800'
                      : 'text-teal-400 hover:text-teal-300 hover:bg-slate-800/80'
                  }`}
                  title={isRecordingVoice ? 'Stop recording voice' : 'Speak symptoms (Voice dictation)'}
                >
                  {isRecordingVoice ? (
                    <MicOff className="w-5 h-5 text-rose-400" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </button>

                {/* Globe (RAG Medical Grounding toggle) */}
                <button
                  type="button"
                  id="rag-grounding-toggle-btn"
                  onClick={() => setIsRagActive((prev) => !prev)}
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${
                    isRagActive
                      ? 'text-teal-400 hover:text-teal-300 hover:bg-slate-800/80'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/80'
                  }`}
                  title={isRagActive ? 'Medical Knowledge Grounding active (PubMed / CDC / WHO)' : 'RAG Grounding paused'}
                >
                  <Globe className="w-5 h-5" />
                </button>
              </div>

              {/* Submit / Analyze Button */}
              <button
                type="submit"
                id="send-consultation-btn"
                disabled={(!inputText.trim() && attachments.length === 0) || isLoading}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition-all active:scale-98 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <span>Analyze &amp; Triage</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Quick scenarios & Grounding pill matching Image 2 */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold text-xs sm:text-sm">
              Quick scenarios:
            </span>

            {/* Annular Rash & Itching */}
            <button
              type="button"
              id="scenario-annular-rash"
              onClick={() => {
                setInputText(
                  'I noticed an itchy circular rash with raised red borders on my left forearm 2 days ago after gardening. It has slight central clearing and itches intensely at night. Please analyze this photo against my profile.'
                );
                const sampleRash = generateSampleMedicalImage('rash');
                setAttachments([
                  {
                    id: `att_rash_${Date.now()}`,
                    name: 'Forearm_Annular_Rash.svg',
                    type: 'image',
                    mimeType: 'image/svg+xml',
                    data: sampleRash,
                    previewUrl: sampleRash,
                    fileSize: '4.8 KB',
                    category: 'rash',
                  },
                ]);
              }}
              className="border border-teal-500/60 bg-teal-950/40 hover:bg-teal-900/60 text-teal-300 text-xs px-3.5 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>🔍</span>
              <span>Annular Rash &amp; Itching</span>
            </button>

            {/* Pre-Diabetes Lab Review */}
            <button
              type="button"
              id="scenario-prediabetes-lab"
              onClick={() => {
                setInputText(
                  'My fasting glucose came back high at 118 mg/dL and HbA1c is 5.9%. What dietary and lifestyle adjustments should I make given my desk job?'
                );
                const sampleReport = generateSampleMedicalImage('blood_report');
                setAttachments([
                  {
                    id: `att_lab_${Date.now()}`,
                    name: 'Metabolic_Blood_Panel.svg',
                    type: 'document',
                    mimeType: 'image/svg+xml',
                    data: sampleReport,
                    previewUrl: sampleReport,
                    fileSize: '8.2 KB',
                    category: 'lab_report',
                  },
                ]);
              }}
              className="border border-indigo-500/60 bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 text-xs px-3.5 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>📊</span>
              <span>Pre-Diabetes Lab Review</span>
            </button>

            {/* Severe Chest Tightness */}
            <button
              type="button"
              id="scenario-chest-tightness"
              onClick={() => {
                setInputText(
                  'I feel severe crushing pain in the middle of my chest radiating to my left arm, along with shortness of breath and cold sweat.'
                );
                setAttachments([]);
              }}
              className="border border-rose-500/60 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs px-3.5 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>🚨</span>
              <span>Severe Chest Tightness</span>
            </button>
          </div>

          {/* RAG Grounding status badge */}
          <button
            type="button"
            onClick={() => setIsRagActive((prev) => !prev)}
            className={`border text-xs px-3 py-1 rounded-xl font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              isRagActive
                ? 'border-teal-500/60 bg-teal-950/40 text-teal-300'
                : 'border-slate-700 bg-slate-900/60 text-slate-400'
            }`}
            title="Toggle RAG Evidence Grounding"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isRagActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
            />
            <span>
              {isRagActive
                ? 'RAG Grounding: PubMed / CDC / WHO Active'
                : 'RAG Grounding: Paused'}
            </span>
          </button>
        </div>
      </div>

      {/* Live Camera Snapshot Modal */}
      {isCameraModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#0c182b] border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="p-3.5 border-b border-slate-700/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-sm text-white">Capture Clinical Photo</h3>
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative bg-black flex items-center justify-center aspect-4/3 overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center p-4 bg-black/80 text-rose-300 text-xs text-center">
                  {cameraError}
                </div>
              )}
            </div>

            <div className="p-4 flex items-center justify-between gap-3 bg-[#081225]">
              <button
                type="button"
                onClick={() => {
                  cameraInputRef.current?.click();
                  stopCamera();
                }}
                className="px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Choose Photo from Gallery
              </button>

              <button
                type="button"
                onClick={capturePhotoSnapshot}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Snap Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
