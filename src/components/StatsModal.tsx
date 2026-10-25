/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Trophy, Flame, CheckCircle2 } from 'lucide-react';
import { DifficultyLevel, HistoryRecord } from '../logic/types';
import { calculateStats } from '../logic/stats';
import { LEVEL_DISPLAY_NAMES } from '../logic/unlocks';

interface StatsModalProps {
  isOpen: boolean;
  history: HistoryRecord[];
  onClose: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  history,
  onClose,
}) => {
  if (!isOpen) return null;

  const stats = calculateStats(history);
  const levels: DifficultyLevel[] = ['easy', 'medium', 'hard', 'expert'];

  const formatTimer = (secs: number | null) => {
    if (secs === null) return '—';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 dark:bg-black/60 backdrop-blur-xs p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Statistics"
    >
      <div className="w-full max-w-md max-h-[90vh] rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200/80 dark:border-stone-800/80">
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
            Statistics
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            aria-label="Close Statistics"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-6">
          {/* Overall Stats Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 flex flex-col items-center text-center">
              <CheckCircle2 className="w-4 h-4 text-stone-500 mb-1" />
              <span className="text-[11px] text-stone-500 dark:text-stone-400">Total Games</span>
              <span className="text-lg font-semibold text-stone-900 dark:text-stone-100 tabular-nums mt-0.5">
                {stats.totalCompleted}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 flex flex-col items-center text-center">
              <Flame className="w-4 h-4 text-amber-500 mb-1" />
              <span className="text-[11px] text-stone-500 dark:text-stone-400">Streak</span>
              <span className="text-lg font-semibold text-stone-900 dark:text-stone-100 tabular-nums mt-0.5">
                {stats.currentStreak}d
              </span>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 flex flex-col items-center text-center">
              <Trophy className="w-4 h-4 text-stone-500 mb-1" />
              <span className="text-[11px] text-stone-500 dark:text-stone-400">Best Streak</span>
              <span className="text-lg font-semibold text-stone-900 dark:text-stone-100 tabular-nums mt-0.5">
                {stats.bestStreak}d
              </span>
            </div>
          </div>

          {/* Per-level breakdown */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider px-1">
              Performance by Level
            </h3>

            <div className="flex flex-col gap-3">
              {levels.map(level => {
                const lStats = stats.levels[level];
                const name = LEVEL_DISPLAY_NAMES[level];

                return (
                  <div
                    key={level}
                    className="p-3.5 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-stone-50/50 dark:bg-stone-800/30 flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-stone-900 dark:text-stone-100">
                        {name}
                      </span>
                      <span className="text-xs font-medium text-stone-500 dark:text-stone-400 tabular-nums">
                        {lStats.completed} {lStats.completed === 1 ? 'game' : 'games'} completed
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 pt-2 border-t border-stone-100 dark:border-stone-800 text-[11px] text-stone-600 dark:text-stone-400">
                      <div>
                        <div className="text-stone-400 dark:text-stone-500">Best Time</div>
                        <div className="font-medium text-stone-900 dark:text-stone-100 tabular-nums mt-0.5 font-mono">
                          {formatTimer(lStats.bestTime)}
                        </div>
                      </div>

                      <div>
                        <div className="text-stone-400 dark:text-stone-500">Avg Time</div>
                        <div className="font-medium text-stone-900 dark:text-stone-100 tabular-nums mt-0.5 font-mono">
                          {formatTimer(lStats.averageTime)}
                        </div>
                      </div>

                      <div>
                        <div className="text-stone-400 dark:text-stone-500">Best Score</div>
                        <div className="font-medium text-stone-900 dark:text-stone-100 tabular-nums mt-0.5">
                          {lStats.bestScore ?? '—'}
                        </div>
                      </div>

                      <div>
                        <div className="text-stone-400 dark:text-stone-500">Avg Score</div>
                        <div className="font-medium text-stone-900 dark:text-stone-100 tabular-nums mt-0.5">
                          {lStats.averageScore ?? '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
