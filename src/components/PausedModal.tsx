/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play } from 'lucide-react';

interface PausedModalProps {
  isOpen: boolean;
  elapsedSeconds: number;
  level: string;
  onResume: () => void;
  onQuitToHome: () => void;
}

export const PausedModal: React.FC<PausedModalProps> = ({
  isOpen,
  elapsedSeconds,
  level,
  onResume,
  onQuitToHome,
}) => {
  if (!isOpen) return null;

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-50 dark:bg-stone-950 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Game paused"
    >
      <div className="w-full max-w-xs flex flex-col items-center text-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs uppercase tracking-widest font-medium text-stone-500 dark:text-stone-400">
            {level}
          </span>
          <h2 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            Game Paused
          </h2>
          <span className="text-sm font-mono text-stone-500 dark:text-stone-400 tabular-nums">
            {formatTimer(elapsedSeconds)}
          </span>
        </div>

        <div className="w-full flex flex-col gap-2.5">
          <button
            onClick={onResume}
            className="w-full py-3 px-4 rounded-xl bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 font-medium text-sm flex items-center justify-center gap-2 shadow-xs hover:opacity-95 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Resume</span>
          </button>

          <button
            onClick={onQuitToHome}
            className="w-full py-2.5 px-4 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 font-medium text-xs hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
          >
            Leave to Home
          </button>
        </div>
      </div>
    </div>
  );
};
