import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, Gender, ExerciseFrequency, JunkFoodIntake, ConsultationMessage } from '../types';
import { PRESET_PROFILES, calculateBMI, calculateTDEE } from '../utils/healthCalculators';
import { generateHealthRecordPDF } from '../utils/pdfGenerator';
import {
  User,
  Heart,
  Activity,
  Scale,
  X,
  Check,
  Briefcase,
  Pill,
  Upload,
  Camera,
  Trash2,
  Copy,
  RefreshCw,
  HardDrive,
  Fingerprint,
  RotateCcw,
  Sparkles,
  Bell,
  FileDown,
  FileText,
  CheckCircle2,
  MapPin,
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: UserProfile;
  onSaveProfile: (updatedProfile: UserProfile) => void;
  onClearCache?: () => void;
  onOpenReminderSettings?: () => void;
  messages?: ConsultationMessage[];
  onRefreshData?: () => void;
  onOpenPharmacyLocator?: (meds?: string[]) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onSaveProfile,
  onClearCache,
  onOpenReminderSettings,
  messages = [],
  onRefreshData,
  onOpenPharmacyLocator,
}) => {
  const [formData, setFormData] = useState<UserProfile>({ ...currentProfile });
  const [newCondition, setNewCondition] = useState('');
  const [newAllergy, setNewAllergy] = useState('');
  const [newMedication, setNewMedication] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [cacheClearedSuccess, setCacheClearedSuccess] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [lastRefreshedTime, setLastRefreshedTime] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Sync state if currentProfile changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({ ...currentProfile });
    }
  }, [isOpen, currentProfile]);

  // Clean up media stream when unmounting or camera turns off
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  if (!isOpen) return null;

  // Handle preset profile selection
  const handleSelectPreset = (preset: UserProfile) => {
    setFormData({
      ...preset,
      avatarUrl: formData.avatarUrl || preset.avatarUrl,
    });
  };

  // Profile picture upload from device
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const result = loadEvent.target?.result as string;
      if (result) {
        setFormData((prev) => ({
          ...prev,
          avatarUrl: result,
        }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Remove profile picture
  const handleRemovePhoto = () => {
    setFormData((prev) => ({
      ...prev,
      avatarUrl: undefined,
    }));
  };

  // Start device camera for selfie
  const handleStartCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Could not access camera. Please allow camera permissions or upload an image file.');
      setIsCameraActive(false);
    }
  };

  // Capture frame from webcam
  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 400;
    canvas.height = videoRef.current.videoHeight || 400;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setFormData((prev) => ({
        ...prev,
        avatarUrl: dataUrl,
      }));
    }
    handleStopCamera();
  };

  const handleStopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Generate new random User ID
  const handleGenerateNewId = () => {
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newId = `PX-${randomHex}`;
    setFormData((prev) => ({ ...prev, id: newId }));
  };

  // Copy User ID to clipboard
  const handleCopyId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(formData.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  // Clear cache and force refresh
  const handleClearCacheClick = () => {
    const confirmed = window.confirm(
      'Are you sure you want to clear the local storage cache? This will reset all consultation history and force-refresh the application state.'
    );
    if (!confirmed) return;

    if (onClearCache) {
      onClearCache();
    } else {
      localStorage.removeItem('medtrack_profile');
      localStorage.removeItem('medtrack_messages');
      localStorage.removeItem('medtrack_auth_user');
      localStorage.removeItem('pulsehealth_profile');
      localStorage.removeItem('pulsehealth_messages');
      localStorage.removeItem('pulsehealth_auth_user');
      window.location.reload();
    }

    setCacheClearedSuccess(true);
    setTimeout(() => {
      setCacheClearedSuccess(false);
      onClose();
    }, 1200);
  };

  // Recalculate BMI and TDEE on input changes
  const handleMetricChange = (field: 'heightCm' | 'weightKg' | 'age', value: number) => {
    const newAge = field === 'age' ? value : formData.demographics.age;
    const newHeight = field === 'heightCm' ? value : formData.metrics.heightCm;
    const newWeight = field === 'weightKg' ? value : formData.metrics.weightKg;

    const { bmi, category } = calculateBMI(newHeight, newWeight);
    const tdee = calculateTDEE(
      formData.demographics.gender,
      newAge,
      newHeight,
      newWeight,
      formData.lifestyle.exerciseFrequency
    );

    setFormData((prev) => ({
      ...prev,
      demographics: {
        ...prev.demographics,
        age: newAge,
      },
      metrics: {
        heightCm: newHeight,
        weightKg: newWeight,
        bmi,
        bmiCategory: category,
        tdeeKcal: tdee,
      },
    }));
  };

  const handleLifestyleExerciseChange = (exercise: ExerciseFrequency) => {
    const tdee = calculateTDEE(
      formData.demographics.gender,
      formData.demographics.age,
      formData.metrics.heightCm,
      formData.metrics.weightKg,
      exercise
    );
    setFormData((prev) => ({
      ...prev,
      lifestyle: {
        ...prev.lifestyle,
        exerciseFrequency: exercise,
      },
      metrics: {
        ...prev.metrics,
        tdeeKcal: tdee,
      },
    }));
  };

  const handleAddCondition = () => {
    if (!newCondition.trim()) return;
    setFormData((prev) => ({
      ...prev,
      healthHistory: {
        ...prev.healthHistory,
        knownConditions: [...prev.healthHistory.knownConditions, newCondition.trim()],
      },
    }));
    setNewCondition('');
  };

  const handleRemoveCondition = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      healthHistory: {
        ...prev.healthHistory,
        knownConditions: prev.healthHistory.knownConditions.filter((_, i) => i !== index),
      },
    }));
  };

  const handleAddAllergy = () => {
    if (!newAllergy.trim()) return;
    setFormData((prev) => ({
      ...prev,
      healthHistory: {
        ...prev.healthHistory,
        allergies: [...prev.healthHistory.allergies, newAllergy.trim()],
      },
    }));
    setNewAllergy('');
  };

  const handleRemoveAllergy = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      healthHistory: {
        ...prev.healthHistory,
        allergies: prev.healthHistory.allergies.filter((_, i) => i !== index),
      },
    }));
  };

  const handleAddMedication = () => {
    if (!newMedication.trim()) return;
    setFormData((prev) => ({
      ...prev,
      healthHistory: {
        ...prev.healthHistory,
        currentMedications: [...prev.healthHistory.currentMedications, newMedication.trim()],
      },
    }));
    setNewMedication('');
  };

  const handleRemoveMedication = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      healthHistory: {
        ...prev.healthHistory,
        currentMedications: prev.healthHistory.currentMedications.filter((_, i) => i !== index),
      },
    }));
  };

  // Handle PDF Download
  const handleDownloadPDF = () => {
    setIsGeneratingPDF(true);
    try {
      generateHealthRecordPDF(formData, messages);
    } catch (err) {
      console.error('Error generating PDF report:', err);
      alert('Failed to generate PDF. Please check your consultation history and try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Handle Data Refresh
  const handleDataRefreshClick = () => {
    setIsRefreshing(true);
    if (onRefreshData) {
      onRefreshData();
    }
    // Dynamic recalculation
    const { bmi, category } = calculateBMI(formData.metrics.heightCm, formData.metrics.weightKg);
    const tdee = calculateTDEE(
      formData.demographics.gender,
      formData.demographics.age,
      formData.metrics.heightCm,
      formData.metrics.weightKg,
      formData.lifestyle.exerciseFrequency
    );
    setFormData((prev) => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        bmi,
        bmiCategory: category,
        tdeeKcal: tdee,
      },
    }));
    setTimeout(() => {
      setIsRefreshing(false);
      setRefreshSuccess(true);
      setLastRefreshedTime(new Date().toLocaleTimeString());
      setTimeout(() => setRefreshSuccess(false), 3500);
    }, 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleStopCamera();
    onSaveProfile(formData);
    onClose();
  };

  return (
    <div
      id="profile-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="profile-modal-container"
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl my-8 overflow-hidden max-h-[90vh] flex flex-col transition-colors"
      >
        {/* Hidden File Input for Device Photo */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* Modal Header */}
        <div className="bg-slate-900 dark:bg-slate-950 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500/20 text-teal-300 rounded-xl">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight font-display">Medtrack Health Profile &amp; Clinical Data</h2>
              <p className="text-xs text-slate-300">
                Manage User ID, profile photo, metabolic baseline, PDF report &amp; data sync.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Header Fast Action: Download PDF */}
            <button
              type="button"
              id="header-download-pdf-btn"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Download Full Health Record & Consultation Log as PDF"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isGeneratingPDF ? 'Generating...' : 'PDF Report'}</span>
            </button>

            {/* Header Fast Action: Refresh Data */}
            <button
              type="button"
              id="header-refresh-data-btn"
              onClick={handleDataRefreshClick}
              disabled={isRefreshing}
              className="px-2.5 py-1.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Refresh and sync biometric calculations"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              id="close-profile-modal-btn"
              onClick={() => {
                handleStopCamera();
                onClose();
              }}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
          {/* Section 0: User ID & Profile Picture from Device */}
          <div className="p-4 bg-teal-50/40 dark:bg-teal-950/30 rounded-2xl border border-teal-100/90 dark:border-teal-900/40 space-y-4">
            <h3 className="text-xs font-bold text-teal-950 dark:text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
              <Fingerprint className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              Patient Identity &amp; Device Avatar
            </h3>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Profile Photo Uploader */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative group">
                  {formData.avatarUrl ? (
                    <img
                      src={formData.avatarUrl}
                      alt={formData.name}
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 rounded-full object-cover border-2 border-emerald-500 shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-linear-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center font-extrabold text-2xl shadow-md border-2 border-white dark:border-slate-800">
                      {formData.name ? formData.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}

                  {formData.avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="absolute -top-1 -right-1 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-xs transition-colors cursor-pointer"
                      title="Remove profile photo"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Upload Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    id="profile-upload-device-btn"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 text-teal-900 dark:text-teal-200 text-[11px] font-semibold rounded-lg border border-teal-200 dark:border-slate-700 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Upload className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                    <span>Upload Device</span>
                  </button>

                  <button
                    type="button"
                    id="profile-camera-btn"
                    onClick={isCameraActive ? handleStopCamera : handleStartCamera}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg border shadow-2xs transition-colors cursor-pointer ${
                      isCameraActive
                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700'
                        : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Camera className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                    <span>{isCameraActive ? 'Cancel' : 'Camera'}</span>
                  </button>
                </div>
              </div>

              {/* Camera Video Stream Preview if Active */}
              {isCameraActive && (
                <div className="p-3 bg-slate-900 dark:bg-slate-950 rounded-xl flex flex-col items-center gap-2 border border-slate-700 w-full sm:w-auto">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-48 h-36 bg-black rounded-lg object-cover"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCaptureSnapshot}
                      className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Take Photo
                    </button>
                    <button
                      type="button"
                      onClick={handleStopCamera}
                      className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

              {cameraError && (
                <div className="text-[11px] text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 p-2 rounded-lg border border-rose-200 dark:border-rose-800">
                  {cameraError}
                </div>
              )}

              {/* User ID / MRN Input */}
              <div className="flex-1 w-full space-y-2">
                <label className="block text-xs font-bold text-teal-950 dark:text-teal-300">
                  Profile / Patient User ID (MRN #)
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      id="profile-user-id-input"
                      value={formData.id}
                      onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                      placeholder="e.g. PX-94820 or USER_001"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-teal-200/90 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-900 focus:border-teal-500 outline-hidden"
                      required
                    />
                  </div>

                  <button
                    type="button"
                    id="profile-generate-id-btn"
                    onClick={handleGenerateNewId}
                    className="px-2.5 py-2 bg-teal-100/80 dark:bg-teal-900/60 hover:bg-teal-200 dark:hover:bg-teal-800 text-teal-900 dark:text-teal-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Generate new random ID"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Generate</span>
                  </button>

                  <button
                    type="button"
                    id="profile-copy-id-btn"
                    onClick={handleCopyId}
                    className="px-2.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Copy User ID"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  This custom identifier links your consultation intake and doctor reports.
                </p>
              </div>
            </div>
          </div>

          {/* Preset Profile Selector */}
          <div>
            <label className="block text-xs font-bold text-teal-950 dark:text-teal-300 uppercase tracking-wider mb-2">
              ⚡ Quick-Switch Archetype Profile:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {PRESET_PROFILES.map((preset) => {
                const isSelected = formData.id === preset.id || formData.name === preset.name;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    id={`select-preset-${preset.id}`}
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-teal-500 dark:border-teal-400 bg-teal-50/90 dark:bg-teal-950/60 ring-2 ring-teal-200/60 dark:ring-teal-900/50 shadow-2xs'
                        : 'border-teal-100 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-teal-300 dark:hover:border-slate-700 hover:shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-xs font-display">{preset.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      {preset.demographics.age}y {preset.demographics.gender} • BMI {preset.metrics.bmi}
                    </div>
                    <div className="text-[10px] text-teal-800 dark:text-teal-300 font-medium truncate mt-1">
                      {preset.demographics.profession}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <hr className="border-teal-100/80 dark:border-slate-800" />

          {/* 1. Demographics */}
          <div>
            <h3 className="text-xs font-bold text-teal-950 dark:text-teal-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              1. Demographics &amp; Profession
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Full Name / Alias</label>
                <input
                  type="text"
                  id="profile-name-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-teal-200/80 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-900 focus:border-teal-500 outline-hidden"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Age (Years)</label>
                <input
                  type="number"
                  id="profile-age-input"
                  min="1"
                  max="120"
                  value={formData.demographics.age}
                  onChange={(e) => handleMetricChange('age', parseInt(e.target.value) || 30)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-teal-200/80 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-900 focus:border-teal-500 outline-hidden"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Biological Gender</label>
                <select
                  id="profile-gender-select"
                  value={formData.demographics.gender}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      demographics: { ...formData.demographics, gender: e.target.value as Gender },
                    })
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-teal-200/80 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-900 focus:border-teal-500 outline-hidden"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-Binary">Non-Binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Profession / Workplace Environment
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  id="profile-profession-input"
                  value={formData.demographics.profession}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      demographics: { ...formData.demographics, profession: e.target.value },
                    })
                  }
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-teal-200/80 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-900 focus:border-teal-500 outline-hidden"
                  placeholder="e.g. Software Engineer, 8 hours sedentary screen time"
                  required
                />
              </div>
            </div>
          </div>

          {/* 2. Health Metrics & Calculators */}
          <div>
            <h3 className="text-xs font-bold text-teal-950 dark:text-teal-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              2. Physical Metrics &amp; Metabolic Baseline
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Height (cm)</label>
                <input
                  type="number"
                  id="profile-height-input"
                  min="50"
                  max="250"
                  value={formData.metrics.heightCm}
                  onChange={(e) => handleMetricChange('heightCm', parseFloat(e.target.value) || 170)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-teal-200/80 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-900 focus:border-teal-500 outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Weight (kg)</label>
                <input
                  type="number"
                  id="profile-weight-input"
                  min="20"
                  max="300"
                  value={formData.metrics.weightKg}
                  onChange={(e) => handleMetricChange('weightKg', parseFloat(e.target.value) || 70)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-teal-200/80 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-900 focus:border-teal-500 outline-hidden"
                />
              </div>
            </div>

            {/* Live Calculated Stats Card */}
            <div className="mt-3 p-3.5 rounded-2xl bg-linear-to-br from-teal-50/90 to-emerald-50/60 dark:from-teal-950/40 dark:to-emerald-950/30 border border-teal-200/80 dark:border-teal-900/40 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">Calculated BMI</span>
                <span className="text-base sm:text-lg font-extrabold text-teal-950 dark:text-teal-200 font-display">
                  {formData.metrics.bmi}
                </span>
                <span
                  className={`ml-2 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                    formData.metrics.bmiCategory === 'Normal Weight'
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : formData.metrics.bmiCategory === 'Overweight'
                      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      : 'bg-rose-100 dark:bg-rose-950/80 text-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  {formData.metrics.bmiCategory}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">Estimated TDEE (Energy Exp.)</span>
                <span className="text-base sm:text-lg font-extrabold text-teal-950 dark:text-teal-200 font-display">
                  {formData.metrics.tdeeKcal}{' '}
                  <span className="text-xs font-normal text-slate-600 dark:text-slate-400">kcal/day</span>
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">Hydration Target</span>
                <span className="text-base sm:text-lg font-extrabold text-teal-950 dark:text-teal-200 font-display">
                  {formData.lifestyle.waterIntakeLiters || 2.5}{' '}
                  <span className="text-xs font-normal text-slate-600 dark:text-slate-400">L/day</span>
                </span>
              </div>
            </div>
          </div>

          {/* 3. Lifestyle Baselines */}
          <div>
            <h3 className="text-xs font-bold text-teal-950 dark:text-teal-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              3. Lifestyle &amp; Habits
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Exercise Frequency</label>
                <select
                  id="profile-exercise-select"
                  value={formData.lifestyle.exerciseFrequency}
                  onChange={(e) => handleLifestyleExerciseChange(e.target.value as ExerciseFrequency)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-teal-200/80 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-900 focus:border-teal-500 outline-hidden"
                >
                  <option value="Sedentary (Rarely/Never)">Sedentary (Rarely/Never)</option>
                  <option value="Light (1-2 days/week)">Light (1-2 days/week)</option>
                  <option value="Moderate (3-4 days/week)">Moderate (3-4 days/week)</option>
                  <option value="Active (5+ days/week)">Active (5+ days/week)</option>
                  <option value="Athlete (Daily intensive)">Athlete (Daily intensive)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Junk Food Intake</label>
                <select
                  id="profile-junkfood-select"
                  value={formData.lifestyle.junkFoodIntake}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lifestyle: { ...formData.lifestyle, junkFoodIntake: e.target.value as JunkFoodIntake },
                    })
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-teal-200/80 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-900 focus:border-teal-500 outline-hidden"
                >
                  <option value="Rarely / Clean Eater">Rarely / Clean Eater</option>
                  <option value="1-2 times / week">1-2 times / week</option>
                  <option value="3-5 times / week">3-5 times / week</option>
                  <option value="Daily / Fast Food Dependent">Daily / Fast Food Dependent</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Daily Sleep Duration</label>
                  <span className="text-xs font-bold text-teal-800 dark:text-teal-300">
                    {formData.lifestyle.dailySleepDurationHours} hours / night
                  </span>
                </div>
                <input
                  type="range"
                  id="profile-sleep-slider"
                  min="3"
                  max="12"
                  step="0.5"
                  value={formData.lifestyle.dailySleepDurationHours}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lifestyle: {
                        ...formData.lifestyle,
                        dailySleepDurationHours: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-teal-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Daily Stress Level</label>
                <select
                  id="profile-stress-select"
                  value={formData.lifestyle.stressLevel}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lifestyle: {
                        ...formData.lifestyle,
                        stressLevel: e.target.value as 'Low' | 'Moderate' | 'High' | 'Severe',
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-teal-200/80 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-900 focus:border-teal-500 outline-hidden"
                >
                  <option value="Low">Low</option>
                  <option value="Moderate">Moderate</option>
                  <option value="High">High</option>
                  <option value="Severe">Severe</option>
                </select>
              </div>
            </div>
          </div>

          {/* 4. Health History, Allergies & Medications */}
          <div>
            <h3 className="text-xs font-bold text-teal-950 dark:text-teal-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              4. Known Medical History, Allergies &amp; Medications
            </h3>

            {/* Known Conditions */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Known Diagnosed Medical Conditions
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {formData.healthHistory.knownConditions.map((cond, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 dark:bg-teal-950/60 text-teal-900 dark:text-teal-200 rounded-lg text-xs border border-teal-200 dark:border-teal-800 font-medium"
                  >
                    {cond}
                    <button
                      type="button"
                      onClick={() => handleRemoveCondition(i)}
                      className="text-teal-400 hover:text-rose-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="profile-new-condition-input"
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCondition())}
                  placeholder="e.g. Hypertension, Asthma, Type 2 Diabetes"
                  className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-teal-200/80 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-xs outline-hidden focus:border-teal-500"
                />
                <button
                  type="button"
                  id="profile-add-condition-btn"
                  onClick={handleAddCondition}
                  className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Allergies */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-rose-800 dark:text-rose-300 font-semibold mb-1">
                ⚠️ Known Allergies (Crucial for OTC Safety Checks)
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {formData.healthHistory.allergies.map((all, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 rounded-lg text-xs border border-rose-200 dark:border-rose-800 font-medium"
                  >
                    {all}
                    <button
                      type="button"
                      onClick={() => handleRemoveAllergy(i)}
                      className="text-rose-400 hover:text-rose-700 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="profile-new-allergy-input"
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAllergy())}
                  placeholder="e.g. Penicillin, Peanuts, Sulfa drugs, Latex"
                  className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800 text-slate-900 dark:text-slate-100 rounded-xl text-xs outline-hidden focus:border-rose-400"
                />
                <button
                  type="button"
                  id="profile-add-allergy-btn"
                  onClick={handleAddAllergy}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Add Allergy
                </button>
              </div>
            </div>

            {/* Current Medications */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Current Daily Medications &amp; Supplements
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {formData.healthHistory.currentMedications.map((med, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200 rounded-lg text-xs border border-sky-200 dark:border-sky-800 font-medium"
                  >
                    <Pill className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                    {med}
                    <button
                      type="button"
                      onClick={() => handleRemoveMedication(i)}
                      className="text-sky-400 hover:text-rose-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="profile-new-medication-input"
                  value={newMedication}
                  onChange={(e) => setNewMedication(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddMedication())}
                  placeholder="e.g. Metformin 500mg, Lisinopril 10mg, Multivitamin"
                  className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-800 text-slate-900 dark:text-slate-100 rounded-xl text-xs outline-hidden focus:border-sky-400"
                />
                <button
                  type="button"
                  id="profile-add-medication-btn"
                  onClick={handleAddMedication}
                  className="px-3.5 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Add Med
                </button>
              </div>

              {/* Quick Google Maps Pharmacy Finder for these medications */}
              {formData.healthHistory.currentMedications.length > 0 && onOpenPharmacyLocator && (
                <div className="mt-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenPharmacyLocator(formData.healthHistory.currentMedications);
                      onClose();
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/70 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Find Nearest Medical Stores with Stock for These Medicines (GPS)</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Section 5: DOWNLOAD CONSULTATION & PROFILE PDF REPORT */}
          <div className="p-4 bg-linear-to-r from-emerald-50/80 via-teal-50/60 to-sky-50/60 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-sky-950/30 rounded-2xl border border-emerald-200/90 dark:border-emerald-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileDown className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <h3 className="text-xs font-bold text-emerald-950 dark:text-emerald-300 uppercase tracking-wider">
                  5. Download Health Record &amp; Consultation PDF
                </h3>
              </div>
              <span className="text-[10px] bg-emerald-200/70 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 px-2.5 py-0.5 rounded-full font-mono font-semibold">
                Formatted Report
              </span>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              Generate a formatted, printable PDF medical summary document including patient demographics, biometric calculators, medical history, active prescriptions, triage status, and complete chronological consultation transcripts.
            </p>

            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-emerald-200/80 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                    {formData.name}&apos;s Medtrack Report (.PDF)
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Includes {messages.length} consultation message{messages.length === 1 ? '' : 's'} &amp; full profile data
                  </span>
                </div>
              </div>

              <button
                type="button"
                id="download-health-record-pdf-btn"
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
              >
                <FileDown className="w-4 h-4" />
                <span>{isGeneratingPDF ? 'Compiling PDF...' : 'Download PDF Report'}</span>
              </button>
            </div>
          </div>

          {/* Section 6: DATA REFRESH & SYNCHRONIZATION */}
          <div className="p-4 bg-teal-50/60 dark:bg-teal-950/30 rounded-2xl border border-teal-200/90 dark:border-teal-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                <h3 className="text-xs font-bold text-teal-950 dark:text-teal-300 uppercase tracking-wider">
                  6. Biometrics Sync &amp; Data Refresh
                </h3>
              </div>
              <span className="text-[10px] bg-teal-200/70 dark:bg-teal-900/60 text-teal-900 dark:text-teal-200 px-2.5 py-0.5 rounded-full font-mono font-semibold">
                Live State Re-eval
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Force-recalculate clinical indicators (BMI, TDEE, BMR) and synchronize local consultation streams with the latest baseline parameters.
            </p>

            {refreshSuccess && (
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-900 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Data successfully refreshed &amp; synced with active profile metrics!</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-[11px] text-teal-800 dark:text-teal-300">
                {lastRefreshedTime ? `Last refreshed at ${lastRefreshedTime}` : 'All biometrics & metrics in sync'}
              </span>
              <button
                type="button"
                id="profile-refresh-data-btn"
                onClick={handleDataRefreshClick}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Syncing...' : 'Refresh & Sync Data'}</span>
              </button>
            </div>
          </div>

          {/* Section 7: Daily Reminder & Notification Settings */}
          <div className="p-4 bg-teal-50/60 dark:bg-teal-950/30 rounded-2xl border border-teal-200/90 dark:border-teal-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                <h3 className="text-xs font-bold text-teal-950 dark:text-teal-300 uppercase tracking-wider">
                  7. Daily Health &amp; Consultation Reminders
                </h3>
              </div>
              {onOpenReminderSettings && (
                <button
                  type="button"
                  id="profile-open-reminder-btn"
                  onClick={() => {
                    onClose();
                    onOpenReminderSettings();
                  }}
                  className="px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Bell className="w-3 h-3" />
                  <span>Configure Schedule &amp; Sound</span>
                </button>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Set automated daily browser prompts with customized ringtones and duration to record your biometrics or review your physician consultation brief.
            </p>
          </div>

          {/* Section 8: Settings & Cache Management */}
          <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200/90 dark:border-amber-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                <h3 className="text-xs font-bold text-amber-950 dark:text-amber-300 uppercase tracking-wider">
                  8. Local Storage &amp; Cache Diagnostics
                </h3>
              </div>
              <span className="text-[10px] bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-2.5 py-0.5 rounded-full font-mono font-semibold">
                Client Key-Value Storage
              </span>
            </div>

            <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              If you experience message rendering anomalies, outdated biometric baselines, or profile sync issues, force-refreshing your local storage cache will clear corrupted local state and re-initialize a fresh clinical session.
            </p>

            {cacheClearedSuccess && (
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-900 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Local storage cache successfully cleared. Refreshing state...</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-[11px] text-amber-800 dark:text-amber-300">
                Resets local device cache &amp; session tokens
              </span>
              <button
                type="button"
                id="clear-cache-force-refresh-btn"
                onClick={handleClearCacheClick}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear Cache &amp; Force-Refresh</span>
              </button>
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-4 border-t border-teal-100/90 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              id="cancel-profile-btn"
              onClick={() => {
                handleStopCamera();
                onClose();
              }}
              className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium rounded-xl text-xs sm:text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-profile-btn"
              className="px-5 py-2 bg-linear-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Save &amp; Apply Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
