/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Flame, Clock, HelpCircle, AlertCircle, Trophy } from 'lucide-react';
import { DifficultyLevel } from '../logic/types';
import { LEVEL_DISPLAY_NAMES } from '../logic/unlocks';

interface CompletionModalProps {
  isOpen: boolean;
  level: DifficultyLevel;
  timeSeconds: number;
  hintsUsed: number;
  mistakes: number;
  score: number;
  currentStreak: number;
  onNewGame: () => void;
  onGoHome: () => void;
}

export const CompletionModal: React.FC<CompletionModalProps> = ({
  isOpen,
  level,
  timeSeconds,
  hintsUsed,
  mistakes,
  score,
  currentStreak,
  onNewGame,
  onGoHome,
}) => {
  if (!isOpen) return null;

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-50/95 dark:bg-stone-950/95 backdrop-blur-xs p-4 transition-opacity duration-300"
      role="dialog"
      aria-modal="true"
      aria-label="Puzzle solved"
    >
      <div className="w-full max-w-sm rounded-2xl p-6 flex flex-col items-center gap-6 border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900 shadow-sm">
        {/* Title */}
        <div className="flex flex-col items-center text-center gap-1">
          <span className="text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400 font-medium">
            {LEVEL_DISPLAY_NAMES[level]}
          </span>
          <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
            Solved
          </h2>
        </div>

        {/* Big Score & Streak summary */}
        <div className="w-full grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-700/40 flex flex-col items-center">
            <span className="flex items-center gap-1 text-[11px] text-stone-500 dark:text-stone-400">
              <Trophy className="w-3 h-3" />
              Score
            </span>
            <span className="text-xl font-semibold text-stone-900 dark:text-stone-100 tabular-nums mt-1">
              {score}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-700/40 flex flex-col items-center">
            <span className="flex items-center gap-1 text-[11px] text-stone-500 dark:text-stone-400">
              <Flame className="w-3 h-3 text-amber-500" />
              Streak
            </span>
            <span className="text-xl font-semibold text-stone-900 dark:text-stone-100 tabular-nums mt-1">
              {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
            </span>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="w-full flex flex-col divide-y divide-stone-100 dark:divide-stone-800 text-xs text-stone-600 dark:text-stone-400">
          <div className="py-2.5 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              Time
            </span>
            <span className="font-mono font-medium text-stone-900 dark:text-stone-100 tabular-nums">
              {formatTimer(timeSeconds)}
            </span>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <HelpCircle className="w-3.5 h-3.5 text-stone-400" />
              Hints Used
            </span>
            <span className="font-medium text-stone-900 dark:text-stone-100 tabular-nums">
              {hintsUsed}
            </span>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-stone-400" />
              Mistakes Made
            </span>
            <span className="font-medium text-stone-900 dark:text-stone-100 tabular-nums">
              {mistakes}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full flex flex-col gap-2.5 pt-2">
          <button
            onClick={onNewGame}
            className="w-full py-3 px-4 rounded-xl bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 font-medium text-sm hover:opacity-95 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 shadow-xs"
          >
            New Game ({LEVEL_DISPLAY_NAMES[level]})
          </button>

          <button
            onClick={onGoHome}
            className="w-full py-2.5 px-4 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 font-medium text-xs hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
          >
            Home
          </button>
        </div>
      </div>
    </div>
  );
};
