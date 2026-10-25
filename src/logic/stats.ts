/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Game statistics calculation.
 */

import { DifficultyLevel, GameStats, HistoryRecord, LevelStats } from './types';
import { calculateStreak } from './streak';

const ALL_LEVELS: DifficultyLevel[] = ['easy', 'medium', 'hard', 'expert'];

export function calculateStats(
  records: HistoryRecord[],
  referenceDate: Date = new Date()
): GameStats {
  const streak = calculateStreak(records, referenceDate);

  const levelStats: Record<DifficultyLevel, LevelStats> = {
    easy: createEmptyLevelStats(),
    medium: createEmptyLevelStats(),
    hard: createEmptyLevelStats(),
    expert: createEmptyLevelStats(),
  };

  for (const lvl of ALL_LEVELS) {
    const levelRecords = records.filter(r => r.level === lvl);
    if (levelRecords.length > 0) {
      const times = levelRecords.map(r => r.timeSeconds);
      const scores = levelRecords.map(r => r.score);

      const bestTime = Math.min(...times);
      const totalTime = times.reduce((a, b) => a + b, 0);
      const averageTime = Math.round(totalTime / times.length);

      const bestScore = Math.max(...scores);
      const totalScore = scores.reduce((a, b) => a + b, 0);
      const averageScore = Math.round(totalScore / scores.length);

      levelStats[lvl] = {
        completed: levelRecords.length,
        bestTime,
        averageTime,
        bestScore,
        averageScore,
      };
    }
  }

  return {
    totalCompleted: records.length,
    currentStreak: streak.currentStreak,
    bestStreak: streak.bestStreak,
    levels: levelStats,
  };
}

function createEmptyLevelStats(): LevelStats {
  return {
    completed: 0,
    bestTime: null,
    averageTime: null,
    bestScore: null,
    averageScore: null,
  };
}
