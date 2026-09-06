import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupBrowserAudioPolicyUnlock } from './utils/notifications.ts';

// Setup proactive global audio autoplay unblocking on user gestures
if (typeof window !== 'undefined') {
  setupBrowserAudioPolicyUnlock();

  // Gracefully suppress benign browser errors (WebSocket HMR, autoplay notices, speech aborts)
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || String(event.reason || '');
    if (
      reason.includes('WebSocket') ||
      reason.includes('websocket') ||
      reason.includes('[vite]') ||
      reason.includes('WebSocket closed without opened') ||
      reason.includes('The play() request was interrupted') ||
      reason.includes('user didn\'t interact with the document first') ||
      reason.includes('AudioContext was not allowed to start') ||
      reason.includes('speech')
    ) {
      event.preventDefault();
    }
  });

  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    const msg = args.map((a) => (typeof a === 'string' ? a : (a as { message?: string })?.message || '')).join(' ');
    if (
      msg.includes('WebSocket closed without opened') ||
      msg.includes('[vite] failed to connect') ||
      msg.includes('The play() request was interrupted') ||
      msg.includes('AudioContext was not allowed to start')
    ) {
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);


