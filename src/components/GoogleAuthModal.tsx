import React, { useState } from 'react';
import {
  X,
  User,
  Users,
  Briefcase,
  Smartphone,
  Check,
  Zap,
  ArrowLeft,
  AlertCircle,
  Eye,
  EyeOff,
  Globe,
  ChevronDown,
} from 'lucide-react';
import { AuthUser } from '../types';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AuthUser, profile?: any) => void;
  initialRole?: 'doctor' | 'patient';
}

type ScreenState =
  | 'choose_account'
  | 'signin_email'
  | 'signin_password'
  | 'create_name'
  | 'create_email'
  | 'create_password'
  | 'phone_qr';

// Authentic Google Multicolor Wordmark & G-Logo
export const GoogleLogo: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

export const GoogleWordmark: React.FC = () => (
  <div className="flex items-center text-xl font-medium tracking-tight select-none">
    <span className="text-[#4285F4] text-2xl font-bold font-sans">G</span>
    <span className="text-[#EA4335] text-2xl font-bold font-sans">o</span>
    <span className="text-[#FBBC05] text-2xl font-bold font-sans">o</span>
    <span className="text-[#4285F4] text-2xl font-bold font-sans">g</span>
    <span className="text-[#34A853] text-2xl font-bold font-sans">l</span>
    <span className="text-[#EA4335] text-2xl font-bold font-sans">e</span>
  </div>
);

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialRole = 'patient',
}) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('choose_account');
  const [selectedRole, setSelectedRole] = useState<'doctor' | 'patient'>(initialRole);
  const [accountType, setAccountType] = useState<'personal' | 'work' | 'child'>('personal');

  // Input states
  const [emailInput, setEmailInput] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedPresetEmail, setSelectedPresetEmail] = useState<string>('vamsidadi404@gmail.com');
  const [customGmail, setCustomGmail] = useState('');

  // UI status
  const [showCreateAccountMenu, setShowCreateAccountMenu] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [qrScanning, setQrScanning] = useState(false);
  const [qrVerified, setQrVerified] = useState(false);

  if (!isOpen) return null;

  // Preset Accounts for instant 1-click Google Sign-In
  const googleAccounts = [
    {
      name: 'Krishna God',
      email: 'krishnagod704@gmail.com',
      avatarBg: 'bg-emerald-600',
      initials: 'K',
      tag: 'Personal',
      role: selectedRole,
    },
    {
      name: 'Vamsi Dadi',
      email: 'vamsidadi404@gmail.com',
      avatarBg: 'bg-blue-600',
      initials: 'V',
      tag: 'Primary',
      role: selectedRole,
    },
    {
      name: 'Dr. Sarah Chen, MD',
      email: 'sarah.chen@medtrack.ai',
      avatarBg: 'bg-teal-700',
      initials: 'Dr',
      tag: 'Clinical MD',
      role: 'doctor' as const,
    },
    {
      name: 'Alex Rivera',
      email: 'alex.rivera@techpulse.io',
      avatarBg: 'bg-indigo-600',
      initials: 'A',
      tag: 'Patient',
      role: 'patient' as const,
    },
  ];

  // Helper to format clean name from email
  const nameFromEmail = (email: string) => {
    const part = email.split('@')[0] || 'User';
    return part
      .replace(/[._]/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Main Google Authentication Submitter
  const finalizeGoogleLogin = async (
    userEmail: string,
    userName: string,
    roleOverride?: 'doctor' | 'patient',
    userPassword?: string,
    mode: 'account_select' | 'password' | 'register' = 'account_select'
  ) => {
    setIsLoading(true);
    setErrorMessage('');

    const targetRole = roleOverride || selectedRole || (accountType === 'work' ? 'doctor' : 'patient');
    const cleanEmail = userEmail.trim().toLowerCase();
    const cleanName = userName.trim() || nameFromEmail(cleanEmail);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          name: cleanName,
          role: targetRole,
          accountType,
          password: userPassword,
          mode,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        // response was not JSON
      }

      if (response.ok && data?.success && data?.user) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('medtrack_token', data.token);
          localStorage.setItem('medtrack_auth_user', JSON.stringify(data.user));
          if (data.profile) {
            localStorage.setItem('medtrack_profile', JSON.stringify(data.profile));
          }
        }
        setIsLoading(false);
        onLoginSuccess(data.user, data.profile);
        onClose();
        return;
      }

      // If the backend explicitly returned a validation or password rejection, show the error!
      if (data && data.success === false && data.error) {
        setIsLoading(false);
        setErrorMessage(data.error);
        return;
      }
    } catch (err: any) {
      console.warn('Backend sync unreachable, using client verified Google profile fallback:', err?.message || err);
    }

    // Client-side fallback if server is offline or unreachable
    const googleUser: AuthUser = {
      id: `usr_g_${Date.now()}`,
      email: cleanEmail,
      name: cleanName,
      role: targetRole,
      isVerified: true,
      provider: 'google',
      createdAt: new Date().toISOString(),
    };

    const googleProfile =
      targetRole === 'doctor'
        ? {
            id: `doc_${googleUser.id}`,
            name: cleanName.startsWith('Dr.') ? cleanName : `Dr. ${cleanName}`,
            avatarColor: 'from-blue-600 to-indigo-700',
            demographics: { age: 38, gender: 'Not specified', profession: 'Physician / Google Health MD' },
            metrics: { heightCm: 175, weightKg: 70, bmi: 22.8, bmiCategory: 'Normal Weight', tdeeKcal: 2300 },
            lifestyle: { exerciseFrequency: 'Moderate', smokingOrVaping: 'Never', alcoholIntake: 'Occasional' },
            healthHistory: { knownConditions: [], allergies: [], currentMedications: [], familyHistory: [] },
          }
        : {
            id: `pat_${googleUser.id}`,
            name: cleanName,
            avatarColor: 'from-blue-500 to-teal-600',
            demographics: { age: 29, gender: 'Not specified', profession: 'Personal Health Account' },
            metrics: { heightCm: 174, weightKg: 68, bmi: 22.5, bmiCategory: 'Normal Weight', tdeeKcal: 2250 },
            lifestyle: { exerciseFrequency: 'Light', smokingOrVaping: 'Never', alcoholIntake: 'Occasional' },
            healthHistory: { knownConditions: [], allergies: [], currentMedications: [], familyHistory: [] },
          };

    if (typeof window !== 'undefined') {
      localStorage.setItem('medtrack_token', 'google_session_' + Date.now());
      localStorage.setItem('medtrack_auth_user', JSON.stringify(googleUser));
      localStorage.setItem('medtrack_profile', JSON.stringify(googleProfile));
    }

    setIsLoading(false);
    onLoginSuccess(googleUser, googleProfile);
    onClose();
  };

  return (
    <div
      id="medtrack-google-auth-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150 select-none overflow-y-auto"
      onClick={() => setShowCreateAccountMenu(false)}
    >
      <div
        className="relative w-full max-w-[460px] bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated Google 4-Color Material Loading Bar */}
        {isLoading && (
          <div className="h-1 w-full overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
            <div
              className="h-full w-1/3 absolute rounded-full animate-[shimmer_1.2s_infinite]"
              style={{
                background: 'linear-gradient(90deg, #4285F4, #EA4335, #FBBC05, #34A853)',
              }}
            />
          </div>
        )}

        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <div className="flex items-center gap-2.5">
            {currentScreen !== 'choose_account' ? (
              <button
                type="button"
                onClick={() => {
                  setErrorMessage('');
                  if (currentScreen === 'signin_password') setCurrentScreen('signin_email');
                  else if (currentScreen === 'create_email') setCurrentScreen('create_name');
                  else if (currentScreen === 'create_password') setCurrentScreen('create_email');
                  else setCurrentScreen('choose_account');
                }}
                className="p-1.5 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <GoogleLogo size={24} />
            )}
            <GoogleWordmark />
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mx-6 mt-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/80 text-red-700 dark:text-red-300 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Modal Body Container with Scroll */}
        <div className="px-6 py-4 overflow-y-auto flex-1 text-slate-900 dark:text-white">
          {/* ============================================================
              SCREEN 1: CHOOSE AN ACCOUNT (Google Account Chooser)
              ============================================================ */}
          {currentScreen === 'choose_account' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-normal tracking-tight text-slate-900 dark:text-white">
                  Choose an account
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  to continue to <span className="font-semibold text-slate-900 dark:text-white">MedTrack AI</span>
                </p>
              </div>

              {/* Account Role Selector */}
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium pl-1">
                  Signing in as:
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('patient')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      selectedRole === 'patient'
                        ? 'bg-[#1a73e8] text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Patient
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('doctor')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      selectedRole === 'doctor'
                        ? 'bg-[#1a73e8] text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Doctor (MD)
                  </button>
                </div>
              </div>

              {/* Google Accounts List Card */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-850">
                {googleAccounts.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => finalizeGoogleLogin(acc.email, acc.name, acc.role, undefined, 'account_select')}
                    disabled={isLoading}
                    className="w-full px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors flex items-center gap-3.5 group active:bg-slate-100 cursor-pointer"
                  >
                    <div
                      className={`w-9 h-9 rounded-full ${acc.avatarBg} text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0`}
                    >
                      {acc.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-[#1a73e8] dark:group-hover:text-blue-400 transition-colors">
                          {acc.name}
                        </p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 font-medium">
                          {acc.tag}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{acc.email}</p>
                    </div>
                  </button>
                ))}

                {/* Option: Use another account */}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage('');
                    setEmailInput('');
                    setCurrentScreen('signin_email');
                  }}
                  className="w-full px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors flex items-center gap-3.5 group text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="text-sm font-medium">Use another account</div>
                </button>

                {/* Option: Use Phone QR Code */}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage('');
                    setCurrentScreen('phone_qr');
                  }}
                  className="w-full px-4 py-3.5 text-left hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors flex items-center gap-3.5 group text-[#1a73e8] dark:text-blue-400 cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-[#1a73e8] dark:text-blue-400 shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div className="text-sm font-medium">Use your phone to sign in fast (QR Code)</div>
                </button>
              </div>

              {/* Data sharing disclosure */}
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed px-1">
                To continue, Google will share your name, email address, and profile picture with MedTrack AI. Before using this app, review its privacy policy and terms of service.
              </p>

              {/* Bottom Actions: Create account & Footer links */}
              <div className="pt-2 flex items-center justify-between relative border-t border-slate-100 dark:border-slate-800">
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCreateAccountMenu(!showCreateAccountMenu);
                    }}
                    className="text-xs font-semibold text-[#1a73e8] hover:text-[#1557b0] dark:text-blue-400 py-1 px-1 rounded-md cursor-pointer flex items-center gap-1"
                  >
                    <span>Create account</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Dropdown Popup */}
                  {showCreateAccountMenu && (
                    <div
                      className="absolute left-0 bottom-full mb-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setAccountType('personal');
                          setSelectedRole('patient');
                          setShowCreateAccountMenu(false);
                          setCurrentScreen('create_name');
                        }}
                        className="w-full px-4 py-2.5 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <User className="w-4 h-4 text-slate-500" />
                        <span>For my personal use</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAccountType('child');
                          setSelectedRole('patient');
                          setShowCreateAccountMenu(false);
                          setCurrentScreen('create_name');
                        }}
                        className="w-full px-4 py-2.5 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <Users className="w-4 h-4 text-slate-500" />
                        <span>For my child</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAccountType('work');
                          setSelectedRole('doctor');
                          setShowCreateAccountMenu(false);
                          setCurrentScreen('create_name');
                        }}
                        className="w-full px-4 py-2.5 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <Briefcase className="w-4 h-4 text-slate-500" />
                        <span>For work or my business</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="hover:underline cursor-pointer">Help</span>
                  <span className="hover:underline cursor-pointer">Privacy</span>
                  <span className="hover:underline cursor-pointer">Terms</span>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              SCREEN 2: SIGN IN WITH EMAIL (Google Sign In)
              ============================================================ */}
          {currentScreen === 'signin_email' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-normal tracking-tight text-slate-900 dark:text-white">
                  Sign in
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Use your Google Account
                </p>
              </div>

              <div className="space-y-4">
                {/* Floating label Google input */}
                <div className="space-y-1.5">
                  <label htmlFor="google-email-input" className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Email or phone
                  </label>
                  <input
                    type="text"
                    id="google-email-input"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Enter email or phone"
                    className="w-full px-3.5 py-3 bg-transparent border border-slate-300 dark:border-slate-700 focus:border-[#1a73e8] dark:focus:border-blue-500 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none transition-all placeholder:text-slate-400"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (!emailInput.trim()) {
                          setErrorMessage('Enter an email or phone number');
                          return;
                        }
                        setErrorMessage('');
                        setCurrentScreen('signin_password');
                      }
                    }}
                  />
                  <div className="flex justify-start">
                    <button
                      type="button"
                      onClick={() => setEmailInput('krishnagod704@gmail.com')}
                      className="text-xs font-semibold text-[#1a73e8] dark:text-blue-400 hover:underline mt-1"
                    >
                      Forgot email?
                    </button>
                  </div>
                </div>

                {/* Not your computer guest notice */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Not your computer? Use Guest mode to sign in privately.{' '}
                  <span className="text-[#1a73e8] dark:text-blue-400 font-medium hover:underline cursor-pointer">
                    Learn more
                  </span>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 flex items-center justify-between relative border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCurrentScreen('create_name')}
                  className="text-xs font-semibold text-[#1a73e8] hover:text-[#1557b0] dark:text-blue-400 py-1 cursor-pointer"
                >
                  Create account
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!emailInput.trim()) {
                      setErrorMessage('Enter an email or phone number');
                      return;
                    }
                    setErrorMessage('');
                    setCurrentScreen('signin_password');
                  }}
                  className="px-6 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* ============================================================
              SCREEN 3: PASSWORD SCREEN (Google Password Verification)
              ============================================================ */}
          {currentScreen === 'signin_password' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-normal tracking-tight text-slate-900 dark:text-white">
                  Welcome
                </h2>
                {/* User email pill that allows switching back */}
                <button
                  type="button"
                  onClick={() => setCurrentScreen('signin_email')}
                  className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                  title="Click to change account"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{emailInput || 'krishnagod704@gmail.com'}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label htmlFor="google-password-input" className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Enter your password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="google-password-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full px-3.5 py-3 bg-transparent border border-slate-300 dark:border-slate-700 focus:border-[#1a73e8] dark:focus:border-blue-500 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none transition-all placeholder:text-slate-400 pr-10"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          finalizeGoogleLogin(
                            emailInput || 'krishnagod704@gmail.com',
                            nameFromEmail(emailInput || 'krishnagod704@gmail.com'),
                            selectedRole,
                            password,
                            'password'
                          );
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="show-password-checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    className="w-4 h-4 rounded text-[#1a73e8] focus:ring-[#1a73e8] border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="show-password-checkbox" className="text-xs text-slate-600 dark:text-slate-300 select-none cursor-pointer">
                    Show password
                  </label>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    // Password recovery / hint
                    setPassword('password123');
                    setErrorMessage('Demo password autofilled: "password123". Click Next to sign in.');
                  }}
                  className="text-xs font-semibold text-[#1a73e8] hover:text-[#1557b0] dark:text-blue-400 py-1 cursor-pointer"
                >
                  Forgot password?
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() =>
                    finalizeGoogleLogin(
                      emailInput || 'krishnagod704@gmail.com',
                      nameFromEmail(emailInput || 'krishnagod704@gmail.com'),
                      selectedRole,
                      password,
                      'password'
                    )
                  }
                  className="px-6 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-xs font-semibold shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? 'Signing in...' : 'Next'}
                </button>
              </div>
            </div>
          )}

          {/* ============================================================
              SCREEN 4: CREATE ACCOUNT - ENTER NAME
              ============================================================ */}
          {currentScreen === 'create_name' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-normal tracking-tight text-slate-900 dark:text-white">
                  Create a Google Account
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Enter your name
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="google-firstname-input" className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    First name
                  </label>
                  <input
                    type="text"
                    id="google-firstname-input"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    className="w-full px-3.5 py-3 bg-transparent border border-slate-300 dark:border-slate-700 focus:border-[#1a73e8] dark:focus:border-blue-500 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none transition-all placeholder:text-slate-400"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="google-lastname-input" className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Last name (optional)
                  </label>
                  <input
                    type="text"
                    id="google-lastname-input"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    className="w-full px-3.5 py-3 bg-transparent border border-slate-300 dark:border-slate-700 focus:border-[#1a73e8] dark:focus:border-blue-500 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 flex items-center justify-end border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    if (!firstName.trim()) {
                      setFirstName('Krishna');
                    }
                    setCurrentScreen('create_email');
                  }}
                  className="px-6 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* ============================================================
              SCREEN 5: CREATE EMAIL ADDRESS
              ============================================================ */}
          {currentScreen === 'create_email' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-normal tracking-tight text-slate-900 dark:text-white">
                  Create a Gmail address
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Create a Gmail address for signing in to your Google Account
                </p>
              </div>

              <div className="space-y-2.5 border-t border-b border-slate-200 dark:border-slate-800 py-3">
                <label className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="gmail_choice"
                    checked={selectedPresetEmail === 'krishnagod704@gmail.com'}
                    onChange={() => setSelectedPresetEmail('krishnagod704@gmail.com')}
                    className="w-4 h-4 text-[#1a73e8] focus:ring-[#1a73e8] border-slate-300"
                  />
                  <span className="text-sm text-slate-800 dark:text-slate-200 font-medium">
                    krishnagod704@gmail.com
                  </span>
                </label>

                <label className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="gmail_choice"
                    checked={selectedPresetEmail === 'vamsidadi404@gmail.com'}
                    onChange={() => setSelectedPresetEmail('vamsidadi404@gmail.com')}
                    className="w-4 h-4 text-[#1a73e8] focus:ring-[#1a73e8] border-slate-300"
                  />
                  <span className="text-sm text-slate-800 dark:text-slate-200 font-medium">
                    vamsidadi404@gmail.com
                  </span>
                </label>

                <label className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="gmail_choice"
                    checked={selectedPresetEmail === 'custom'}
                    onChange={() => setSelectedPresetEmail('custom')}
                    className="w-4 h-4 text-[#1a73e8] focus:ring-[#1a73e8] border-slate-300"
                  />
                  <span className="text-sm text-slate-800 dark:text-slate-200 font-medium">
                    Create your own Gmail address
                  </span>
                </label>

                {selectedPresetEmail === 'custom' && (
                  <div className="pl-7 pt-1">
                    <div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden">
                      <input
                        type="text"
                        value={customGmail}
                        onChange={(e) => setCustomGmail(e.target.value)}
                        placeholder="username"
                        className="px-3 py-2 text-sm bg-transparent flex-1 focus:outline-none dark:text-white"
                      />
                      <span className="px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-500 border-l border-slate-300 dark:border-slate-700">
                        @gmail.com
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedPresetEmail('krishnagod704@gmail.com')}
                  className="text-xs font-semibold text-[#1a73e8] hover:text-[#1557b0] dark:text-blue-400 py-1"
                >
                  Use existing email
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentScreen('create_password')}
                  className="px-6 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* ============================================================
              SCREEN 6: CREATE STRONG PASSWORD
              ============================================================ */}
          {currentScreen === 'create_password' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-normal tracking-tight text-slate-900 dark:text-white">
                  Create a strong password
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Create a strong password with a mix of letters, numbers, and symbols
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="google-create-password" className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="google-create-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full px-3.5 py-3 bg-transparent border border-slate-300 dark:border-slate-700 focus:border-[#1a73e8] dark:focus:border-blue-500 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none transition-all placeholder:text-slate-400"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="google-create-password-confirm" className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Confirm
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="google-create-password-confirm"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="w-full px-3.5 py-3 bg-transparent border border-slate-300 dark:border-slate-700 focus:border-[#1a73e8] dark:focus:border-blue-500 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none transition-all placeholder:text-slate-400"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="show-create-password-checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    className="w-4 h-4 rounded text-[#1a73e8] focus:ring-[#1a73e8] border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="show-create-password-checkbox" className="text-xs text-slate-600 dark:text-slate-300 select-none cursor-pointer">
                    Show password
                  </label>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 flex items-center justify-end border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCurrentScreen('phone_qr')}
                  className="px-6 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* ============================================================
              SCREEN 7: VERIFY INFO / SCAN QR CODE
              ============================================================ */}
          {currentScreen === 'phone_qr' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-normal tracking-tight text-slate-900 dark:text-white">
                  Verify some info before signing in
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  Google needs to verify some info about your device or phone number before you can continue. This helps keep you and others safe online.
                </p>
              </div>

              {/* High-Resolution Dynamic SVG QR Code */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative p-2 bg-white rounded-xl shadow-xs border border-slate-200 shrink-0">
                  <svg className="w-32 h-32" viewBox="0 0 100 100" fill="none">
                    {/* QR Finder Patterns */}
                    <rect x="5" y="5" width="26" height="26" rx="4" fill="black" />
                    <rect x="9" y="9" width="18" height="18" rx="2" fill="white" />
                    <rect x="13" y="13" width="10" height="10" rx="1" fill="black" />

                    <rect x="69" y="5" width="26" height="26" rx="4" fill="black" />
                    <rect x="73" y="9" width="18" height="18" rx="2" fill="white" />
                    <rect x="77" y="13" width="10" height="10" rx="1" fill="black" />

                    <rect x="5" y="69" width="26" height="26" rx="4" fill="black" />
                    <rect x="9" y="73" width="18" height="18" rx="2" fill="white" />
                    <rect x="13" y="77" width="10" height="10" rx="1" fill="black" />

                    {/* QR Code Pixel Matrix */}
                    <rect x="36" y="8" width="5" height="5" fill="black" />
                    <rect x="46" y="8" width="5" height="5" fill="black" />
                    <rect x="56" y="8" width="5" height="5" fill="black" />
                    <rect x="36" y="18" width="5" height="5" fill="black" />
                    <rect x="51" y="18" width="5" height="5" fill="black" />

                    <rect x="8" y="36" width="5" height="5" fill="black" />
                    <rect x="18" y="36" width="5" height="5" fill="black" />
                    <rect x="28" y="36" width="5" height="5" fill="black" />
                    <rect x="38" y="36" width="5" height="5" fill="black" />
                    <rect x="48" y="36" width="5" height="5" fill="black" />
                    <rect x="58" y="36" width="5" height="5" fill="black" />
                    <rect x="68" y="36" width="5" height="5" fill="black" />

                    {/* Center Google Colors */}
                    <rect x="36" y="46" width="8" height="8" rx="1" fill="#4285F4" />
                    <rect x="48" y="46" width="8" height="8" rx="1" fill="#EA4335" />
                    <rect x="36" y="58" width="8" height="8" rx="1" fill="#FBBC05" />
                    <rect x="48" y="58" width="8" height="8" rx="1" fill="#34A853" />

                    <rect x="65" y="48" width="5" height="5" fill="black" />
                    <rect x="75" y="48" width="5" height="5" fill="black" />
                    <rect x="85" y="48" width="5" height="5" fill="black" />
                    <rect x="65" y="58" width="5" height="5" fill="black" />
                    <rect x="80" y="58" width="5" height="5" fill="black" />

                    <rect x="36" y="72" width="5" height="5" fill="black" />
                    <rect x="46" y="72" width="5" height="5" fill="black" />
                    <rect x="56" y="72" width="5" height="5" fill="black" />
                    <rect x="66" y="72" width="5" height="5" fill="black" />
                    <rect x="76" y="72" width="5" height="5" fill="black" />
                    <rect x="86" y="72" width="5" height="5" fill="black" />

                    <rect x="36" y="82" width="5" height="5" fill="black" />
                    <rect x="51" y="82" width="5" height="5" fill="black" />
                    <rect x="66" y="82" width="5" height="5" fill="black" />
                    <rect x="81" y="82" width="5" height="5" fill="black" />
                  </svg>
                  {qrVerified && (
                    <div className="absolute inset-0 bg-emerald-600/90 rounded-xl flex items-center justify-center text-white font-bold text-xs">
                      <Check className="w-8 h-8" />
                    </div>
                  )}
                </div>

                <div className="text-left space-y-1.5 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Scan the QR code with your phone
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Open your camera, scan the code, and tap the link to complete verification.
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-500 pt-1">
                    Scanning won't link your phone number to your Google Account.
                  </p>
                </div>
              </div>

              {/* Instant Tap/Scan Approval Button */}
              <button
                type="button"
                onClick={() => {
                  setQrScanning(true);
                  setTimeout(() => {
                    setQrScanning(false);
                    setQrVerified(true);
                    setTimeout(() => {
                      const finalChosenEmail =
                        selectedPresetEmail === 'custom'
                          ? `${customGmail.trim() || 'user'}@gmail.com`
                          : selectedPresetEmail || emailInput || 'krishnagod704@gmail.com';
                      const finalName = [firstName, lastName].filter(Boolean).join(' ') || nameFromEmail(finalChosenEmail);
                      finalizeGoogleLogin(finalChosenEmail, finalName, selectedRole, password, 'register');
                    }, 500);
                  }, 700);
                }}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>
                  {qrScanning
                    ? 'Simulating Phone Camera Scan...'
                    : qrVerified
                    ? 'Phone Verified! Signing in...'
                    : 'Tap to Complete Verification & Sign In Instantly'}
                </span>
              </button>

              {/* Bottom Actions */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCurrentScreen('choose_account')}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  Choose another way
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const finalChosenEmail =
                      selectedPresetEmail === 'custom'
                        ? `${customGmail.trim() || 'user'}@gmail.com`
                        : selectedPresetEmail || emailInput || 'krishnagod704@gmail.com';
                    const finalName = [firstName, lastName].filter(Boolean).join(' ') || nameFromEmail(finalChosenEmail);
                    finalizeGoogleLogin(finalChosenEmail, finalName, selectedRole, password, 'register');
                  }}
                  className="px-6 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  Continue
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
