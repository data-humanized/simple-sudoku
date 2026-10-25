/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Clock, HelpCircle, AlertCircle } from 'lucide-react';
import { HistoryRecord } from '../logic/types';
import { LEVEL_DISPLAY_NAMES } from '../logic/unlocks';
import { formatLocalDate } from '../logic/streak';
import { calculateDailyScore } from '../logic/scoring';

interface HistoryModalProps {
  isOpen: boolean;
  history: HistoryRecord[];
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  history,
  onClose,
}) => {
  const [tab, setTab] = useState<'calendar' | 'list'>('calendar');
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(formatLocalDate());

  if (!isOpen) return null;

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Calendar month math
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth(); // 0..11
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=Sun, 1=Mon...
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  // Dates with games in this month
  const dateToGamesMap = new Map<string, HistoryRecord[]>();
  for (const h of history) {
    const list = dateToGamesMap.get(h.date) || [];
    list.push(h);
    dateToGamesMap.set(h.date, list);
  }

  const selectedDayGames = dateToGamesMap.get(selectedDateStr) || [];
  const selectedDayScore = calculateDailyScore(history, selectedDateStr);

  // Sorted list newest first
  const sortedHistory = [...history].sort((a, b) => b.completedAt - a.completedAt);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 dark:bg-black/60 backdrop-blur-xs p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Game History"
    >
      <div className="w-full max-w-md max-h-[90vh] rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200/80 dark:border-stone-800/80">
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
            History
          </h2>
          <div className="flex items-center gap-2">
            {/* View switcher */}
            <div className="flex p-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-xs font-medium">
              <button
                onClick={() => setTab('calendar')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  tab === 'calendar'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                Calendar
              </button>
              <button
                onClick={() => setTab('list')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  tab === 'list'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                List
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              aria-label="Close History"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {tab === 'calendar' ? (
            <div className="flex flex-col gap-4">
              {/* Month Navigation */}
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={prevMonth}
                    className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400 transition-colors"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={nextMonth}
                    className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400 transition-colors"
                    aria-label="Next month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Weekday labels */}
              <div className="grid grid-cols-7 text-center text-[11px] font-medium text-stone-400 dark:text-stone-500">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const hasGames = dateToGamesMap.has(dateStr);
                  const isSelected = selectedDateStr === dateStr;

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDateStr(dateStr)}
                      className={`relative aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-medium transition-colors ${
                        isSelected
                          ? 'bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 shadow-xs'
                          : hasGames
                          ? 'bg-stone-100 dark:bg-stone-800/80 text-stone-900 dark:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-700'
                          : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/40'
                      }`}
                    >
                      <span className="tabular-nums">{dayNum}</span>
                      {hasGames && (
                        <span
                          className={`w-1 h-1 rounded-full mt-0.5 ${
                            isSelected
                              ? 'bg-amber-400 dark:bg-amber-600'
                              : 'bg-amber-500 dark:bg-amber-400'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected Day Details */}
              <div className="mt-2 pt-3 border-t border-stone-100 dark:border-stone-800 flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-stone-700 dark:text-stone-300">
                    {selectedDateStr}
                  </span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100 tabular-nums">
                    {selectedDayScore > 0 ? `${selectedDayScore} total pts` : 'No games'}
                  </span>
                </div>

                {selectedDayGames.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {selectedDayGames.map(game => (
                      <div
                        key={game.id}
                        className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800/70 flex items-center justify-between text-xs"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-stone-900 dark:text-stone-100">
                            {LEVEL_DISPLAY_NAMES[game.level]}
                          </span>
                          <div className="flex items-center gap-3 text-stone-500 dark:text-stone-400">
                            <span className="flex items-center gap-1 tabular-nums">
                              <Clock className="w-3 h-3" />
                              {formatTimer(game.timeSeconds)}
                            </span>
                            <span className="flex items-center gap-1 tabular-nums">
                              <HelpCircle className="w-3 h-3" />
                              {game.hintsUsed}
                            </span>
                            <span className="flex items-center gap-1 tabular-nums">
                              <AlertCircle className="w-3 h-3" />
                              {game.mistakes}
                            </span>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 tabular-nums">
                          +{game.score}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-stone-400 dark:text-stone-500">
                    No completed games on this day.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Plain List View */
            <div className="flex flex-col gap-2">
              {sortedHistory.length > 0 ? (
                sortedHistory.map(game => (
                  <div
                    key={game.id}
                    className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800/70 flex items-center justify-between text-xs"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-900 dark:text-stone-100">
                          {LEVEL_DISPLAY_NAMES[game.level]}
                        </span>
                        <span className="text-stone-400 dark:text-stone-500">·</span>
                        <span className="text-stone-500 dark:text-stone-400">{game.date}</span>
                      </div>
                      <div className="flex items-center gap-3 text-stone-500 dark:text-stone-400">
                        <span className="flex items-center gap-1 tabular-nums">
                          <Clock className="w-3 h-3" />
                          {formatTimer(game.timeSeconds)}
                        </span>
                        <span className="flex items-center gap-1 tabular-nums">
                          <HelpCircle className="w-3 h-3" />
                          {game.hintsUsed} hints
                        </span>
                        <span className="flex items-center gap-1 tabular-nums">
                          <AlertCircle className="w-3 h-3" />
                          {game.mistakes} mistakes
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 tabular-nums">
                      +{game.score}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-stone-400 dark:text-stone-500">
                  No games played yet. Solve a puzzle to see it here!
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
