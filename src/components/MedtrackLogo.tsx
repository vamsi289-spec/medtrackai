import React from 'react';

interface MedtrackLogoProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
  animated?: boolean;
}

export const MedtrackLogo: React.FC<MedtrackLogoProps> = ({
  className = '',
  size = 48,
  showText = false,
  animated = false,
}) => {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${animated ? 'transition-transform duration-300 hover:scale-105' : ''}`}
      >
        <defs>
          {/* Medical Cross Gradient: Vivid Mint to Emerald Teal */}
          <linearGradient id="medtrackCrossGrad" x1="60" y1="80" x2="240" y2="280" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#059669" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>

          {/* Chat Bubble & Stethoscope Loop Gradient: Vibrant Emerald to Deep Marine Teal */}
          <linearGradient id="medtrackBubbleGrad" x1="100" y1="200" x2="480" y2="480" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="35%" stopColor="#0d9488" />
            <stop offset="70%" stopColor="#0f766e" />
            <stop offset="100%" stopColor="#083344" />
          </linearGradient>

          {/* Stethoscope Chestpiece Gradient */}
          <linearGradient id="medtrackScopeGrad" x1="340" y1="40" x2="480" y2="180" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0e7490" />
            <stop offset="50%" stopColor="#0f766e" />
            <stop offset="100%" stopColor="#083344" />
          </linearGradient>

          {/* Inner Glow and Shadows */}
          <filter id="softGlow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0f766e" floodOpacity="0.18" />
          </filter>
        </defs>

        {/* 1. TOP-LEFT MEDICAL CROSS */}
        {/* Horizontal bar of cross */}
        <rect
          x="75"
          y="150"
          width="170"
          height="62"
          rx="18"
          fill="url(#medtrackCrossGrad)"
          filter="url(#softGlow)"
        />
        {/* Vertical bar of cross */}
        <rect
          x="129"
          y="96"
          width="62"
          height="170"
          rx="18"
          fill="url(#medtrackCrossGrad)"
        />

        {/* 2. MAIN SPEECH BUBBLE WITH INTEGRATED STETHOSCOPE TUBING */}
        {/*
          Thick continuous path that outlines the speech bubble on the left/bottom/tail,
          then loops around the right side upward and branches into the stethoscope head.
        */}
        <path
          d="M 260 195 
             C 340 195, 385 240, 385 315 
             C 385 390, 335 435, 255 435 
             C 215 435, 195 440, 175 490 
             C 170 502, 160 500, 162 485 
             C 165 460, 145 440, 125 415 
             C 95 380, 90 320, 115 235 
             C 118 225, 128 230, 127 242 
             C 108 310, 114 360, 140 395 
             C 158 418, 178 435, 176 460 
             C 192 422, 218 412, 255 412 
             C 320 412, 360 375, 360 315 
             C 360 255, 325 218, 260 218 
             Z"
          fill="url(#medtrackBubbleGrad)"
        />

        {/* Extended Outer Stethoscope Loop wrapping from bottom right to top */}
        <path
          d="M 235 440 
             C 370 450, 460 370, 460 240 
             C 460 150, 420 85, 395 65"
          stroke="url(#medtrackBubbleGrad)"
          strokeWidth="24"
          strokeLinecap="round"
          fill="none"
        />

        {/* 3. STETHOSCOPE CHESTPIECE (Top Right) */}
        {/* Outer Ring */}
        <circle
          cx="400"
          cy="115"
          r="54"
          stroke="url(#medtrackScopeGrad)"
          strokeWidth="22"
          fill="#ffffff"
          className="dark:fill-slate-900"
          filter="url(#softGlow)"
        />
        {/* Inner Concentric Circle (Diaphragm) */}
        <circle
          cx="400"
          cy="115"
          r="22"
          fill="url(#medtrackScopeGrad)"
        />

        {/* 4. THREE CHAT / TRIAGE DOTS (Inside Speech Bubble) */}
        <circle cx="195" cy="325" r="15" fill="#0f766e" />
        <circle cx="250" cy="325" r="15" fill="#0e7490" />
        <circle cx="305" cy="325" r="15" fill="#083344" className="dark:fill-teal-300" />
      </svg>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white font-outfit">
              MedTrack <span className="text-teal-600 dark:text-teal-400">AI</span>
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              Clinical
            </span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium -mt-0.5">
            Track &bull; Aware &bull; Stay Healthy
          </span>
        </div>
      )}
    </div>
  );
};
