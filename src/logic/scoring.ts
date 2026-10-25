/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Sudoku Scoring Logic.
 * 
 * Formula:
 * Score per completed game = max(floor(0.2 * base), base - floor(seconds / 5) - 25 * hintsUsed - 10 * mistakes)
 * Base values: Easy 100, Medium 200, Hard 350, Expert 500.
 */

import { DifficultyLevel, HistoryRecord } from './types';

export const BASE_SCORES: Record<DifficultyLevel, number> = {
  easy: 100,
  medium: 200,
  hard: 350,
  expert: 500,
};

/**
 * Calculates score for a completed game.
 * Pure function with no side effects.
 */
export function calculateGameScore(
  level: DifficultyLevel,
  seconds: number,
  hintsUsed: number,
  mistakes: number
): number {
  const base = BASE_SCORES[level];
  const timePenalty = Math.floor(Math.max(0, seconds) / 5);
  const hintPenalty = 25 * Math.max(0, hintsUsed);
  const mistakePenalty = 10 * Math.max(0, mistakes);

  const rawScore = base - timePenalty - hintPenalty - mistakePenalty;
  const floorScore = Math.floor(0.2 * base);

  return Math.max(floorScore, rawScore);
}

/**
 * Calculates daily score for a given target date string (YYYY-MM-DD)
 * by summing the scores of all games completed on that date.
 */
export function calculateDailyScore(records: HistoryRecord[], targetDateString: string): number {
  return records
    .filter(record => record.date === targetDateString)
    .reduce((sum, record) => sum + record.score, 0);
}
