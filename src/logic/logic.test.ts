/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Unit tests for ZenSudoku pure business logic modules.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  solveSudoku,
  countSolutions,
  isValidPlacement,
  isBoardCompleteAndCorrect,
  calculateGameScore,
  calculateDailyScore,
  getUnlockStatus,
  getAllUnlockStatuses,
  calculateStreak,
  formatLocalDate,
  calculateStats,
  gradeDifficulty,
  createInitialGameState,
  setCellValue,
  toggleNote,
  eraseCell,
  applyHintFillNumber,
  applyHintFillCandidates,
  undo,
  redo,
  VERIFIED_SEED_PUZZLES,
} from './index';

import { HistoryRecord } from './types';

// Standard 9x9 test puzzle
const SAMPLE_PUZZLE = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
];

const KNOWN_SOLUTION = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

test('1. Solver and Uniqueness Check', async (t) => {
  await t.test('Solves a valid Sudoku puzzle correctly', () => {
    const res = solveSudoku(SAMPLE_PUZZLE);
    assert.equal(res.solved, true);
    assert.equal(res.solutionCount, 1);
    assert.deepEqual(res.solution, KNOWN_SOLUTION);
  });

  await t.test('Correctly reports exactly 1 solution for unique puzzle', () => {
    const count = countSolutions(SAMPLE_PUZZLE, 2);
    assert.equal(count, 1);
  });

  await t.test('Detects multiple solutions when too many clues removed', () => {
    // Blank board has millions of solutions; countSolutions should stop at limit (2)
    const empty = Array.from({ length: 9 }, () => Array(9).fill(0));
    const count = countSolutions(empty, 2);
    assert.equal(count, 2);
  });

  await t.test('Validates placement constraints in row, col, and box', () => {
    assert.equal(isValidPlacement(SAMPLE_PUZZLE, 0, 2, 4), true);
    assert.equal(isValidPlacement(SAMPLE_PUZZLE, 0, 2, 5), false); // 5 already in row
    assert.equal(isValidPlacement(SAMPLE_PUZZLE, 0, 2, 6), false); // 6 already in col
    assert.equal(isValidPlacement(SAMPLE_PUZZLE, 0, 2, 9), false); // 9 already in box
  });

  await t.test('Verified seed puzzles have unique solutions', () => {
    for (const level of ['easy', 'medium', 'hard', 'expert'] as const) {
      const seeds = VERIFIED_SEED_PUZZLES[level];
      for (const s of seeds) {
        const count = countSolutions(s.puzzle, 2);
        assert.equal(count, 1, `Seed for ${level} must have exactly 1 solution`);
      }
    }
  });
});

test('2. Difficulty Grader', async (t) => {
  await t.test('Grades easy puzzle with singles', () => {
    const easyPuzzle = VERIFIED_SEED_PUZZLES.easy[0].puzzle;
    const grading = gradeDifficulty(easyPuzzle);
    assert.equal(grading.level, 'easy');
  });

  await t.test('Grades medium puzzle requiring pairs or box-line reductions', () => {
    const mediumPuzzle = VERIFIED_SEED_PUZZLES.medium[0].puzzle;
    const grading = gradeDifficulty(mediumPuzzle);
    assert.ok(grading.level === 'medium' || grading.level === 'hard');
  });
});

test('3. Scoring Formula', async (t) => {
  await t.test('Computes exact score without penalties', () => {
    // Easy base 100, 0s, 0 hints, 0 mistakes = 100
    assert.equal(calculateGameScore('easy', 0, 0, 0), 100);
    // Medium base 200
    assert.equal(calculateGameScore('medium', 0, 0, 0), 200);
    // Hard base 350
    assert.equal(calculateGameScore('hard', 0, 0, 0), 350);
    // Expert base 500
    assert.equal(calculateGameScore('expert', 0, 0, 0), 500);
  });

  await t.test('Applies time penalty: floor(seconds / 5)', () => {
    // 24s -> 4 pts penalty. 100 - 4 = 96
    assert.equal(calculateGameScore('easy', 24, 0, 0), 96);
    // 25s -> 5 pts penalty. 100 - 5 = 95
    assert.equal(calculateGameScore('easy', 25, 0, 0), 95);
  });

  await t.test('Applies hint penalty: 25 per hint and mistake penalty: 10 per mistake', () => {
    // Medium base 200, 50s (10 penalty), 2 hints (50), 3 mistakes (30) -> 200 - 10 - 50 - 30 = 110
    assert.equal(calculateGameScore('medium', 50, 2, 3), 110);
  });

  await t.test('Enforces minimum floor score: floor(0.2 * base)', () => {
    // Easy base 100 -> min floor is 20
    assert.equal(calculateGameScore('easy', 10000, 10, 10), 20);
    // Medium base 200 -> min floor is 40
    assert.equal(calculateGameScore('medium', 10000, 10, 10), 40);
    // Hard base 350 -> min floor is 70
    assert.equal(calculateGameScore('hard', 10000, 10, 10), 70);
    // Expert base 500 -> min floor is 100
    assert.equal(calculateGameScore('expert', 10000, 10, 10), 100);
  });

  await t.test('Calculates daily total score', () => {
    const records: HistoryRecord[] = [
      { id: '1', date: '2026-10-24', completedAt: 1000, level: 'easy', timeSeconds: 60, score: 88, hintsUsed: 0, mistakes: 0 },
      { id: '2', date: '2026-10-24', completedAt: 2000, level: 'medium', timeSeconds: 120, score: 176, hintsUsed: 0, mistakes: 0 },
      { id: '3', date: '2026-10-23', completedAt: 500, level: 'hard', timeSeconds: 200, score: 300, hintsUsed: 0, mistakes: 0 },
    ];
    assert.equal(calculateDailyScore(records, '2026-10-24'), 264);
    assert.equal(calculateDailyScore(records, '2026-10-23'), 300);
    assert.equal(calculateDailyScore(records, '2026-10-22'), 0);
  });
});

test('4. Level Progression and Unlock Rules', async (t) => {
  await t.test('Easy is always unlocked from the start', () => {
    const status = getUnlockStatus('easy', { easy: 0, medium: 0, hard: 0, expert: 0 });
    assert.equal(status.isUnlocked, true);
    assert.equal(status.required, 0);
  });

  await t.test('Medium requires 2 completed Easy games', () => {
    assert.equal(getUnlockStatus('medium', { easy: 0, medium: 0, hard: 0, expert: 0 }).isUnlocked, false);
    assert.equal(getUnlockStatus('medium', { easy: 1, medium: 0, hard: 0, expert: 0 }).isUnlocked, false);
    assert.equal(getUnlockStatus('medium', { easy: 1, medium: 0, hard: 0, expert: 0 }).current, 1);
    assert.equal(getUnlockStatus('medium', { easy: 2, medium: 0, hard: 0, expert: 0 }).isUnlocked, true);
    assert.equal(getUnlockStatus('medium', { easy: 5, medium: 0, hard: 0, expert: 0 }).isUnlocked, true);
  });

  await t.test('Hard requires 4 completed Medium games', () => {
    assert.equal(getUnlockStatus('hard', { easy: 5, medium: 3, hard: 0, expert: 0 }).isUnlocked, false);
    assert.equal(getUnlockStatus('hard', { easy: 5, medium: 4, hard: 0, expert: 0 }).isUnlocked, true);
  });

  await t.test('Expert requires 16 completed Hard games', () => {
    assert.equal(getUnlockStatus('expert', { easy: 10, medium: 10, hard: 15, expert: 0 }).isUnlocked, false);
    assert.equal(getUnlockStatus('expert', { easy: 10, medium: 10, hard: 16, expert: 0 }).isUnlocked, true);
  });

  await t.test('getAllUnlockStatuses returns all four level states', () => {
    const all = getAllUnlockStatuses({ easy: 2, medium: 4, hard: 16, expert: 1 });
    assert.equal(all.easy.isUnlocked, true);
    assert.equal(all.medium.isUnlocked, true);
    assert.equal(all.hard.isUnlocked, true);
    assert.equal(all.expert.isUnlocked, true);
  });
});

test('5. Daily Streak Calculation', async (t) => {
  const refDate = new Date(2026, 9, 24, 12, 0, 0); // Oct 24, 2026

  await t.test('Streak is 0 if no records exist', () => {
    const streak = calculateStreak([], refDate);
    assert.equal(streak.currentStreak, 0);
    assert.equal(streak.bestStreak, 0);
  });

  await t.test('Streak is 1 when game completed today', () => {
    const records: HistoryRecord[] = [
      { id: '1', date: '2026-10-24', completedAt: 1, level: 'easy', timeSeconds: 60, score: 80, hintsUsed: 0, mistakes: 0 },
    ];
    const streak = calculateStreak(records, refDate);
    assert.equal(streak.currentStreak, 1);
    assert.equal(streak.bestStreak, 1);
  });

  await t.test('Streak is preserved if played yesterday but not yet today', () => {
    const records: HistoryRecord[] = [
      { id: '1', date: '2026-10-23', completedAt: 1, level: 'easy', timeSeconds: 60, score: 80, hintsUsed: 0, mistakes: 0 },
    ];
    const streak = calculateStreak(records, refDate);
    assert.equal(streak.currentStreak, 1);
    assert.equal(streak.bestStreak, 1);
  });

  await t.test('Streak resets to 0 if 2 days pass without playing', () => {
    const records: HistoryRecord[] = [
      { id: '1', date: '2026-10-22', completedAt: 1, level: 'easy', timeSeconds: 60, score: 80, hintsUsed: 0, mistakes: 0 },
    ];
    const streak = calculateStreak(records, refDate);
    assert.equal(streak.currentStreak, 0);
    assert.equal(streak.bestStreak, 1); // Best streak preserved
  });

  await t.test('Accumulates multi-day consecutive streak correctly', () => {
    const records: HistoryRecord[] = [
      { id: '1', date: '2026-10-20', completedAt: 1, level: 'easy', timeSeconds: 60, score: 80, hintsUsed: 0, mistakes: 0 },
      { id: '2', date: '2026-10-21', completedAt: 2, level: 'easy', timeSeconds: 60, score: 80, hintsUsed: 0, mistakes: 0 },
      { id: '3', date: '2026-10-22', completedAt: 3, level: 'medium', timeSeconds: 60, score: 80, hintsUsed: 0, mistakes: 0 },
      { id: '4', date: '2026-10-23', completedAt: 4, level: 'hard', timeSeconds: 60, score: 80, hintsUsed: 0, mistakes: 0 },
      { id: '5', date: '2026-10-24', completedAt: 5, level: 'expert', timeSeconds: 60, score: 80, hintsUsed: 0, mistakes: 0 },
    ];
    const streak = calculateStreak(records, refDate);
    assert.equal(streak.currentStreak, 5);
    assert.equal(streak.bestStreak, 5);
  });

  await t.test('Retains longer historical best streak even after reset', () => {
    const records: HistoryRecord[] = [
      // 4-day streak in past
      { id: '1', date: '2026-10-01', completedAt: 1, level: 'easy', timeSeconds: 60, score: 80, hintsUsed: 0, mistakes: 0 },
      { id: '2', date: '2026-10-02', completedAt: 2, level: 'easy', timeSeconds: 60, score: 80, hintsUsed: 0, mistakes: 0 },
      { id: '3', date: '2026-10-03', completedAt: 3, level: 'easy', timeSeconds: 60, score: 80, hintsUsed: 0, mistakes: 0 },
      { id: '4', date: '2026-10-04', completedAt: 4, level: 'easy', timeSeconds: 60, score: 80, hintsUsed: 0, mistakes: 0 },
      // gap, then today's game
      { id: '5', date: '2026-10-24', completedAt: 5, level: 'easy', timeSeconds: 60, score: 80, hintsUsed: 0, mistakes: 0 },
    ];
    const streak = calculateStreak(records, refDate);
    assert.equal(streak.currentStreak, 1);
    assert.equal(streak.bestStreak, 4);
  });
});

test('6. Game Actions, Undo/Redo, Notes, and Hints', async (t) => {
  const puzzleObj = {
    id: 'test-1',
    level: 'easy' as const,
    puzzle: SAMPLE_PUZZLE,
    solution: KNOWN_SOLUTION,
  };

  await t.test('Initializes state correctly', () => {
    const state = createInitialGameState(puzzleObj);
    assert.equal(state.isCompleted, false);
    assert.equal(state.mistakes, 0);
    assert.equal(state.hintsUsed, 0);
    assert.equal(state.undoStack.length, 0);
  });

  await t.test('Sets value, checks mistake, auto-removes notes, and supports undo/redo', () => {
    let state = createInitialGameState(puzzleObj);

    // Add note 4 and 7 in (0, 2)
    state = toggleNote(state, 0, 2, 4);
    state = toggleNote(state, 0, 2, 7);
    assert.deepEqual(state.notes[0][2], [4, 7]);

    // Also add note 4 in same row (0, 3)
    state = toggleNote(state, 0, 3, 4);
    assert.deepEqual(state.notes[0][3], [4]);

    // Set value 4 in (0, 2) - solution has 4 in (0, 2)
    state = setCellValue(state, 0, 2, 4, true);
    assert.equal(state.currentGrid[0][2], 4);
    assert.deepEqual(state.notes[0][2], []); // Real number clears cell notes
    assert.deepEqual(state.notes[0][3], []); // Auto-remove removed 4 from same row!
    assert.equal(state.mistakes, 0);

    // Now undo setting value
    state = undo(state);
    assert.equal(state.currentGrid[0][2], 0);
    assert.deepEqual(state.notes[0][2], [4, 7]); // Restored!

    // Redo
    state = redo(state);
    assert.equal(state.currentGrid[0][2], 4);

    // Place wrong value (mistake increment)
    state = setCellValue(state, 0, 3, 9, true); // (0, 3) should be 6
    assert.equal(state.mistakes, 1);
  });

  await t.test('Hint: Fill number fills correct cell and marks hinted', () => {
    let state = createInitialGameState(puzzleObj);
    const { state: nextState, targetPos } = applyHintFillNumber(state, { row: 0, col: 2 });
    assert.ok(targetPos);
    assert.equal(nextState.currentGrid[0][2], 4);
    assert.equal(nextState.hintedCells[0][2], true);
    assert.equal(nextState.hintsUsed, 1);

    // Undo hint
    const undone = undo(nextState);
    assert.equal(undone.currentGrid[0][2], 0);
    assert.equal(undone.hintedCells[0][2], false);
  });

  await t.test('Wrong entry does not remove peer notes and does not complete board', () => {
    let state = createInitialGameState(puzzleObj);

    // Place candidate note 9 in peer cell (0, 7)
    state = toggleNote(state, 0, 7, 9);
    assert.ok(state.notes[0][7].includes(9));

    // Place wrong value 9 in (0, 3) (solution has 6)
    state = setCellValue(state, 0, 3, 9, true);
    assert.equal(state.currentGrid[0][3], 9);
    assert.equal(state.mistakes, 1);
    // Peer note 9 must NOT have been removed because 9 was a wrong entry!
    assert.ok(state.notes[0][7].includes(9));

    // Fill candidates on (0, 2): should still calculate valid candidates without being blocked by wrong entry 9
    state = applyHintFillCandidates(state, { row: 0, col: 2 });
    // Solution for (0, 2) is 4; candidates should include 4
    assert.ok(state.notes[0][2].includes(4));

    // Erasing or overwriting wrong cell is fully supported
    state = eraseCell(state, 0, 3);
    assert.equal(state.currentGrid[0][3], 0);

    // Enter correct digit 6
    state = setCellValue(state, 0, 3, 6, true);
    assert.equal(state.currentGrid[0][3], 6);
  });
});

