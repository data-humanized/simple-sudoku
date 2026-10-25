/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Pure TypeScript Sudoku Solver and Uniqueness Checker.
 * Zero UI/browser dependencies.
 */

import { SudokuGrid } from './types';

export function createEmptyGrid(): SudokuGrid {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

export function cloneGrid(grid: SudokuGrid): SudokuGrid {
  return grid.map(row => [...row]);
}

export function isValidPlacement(grid: SudokuGrid, row: number, col: number, num: number): boolean {
  for (let c = 0; c < 9; c++) {
    if (c !== col && grid[row][c] === num) return false;
  }
  for (let r = 0; r < 9; r++) {
    if (r !== row && grid[r][col] === num) return false;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const cr = boxRow + r;
      const cc = boxCol + c;
      if ((cr !== row || cc !== col) && grid[cr][cc] === num) return false;
    }
  }
  return true;
}

export function getCandidates(grid: SudokuGrid, row: number, col: number): number[] {
  if (grid[row][col] !== 0) return [];
  const candidates: number[] = [];
  for (let num = 1; num <= 9; num++) {
    if (isValidPlacement(grid, row, col, num)) {
      candidates.push(num);
    }
  }
  return candidates;
}

/**
 * Counts total solutions for the given Sudoku grid up to `limit`.
 * Setting limit=2 is ideal for uniqueness verification.
 */
export function countSolutions(grid: SudokuGrid, limit = 2): number {
  let count = 0;
  const working = cloneGrid(grid);

  function backtrack(): boolean {
    let minCandidates = 10;
    let targetRow = -1;
    let targetCol = -1;
    let targetCandidates: number[] = [];

    // Find cell with fewest candidates (MRV heuristic)
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (working[r][c] === 0) {
          const candidates = getCandidates(working, r, c);
          if (candidates.length === 0) {
            return false; // Dead end
          }
          if (candidates.length < minCandidates) {
            minCandidates = candidates.length;
            targetRow = r;
            targetCol = c;
            targetCandidates = candidates;
            if (minCandidates === 1) break;
          }
        }
      }
      if (minCandidates === 1) break;
    }

    // If no empty cells left, we found a valid solution
    if (targetRow === -1) {
      count++;
      return count >= limit;
    }

    for (const num of targetCandidates) {
      working[targetRow][targetCol] = num;
      if (backtrack()) {
        return true;
      }
      working[targetRow][targetCol] = 0;
    }

    return false;
  }

  backtrack();
  return count;
}

/**
 * Solves a Sudoku puzzle and returns the solution if unique.
 */
export function solveSudoku(grid: SudokuGrid): {
  solved: boolean;
  solution: SudokuGrid | null;
  solutionCount: number;
} {
  const working = cloneGrid(grid);
  let foundSolution: SudokuGrid | null = null;
  let count = 0;

  function backtrack(): boolean {
    let minCandidates = 10;
    let targetRow = -1;
    let targetCol = -1;
    let targetCandidates: number[] = [];

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (working[r][c] === 0) {
          const candidates = getCandidates(working, r, c);
          if (candidates.length === 0) return false;
          if (candidates.length < minCandidates) {
            minCandidates = candidates.length;
            targetRow = r;
            targetCol = c;
            targetCandidates = candidates;
            if (minCandidates === 1) break;
          }
        }
      }
      if (minCandidates === 1) break;
    }

    if (targetRow === -1) {
      count++;
      if (!foundSolution) {
        foundSolution = cloneGrid(working);
      }
      return count >= 2; // Stop if we already know it's not unique
    }

    for (const num of targetCandidates) {
      working[targetRow][targetCol] = num;
      if (backtrack()) {
        return true;
      }
      working[targetRow][targetCol] = 0;
    }

    return false;
  }

  backtrack();

  return {
    solved: foundSolution !== null,
    solution: foundSolution,
    solutionCount: count,
  };
}

export function isBoardCompleteAndCorrect(current: SudokuGrid, solution: SudokuGrid): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (current[r][c] === 0 || current[r][c] !== solution[r][c]) {
        return false;
      }
    }
  }
  return true;
}
