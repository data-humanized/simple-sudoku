/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Streak calculation logic based on local device calendar dates.
 * 
 * Rules:
 * - A day counts toward the streak when >= 1 game is completed that day (local time).
 * - If a day passes with no completed game, the streak resets to 0 on the next day.
 * - Best streak is tracked across all historical records.
 */

import { HistoryRecord, StreakInfo } from './types';

/**
 * Returns YYYY-MM-DD formatted string in local time.
 */
export function formatLocalDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Converts a YYYY-MM-DD string to a Date object at local midnight.
 */
export function parseLocalDate(dateString: string): Date {
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/**
 * Calculates current streak and best streak.
 */
export function calculateStreak(
  records: HistoryRecord[],
  referenceDate: Date = new Date()
): StreakInfo {
  if (records.length === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      lastCompletedDate: null,
    };
  }

  // Get unique calendar dates with at least one completed game
  const completedDateStrings = Array.from(new Set(records.map(r => r.date))).sort();

  if (completedDateStrings.length === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      lastCompletedDate: null,
    };
  }

  const lastCompletedDate = completedDateStrings[completedDateStrings.length - 1];

  // Calculate best historical streak
  let bestStreak = 1;
  let currentRun = 1;

  for (let i = 1; i < completedDateStrings.length; i++) {
    const prevDate = parseLocalDate(completedDateStrings[i - 1]);
    const currDate = parseLocalDate(completedDateStrings[i]);
    const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentRun++;
      if (currentRun > bestStreak) {
        bestStreak = currentRun;
      }
    } else {
      currentRun = 1;
    }
  }

  // Calculate active streak relative to reference date (today)
  const todayStr = formatLocalDate(referenceDate);
  const yesterday = new Date(referenceDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatLocalDate(yesterday);

  const completedDatesSet = new Set(completedDateStrings);

  let activeStreak = 0;

  if (completedDatesSet.has(todayStr)) {
    // Played today: count backwards from today
    activeStreak = 1;
    const checkDate = new Date(referenceDate);
    while (true) {
      checkDate.setDate(checkDate.getDate() - 1);
      const prevStr = formatLocalDate(checkDate);
      if (completedDatesSet.has(prevStr)) {
        activeStreak++;
      } else {
        break;
      }
    }
  } else if (completedDatesSet.has(yesterdayStr)) {
    // Not played yet today, but played yesterday: streak is intact from yesterday
    activeStreak = 1;
    const checkDate = new Date(yesterday);
    while (true) {
      checkDate.setDate(checkDate.getDate() - 1);
      const prevStr = formatLocalDate(checkDate);
      if (completedDatesSet.has(prevStr)) {
        activeStreak++;
      } else {
        break;
      }
    }
  } else {
    // Neither today nor yesterday had a completed game -> streak broken
    activeStreak = 0;
  }

  return {
    currentStreak: activeStreak,
    bestStreak: Math.max(bestStreak, activeStreak),
    lastCompletedDate,
  };
}
