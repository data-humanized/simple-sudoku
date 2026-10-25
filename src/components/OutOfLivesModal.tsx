/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Heart, Clock } from 'lucide-react';

interface OutOfLivesModalProps {
  isOpen: boolean;
  onGetLife: () => void;
  onQuitToHome: () => void;
}

export const OutOfLivesModal: React.FC<OutOfLivesModalProps> = ({
  isOpen,
  onGetLife,
  onQuitToHome,
}) => {
  const [countdown, setCountdown] = useState<number>(5);

  // Reset countdown whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setCountdown(5);
    }
  }, [isOpen]);

  // Restart countdown if user leaves the tab/window during the wait
  useEffect(() => {
    if (!isOpen) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setCountdown(5);
      }
    };

    const handleBlur = () => {
      setCountdown(5);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || countdown <= 0) return;

    const timer = setInterval(() => {
      // Ensure we don't decrement if page is currently hidden
      if (!document.hidden) {
        setCountdown(prev => Math.max(0, prev - 1));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, countdown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 dark:bg-black/75 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="out-of-lives-title"
    >
      <div className="w-full max-w-xs rounded-2xl p-6 flex flex-col items-center text-center gap-6 border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xl">
        {/* Calm Icon */}
        <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
          <Heart className="w-6 h-6 stroke-[2]" />
        </div>

        {/* Text lockup */}
        <div className="flex flex-col gap-1.5">
          <h2
            id="out-of-lives-title"
            className="text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100"
          >
            Out of lives
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Get a life to continue.
          </p>
        </div>

        {/* Actions */}
        <div className="w-full flex flex-col gap-2.5">
          <button
            onClick={onGetLife}
            disabled={countdown > 0}
            className={`w-full py-3 px-4 rounded-xl font-medium text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 flex items-center justify-center gap-2 ${
              countdown > 0
                ? 'bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 cursor-not-allowed select-none'
                : 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 shadow-xs hover:opacity-95 cursor-pointer'
            }`}
            aria-live="polite"
          >
            {countdown > 0 ? (
              <>
                <Clock className="w-4 h-4 animate-pulse" />
                <span>Get a life ({countdown})</span>
              </>
            ) : (
              <span>Get a life</span>
            )}
          </button>

          <button
            onClick={onQuitToHome}
            className="w-full py-2.5 px-4 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 font-medium text-xs hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
          >
            Leave to Home
          </button>
        </div>
      </div>
    </div>
  );
};
