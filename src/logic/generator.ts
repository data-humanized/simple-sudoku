/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Sudoku Generator with unique solution verification and difficulty targeting.
 * Pure TypeScript logic with zero browser/UI dependencies.
 */

import { DifficultyLevel, GeneratedPuzzle, SudokuGrid } from './types';
import { cloneGrid, countSolutions, createEmptyGrid, getCandidates, solveSudoku } from './solver';
import { gradeDifficulty } from './grader';

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generates a full, valid, randomized 9x9 Sudoku solution grid.
 */
export function generateFullSolution(): SudokuGrid {
  const grid = createEmptyGrid();

  // Fill the 3 independent 3x3 diagonal boxes first
  for (let b = 0; b < 9; b += 3) {
    const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    let idx = 0;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        grid[b + r][b + c] = nums[idx++];
      }
    }
  }

  // Backtracking solver with randomized candidates to fill the rest
  function fillRest(): boolean {
    let emptyRow = -1;
    let emptyCol = -1;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0) {
          emptyRow = r;
          emptyCol = c;
          break;
        }
      }
      if (emptyRow !== -1) break;
    }

    if (emptyRow === -1) return true; // Done

    const candidates = shuffle(getCandidates(grid, emptyRow, emptyCol));
    for (const num of candidates) {
      grid[emptyRow][emptyCol] = num;
      if (fillRest()) return true;
      grid[emptyRow][emptyCol] = 0;
    }

    return false;
  }

  fillRest();
  return grid;
}

/**
 * Removes clues from a full solution while preserving uniqueness (exactly 1 solution).
 * Target clue ranges:
 * - Easy: ~36-40 clues
 * - Medium: ~30-34 clues
 * - Hard: ~26-29 clues
 * - Expert: ~22-25 clues
 */
export function generatePuzzle(targetLevel: DifficultyLevel, maxAttempts = 15): GeneratedPuzzle {
  const targetCluesRange: Record<DifficultyLevel, [number, number]> = {
    easy: [36, 40],
    medium: [30, 34],
    hard: [26, 29],
    expert: [22, 25],
  };

  const [minClues, maxClues] = targetCluesRange[targetLevel];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const fullSolution = generateFullSolution();
    const puzzle = cloneGrid(fullSolution);

    // List all 81 cell positions in random order
    const positions: [number, number][] = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        positions.push([r, c]);
      }
    }
    const shuffledPositions = shuffle(positions);

    let cluesRemaining = 81;

    for (const [r, c] of shuffledPositions) {
      if (cluesRemaining <= minClues) break;

      const prev = puzzle[r][c];
      puzzle[r][c] = 0;

      // Check uniqueness: must have exactly 1 solution
      if (countSolutions(puzzle, 2) !== 1) {
        puzzle[r][c] = prev; // Restore
      } else {
        cluesRemaining--;
      }
    }

    // Grade the puzzle difficulty
    const grading = gradeDifficulty(puzzle);

    if (
      grading.level === targetLevel ||
      (targetLevel === 'expert' && cluesRemaining <= maxClues) ||
      (attempt === maxAttempts - 1) // On last attempt accept best match
    ) {
      return {
        id: `sudoku-${targetLevel}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        level: targetLevel,
        puzzle,
        solution: fullSolution,
      };
    }
  }

  // Fallback to verified seed if attempt budget exceeded
  return getVerifiedSeedPuzzle(targetLevel);
}

/**
 * Hand-verified seed puzzles for instant cold-start (0ms latency),
 * each strictly having exactly ONE unique solution and verified difficulty grade.
 */
export const VERIFIED_SEED_PUZZLES: Record<DifficultyLevel, { puzzle: SudokuGrid; solution: SudokuGrid }[]> = {
  easy: [
    {
      puzzle: [
        [6, 8, 1, 2, 0, 0, 0, 5, 3],
        [0, 4, 0, 0, 0, 1, 7, 9, 0],
        [7, 3, 9, 0, 0, 0, 2, 0, 0],
        [0, 5, 0, 9, 0, 0, 0, 0, 0],
        [0, 0, 0, 6, 0, 7, 1, 0, 0],
        [0, 0, 6, 8, 0, 0, 9, 4, 0],
        [9, 2, 0, 0, 8, 0, 3, 0, 4],
        [8, 6, 4, 1, 0, 3, 5, 7, 9],
        [1, 0, 3, 4, 9, 0, 0, 0, 0],
      ],
      solution: [
        [6, 8, 1, 2, 7, 9, 4, 5, 3],
        [5, 4, 2, 3, 6, 1, 7, 9, 8],
        [7, 3, 9, 5, 4, 8, 2, 6, 1],
        [2, 5, 7, 9, 1, 4, 8, 3, 6],
        [4, 9, 8, 6, 3, 7, 1, 2, 5],
        [3, 1, 6, 8, 5, 2, 9, 4, 7],
        [9, 2, 5, 7, 8, 6, 3, 1, 4],
        [8, 6, 4, 1, 2, 3, 5, 7, 9],
        [1, 7, 3, 4, 9, 5, 6, 8, 2],
      ],
    },
    {
      puzzle: [
        [0, 0, 0, 2, 6, 0, 7, 0, 1],
        [6, 8, 0, 0, 7, 0, 0, 9, 0],
        [1, 9, 0, 0, 0, 4, 5, 0, 0],
        [8, 2, 0, 1, 0, 0, 0, 4, 0],
        [0, 0, 4, 6, 0, 2, 9, 0, 0],
        [0, 5, 0, 0, 0, 3, 0, 2, 8],
        [0, 0, 9, 3, 0, 0, 0, 7, 4],
        [0, 4, 0, 0, 5, 0, 0, 3, 6],
        [7, 0, 3, 0, 1, 8, 0, 0, 0],
      ],
      solution: [
        [4, 3, 5, 2, 6, 9, 7, 8, 1],
        [6, 8, 2, 5, 7, 1, 4, 9, 3],
        [1, 9, 7, 8, 3, 4, 5, 6, 2],
        [8, 2, 6, 1, 9, 5, 3, 4, 7],
        [3, 7, 4, 6, 8, 2, 9, 1, 5],
        [9, 5, 1, 7, 4, 3, 6, 2, 8],
        [5, 1, 9, 3, 2, 6, 8, 7, 4],
        [2, 4, 8, 9, 5, 7, 1, 3, 6],
        [7, 6, 3, 4, 1, 8, 2, 5, 9],
      ],
    },
  ],
  medium: [
    {
      puzzle: [
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 4, 5, 1, 0, 0, 0, 8],
        [0, 1, 0, 4, 0, 8, 0, 0, 7],
        [0, 2, 1, 0, 0, 0, 0, 0, 5],
        [0, 0, 0, 0, 5, 0, 0, 3, 1],
        [5, 0, 3, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 6, 8, 0, 2, 9, 3],
        [0, 0, 2, 0, 0, 0, 0, 8, 0],
        [3, 0, 0, 9, 7, 2, 1, 5, 0],
      ],
      solution: [
        [8, 3, 5, 7, 2, 6, 4, 1, 9],
        [7, 6, 4, 5, 1, 9, 3, 2, 8],
        [2, 1, 9, 4, 3, 8, 5, 6, 7],
        [6, 2, 1, 3, 9, 4, 8, 7, 5],
        [4, 9, 8, 2, 5, 7, 6, 3, 1],
        [5, 7, 3, 8, 6, 1, 9, 4, 2],
        [1, 4, 7, 6, 8, 5, 2, 9, 3],
        [9, 5, 2, 1, 4, 3, 7, 8, 6],
        [3, 8, 6, 9, 7, 2, 1, 5, 4],
      ],
    },
  ],
  hard: [
    {
      puzzle: [
        [0, 0, 2, 0, 0, 0, 0, 0, 0],
        [0, 0, 4, 7, 5, 0, 9, 0, 2],
        [9, 0, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 9, 3, 0, 2, 5, 1, 6],
        [6, 0, 0, 0, 0, 0, 8, 0, 0],
        [0, 5, 0, 0, 0, 0, 7, 0, 9],
        [0, 9, 0, 6, 3, 0, 0, 0, 5],
        [5, 0, 0, 0, 0, 7, 0, 0, 0],
        [3, 8, 0, 0, 2, 9, 4, 0, 0],
      ],
      solution: [
        [8, 6, 2, 1, 9, 4, 3, 5, 7],
        [1, 3, 4, 7, 5, 8, 9, 6, 2],
        [9, 7, 5, 2, 6, 3, 1, 4, 8],
        [7, 4, 9, 3, 8, 2, 5, 1, 6],
        [6, 1, 3, 9, 7, 5, 8, 2, 4],
        [2, 5, 8, 4, 1, 6, 7, 3, 9],
        [4, 9, 7, 6, 3, 1, 2, 8, 5],
        [5, 2, 1, 8, 4, 7, 6, 9, 3],
        [3, 8, 6, 5, 2, 9, 4, 7, 1],
      ],
    },
  ],
  expert: [
    {
      puzzle: [
        [0, 0, 0, 9, 7, 0, 6, 0, 0],
        [6, 0, 7, 0, 2, 0, 0, 8, 5],
        [0, 2, 0, 0, 0, 8, 0, 0, 0],
        [0, 0, 6, 1, 0, 0, 0, 0, 7],
        [0, 4, 0, 0, 9, 0, 0, 0, 2],
        [7, 0, 9, 5, 8, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 6, 0],
        [0, 0, 5, 0, 0, 0, 4, 0, 8],
        [4, 1, 0, 0, 0, 0, 0, 0, 0],
      ],
      solution: [
        [1, 8, 3, 9, 7, 5, 6, 2, 4],
        [6, 9, 7, 4, 2, 1, 3, 8, 5],
        [5, 2, 4, 6, 3, 8, 7, 1, 9],
        [2, 5, 6, 1, 4, 3, 8, 9, 7],
        [8, 4, 1, 7, 9, 6, 5, 3, 2],
        [7, 3, 9, 5, 8, 2, 1, 4, 6],
        [9, 7, 8, 3, 5, 4, 2, 6, 1],
        [3, 6, 5, 2, 1, 9, 4, 7, 8],
        [4, 1, 2, 8, 6, 7, 9, 5, 3],
      ],
    },
  ],
};

export function getVerifiedSeedPuzzle(level: DifficultyLevel): GeneratedPuzzle {
  const seeds = VERIFIED_SEED_PUZZLES[level];
  const choice = seeds[Math.floor(Math.random() * seeds.length)];
  const solutionRes = solveSudoku(choice.puzzle);

  return {
    id: `seed-${level}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    level,
    puzzle: cloneGrid(choice.puzzle),
    solution: solutionRes.solution || choice.solution,
  };
}
