/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Lock, Play, Flame, Trophy, Clock } from 'lucide-react';
import { DifficultyLevel, GameState, HistoryRecord } from '../logic/types';
import { getAllUnlockStatuses, LEVEL_DISPLAY_NAMES } from '../logic/unlocks';
import { calculateStreak, formatLocalDate } from '../logic/streak';
import { calculateDailyScore } from '../logic/scoring';

interface HomeViewProps {
  history: HistoryRecord[];
  activeGame: GameState | null;
  onStartNewGame: (level: DifficultyLevel) => void;
  onResumeGame: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  history,
  activeGame,
  onStartNewGame,
  onResumeGame,
}) => {
  const streak = calculateStreak(history);
  const todayStr = formatLocalDate();
  const todayScore = calculateDailyScore(history, todayStr);
  const todayGames = history.filter(h => h.date === todayStr);

  // Compute completed counts per level
  const completedCounts: Record<DifficultyLevel, number> = {
    easy: history.filter(h => h.level === 'easy').length,
    medium: history.filter(h => h.level === 'medium').length,
    hard: history.filter(h => h.level === 'hard').length,
    expert: history.filter(h => h.level === 'expert').length,
  };

  const unlockStatuses = getAllUnlockStatuses(completedCounts);
  const levels: DifficultyLevel[] = ['easy', 'medium', 'hard', 'expert'];

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 flex flex-col gap-6">
      {/* Streak & Today Score Header Strip */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl bg-stone-100/80 dark:bg-stone-900/80 border border-stone-200/60 dark:border-stone-800/60 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
            <Flame className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" />
            <span>Streak</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 tabular-nums">
              {streak.currentStreak}
            </span>
            <span className="text-xs text-stone-500 dark:text-stone-400">
              {streak.currentStreak === 1 ? 'day' : 'days'}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-stone-400 dark:text-stone-500 tabular-nums">
            Best: {streak.bestStreak}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-stone-100/80 dark:bg-stone-900/80 border border-stone-200/60 dark:border-stone-800/60 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
            <Trophy className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
            <span>Today's Score</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 tabular-nums">
              {todayScore}
            </span>
            <span className="text-xs text-stone-500 dark:text-stone-400">pts</span>
          </div>
          <div className="mt-1 text-[11px] text-stone-400 dark:text-stone-500 tabular-nums">
            {todayGames.length} {todayGames.length === 1 ? 'game' : 'games'}
          </div>
        </div>
      </div>

      {/* Continue Unfinished Game Button */}
      {activeGame && !activeGame.isCompleted && (
        <button
          onClick={onResumeGame}
          className="w-full p-4 rounded-xl bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 shadow-sm hover:opacity-95 transition-opacity flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500"
          aria-label="Continue Unfinished Game"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-stone-800 text-stone-100 dark:bg-stone-200 dark:text-stone-900">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium">Continue Game</div>
              <div className="text-xs text-stone-300 dark:text-stone-600 capitalize">
                {activeGame.level} · {formatTime(activeGame.elapsedSeconds)}
              </div>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-stone-800 dark:bg-stone-200">
            Resume
          </span>
        </button>
      )}

      {/* Level Selection Section */}
      <div className="flex flex-col gap-2.5">
        <h2 className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider px-1">
          Select Difficulty
        </h2>
        <div className="flex flex-col gap-2">
          {levels.map(level => {
            const status = unlockStatuses[level];
            const name = LEVEL_DISPLAY_NAMES[level];

            if (!status.isUnlocked) {
              return (
                <div
                  key={level}
                  className="w-full p-3.5 rounded-xl border border-stone-200/50 dark:border-stone-800/50 bg-stone-100/40 dark:bg-stone-900/40 text-stone-400 dark:text-stone-600 flex items-center justify-between cursor-not-allowed select-none"
                  aria-disabled="true"
                >
                  <div className="flex items-center gap-3">
                    <Lock className="w-4 h-4 opacity-75" />
                    <span className="text-sm font-medium">{name}</span>
                  </div>
                  <span className="text-xs tabular-nums text-stone-400 dark:text-stone-500">
                    {status.current} / {status.required}{' '}
                    {status.prerequisiteLevel ? LEVEL_DISPLAY_NAMES[status.prerequisiteLevel] : ''} games
                  </span>
                </div>
              );
            }

            return (
              <button
                key={level}
                onClick={() => onStartNewGame(level)}
                className="w-full p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 hover:border-stone-400 dark:hover:border-stone-600 transition-colors flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{name}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                  <span className="tabular-nums">Play</span>
                  <span>→</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Today's Completed Games List */}
      {todayGames.length > 0 && (
        <div className="flex flex-col gap-2.5 mt-2">
          <h2 className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider px-1">
            Completed Today
          </h2>
          <div className="flex flex-col divide-y divide-stone-100 dark:divide-stone-800/80 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/70 dark:border-stone-800/70 overflow-hidden">
            {todayGames.map(game => (
              <div
                key={game.id}
                className="p-3 flex items-center justify-between text-xs text-stone-700 dark:text-stone-300"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-medium capitalize text-stone-900 dark:text-stone-100">
                    {game.level}
                  </span>
                  <span className="flex items-center gap-1 text-stone-400 dark:text-stone-500 tabular-nums">
                    <Clock className="w-3 h-3" />
                    {formatTime(game.timeSeconds)}
                  </span>
                </div>
                <div className="font-medium text-stone-900 dark:text-stone-100 tabular-nums">
                  +{game.score} pts
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
