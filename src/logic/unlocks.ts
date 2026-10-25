/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Sudoku Level Progression & Unlock Rules.
 * 
 * Rules:
 * - Easy: unlocked from the start.
 * - Medium: unlocks after 2 completed Easy games.
 * - Hard: unlocks after 4 completed Medium games.
 * - Expert: unlocks after 16 completed Hard games.
 */

import { DifficultyLevel, UnlockStatus } from './types';

export const UNLOCK_REQUIREMENTS: Record<
  DifficultyLevel,
  { requiredCount: number; prerequisiteLevel: DifficultyLevel | null }
> = {
  easy: {
    requiredCount: 0,
    prerequisiteLevel: null,
  },
  medium: {
    requiredCount: 2,
    prerequisiteLevel: 'easy',
  },
  hard: {
    requiredCount: 4,
    prerequisiteLevel: 'medium',
  },
  expert: {
    requiredCount: 16,
    prerequisiteLevel: 'hard',
  },
};

export const LEVEL_DISPLAY_NAMES: Record<DifficultyLevel, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  expert: 'Expert',
};

/**
 * Returns unlock status for a specific level.
 */
export function getUnlockStatus(
  level: DifficultyLevel,
  completedCounts: Record<DifficultyLevel, number>
): UnlockStatus {
  const req = UNLOCK_REQUIREMENTS[level];

  if (!req.prerequisiteLevel) {
    return {
      level,
      isUnlocked: true,
      current: 0,
      required: 0,
      prerequisiteLevel: null,
    };
  }

  const current = completedCounts[req.prerequisiteLevel] || 0;
  const isUnlocked = current >= req.requiredCount;

  return {
    level,
    isUnlocked,
    current: Math.min(current, req.requiredCount),
    required: req.requiredCount,
    prerequisiteLevel: req.prerequisiteLevel,
  };
}

/**
 * Returns unlock statuses for all 4 levels.
 */
export function getAllUnlockStatuses(
  completedCounts: Record<DifficultyLevel, number>
): Record<DifficultyLevel, UnlockStatus> {
  return {
    easy: getUnlockStatus('easy', completedCounts),
    medium: getUnlockStatus('medium', completedCounts),
    hard: getUnlockStatus('hard', completedCounts),
    expert: getUnlockStatus('expert', completedCounts),
  };
}
