/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Sudoku Logical Techniques and Solver Simulation.
 * Used for human-like difficulty grading without UI/browser dependencies.
 */

import { SudokuGrid, DifficultyLevel } from './types';
import { cloneGrid, isValidPlacement } from './solver';

export type TechniqueName =
  | 'naked_single'
  | 'hidden_single'
  | 'naked_pair'
  | 'hidden_pair'
  | 'pointing_claiming'
  | 'triples'
  | 'x_wing'
  | 'y_wing'
  | 'swordfish'
  | 'xy_chain';

export interface TechniqueResult {
  applied: boolean;
  technique?: TechniqueName;
  description?: string;
}

// 9x9 candidate matrix representation: Set of numbers 1..9 for each cell
export type CandidateMatrix = Set<number>[][];

export function initCandidates(grid: SudokuGrid): CandidateMatrix {
  const matrix: CandidateMatrix = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => new Set<number>())
  );

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] === 0) {
        for (let num = 1; num <= 9; num++) {
          if (isValidPlacement(grid, r, c, num)) {
            matrix[r][c].add(num);
          }
        }
      }
    }
  }

  return matrix;
}

export function eliminateFromHouse(
  matrix: CandidateMatrix,
  row: number,
  col: number,
  num: number
): void {
  // Remove from row
  for (let c = 0; c < 9; c++) {
    matrix[row][c].delete(num);
  }
  // Remove from col
  for (let r = 0; r < 9; r++) {
    matrix[r][col].delete(num);
  }
  // Remove from 3x3 box
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      matrix[br + r][bc + c].delete(num);
    }
  }
}

/**
 * 1. Naked Single: Cell has exactly 1 candidate.
 */
export function applyNakedSingles(grid: SudokuGrid, matrix: CandidateMatrix): TechniqueResult {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] === 0 && matrix[r][c].size === 1) {
        const [val] = matrix[r][c];
        grid[r][c] = val;
        matrix[r][c].clear();
        eliminateFromHouse(matrix, r, c, val);
        return { applied: true, technique: 'naked_single' };
      }
    }
  }
  return { applied: false };
}

/**
 * 2. Hidden Single: Number only appears once in a row, col, or box.
 */
export function applyHiddenSingles(grid: SudokuGrid, matrix: CandidateMatrix): TechniqueResult {
  // Check rows
  for (let r = 0; r < 9; r++) {
    for (let num = 1; num <= 9; num++) {
      let count = 0;
      let targetCol = -1;
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0 && matrix[r][c].has(num)) {
          count++;
          targetCol = c;
        }
      }
      if (count === 1) {
        grid[r][targetCol] = num;
        matrix[r][targetCol].clear();
        eliminateFromHouse(matrix, r, targetCol, num);
        return { applied: true, technique: 'hidden_single' };
      }
    }
  }

  // Check columns
  for (let c = 0; c < 9; c++) {
    for (let num = 1; num <= 9; num++) {
      let count = 0;
      let targetRow = -1;
      for (let r = 0; r < 9; r++) {
        if (grid[r][c] === 0 && matrix[r][c].has(num)) {
          count++;
          targetRow = r;
        }
      }
      if (count === 1) {
        grid[targetRow][c] = num;
        matrix[targetRow][c].clear();
        eliminateFromHouse(matrix, targetRow, c, num);
        return { applied: true, technique: 'hidden_single' };
      }
    }
  }

  // Check 3x3 boxes
  for (let b = 0; b < 9; b++) {
    const br = Math.floor(b / 3) * 3;
    const bc = (b % 3) * 3;
    for (let num = 1; num <= 9; num++) {
      let count = 0;
      let targetRow = -1;
      let targetCol = -1;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const row = br + r;
          const col = bc + c;
          if (grid[row][col] === 0 && matrix[row][col].has(num)) {
            count++;
            targetRow = row;
            targetCol = col;
          }
        }
      }
      if (count === 1) {
        grid[targetRow][targetCol] = num;
        matrix[targetRow][targetCol].clear();
        eliminateFromHouse(matrix, targetRow, targetCol, num);
        return { applied: true, technique: 'hidden_single' };
      }
    }
  }

  return { applied: false };
}

/**
 * 3. Naked Pairs: Two cells in same house have identical 2 candidates.
 */
export function applyNakedPairs(grid: SudokuGrid, matrix: CandidateMatrix): TechniqueResult {
  // Houses helper: returns array of cell coords for each house
  const houses: { r: number; c: number }[][] = [];

  // Rows
  for (let r = 0; r < 9; r++) {
    houses.push(Array.from({ length: 9 }, (_, c) => ({ r, c })));
  }
  // Cols
  for (let c = 0; c < 9; c++) {
    houses.push(Array.from({ length: 9 }, (_, r) => ({ r, c })));
  }
  // Boxes
  for (let b = 0; b < 9; b++) {
    const box: { r: number; c: number }[] = [];
    const br = Math.floor(b / 3) * 3;
    const bc = (b % 3) * 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        box.push({ r: br + r, c: bc + c });
      }
    }
    houses.push(box);
  }

  for (const house of houses) {
    const pairCells = house.filter(cell => grid[cell.r][cell.c] === 0 && matrix[cell.r][cell.c].size === 2);
    for (let i = 0; i < pairCells.length; i++) {
      for (let j = i + 1; j < pairCells.length; j++) {
        const c1 = pairCells[i];
        const c2 = pairCells[j];
        const s1 = matrix[c1.r][c1.c];
        const s2 = matrix[c2.r][c2.c];

        const arr1 = Array.from(s1);
        const arr2 = Array.from(s2);
        if (arr1[0] === arr2[0] && arr1[1] === arr2[1]) {
          // Found naked pair! Eliminate these 2 candidates from other cells in house
          let modified = false;
          for (const other of house) {
            if ((other.r !== c1.r || other.c !== c1.c) && (other.r !== c2.r || other.c !== c2.c)) {
              if (matrix[other.r][other.c].has(arr1[0])) {
                matrix[other.r][other.c].delete(arr1[0]);
                modified = true;
              }
              if (matrix[other.r][other.c].has(arr1[1])) {
                matrix[other.r][other.c].delete(arr1[1]);
                modified = true;
              }
            }
          }
          if (modified) {
            return { applied: true, technique: 'naked_pair' };
          }
        }
      }
    }
  }

  return { applied: false };
}

/**
 * 4. Pointing / Claiming (Box-Line Reduction)
 */
export function applyPointingAndClaiming(grid: SudokuGrid, matrix: CandidateMatrix): TechniqueResult {
  // Pointing: within a box, candidate only appears in 1 row or 1 col -> eliminate from rest of row/col
  for (let b = 0; b < 9; b++) {
    const br = Math.floor(b / 3) * 3;
    const bc = (b % 3) * 3;

    for (let num = 1; num <= 9; num++) {
      const rows = new Set<number>();
      const cols = new Set<number>();

      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const row = br + r;
          const col = bc + c;
          if (grid[row][col] === 0 && matrix[row][col].has(num)) {
            rows.add(row);
            cols.add(col);
          }
        }
      }

      if (rows.size === 1) {
        const [targetRow] = rows;
        let modified = false;
        for (let c = 0; c < 9; c++) {
          if (c < bc || c >= bc + 3) {
            if (grid[targetRow][c] === 0 && matrix[targetRow][c].has(num)) {
              matrix[targetRow][c].delete(num);
              modified = true;
            }
          }
        }
        if (modified) {
          return { applied: true, technique: 'pointing_claiming' };
        }
      }

      if (cols.size === 1) {
        const [targetCol] = cols;
        let modified = false;
        for (let r = 0; r < 9; r++) {
          if (r < br || r >= br + 3) {
            if (grid[r][targetCol] === 0 && matrix[r][targetCol].has(num)) {
              matrix[r][targetCol].delete(num);
              modified = true;
            }
          }
        }
        if (modified) {
          return { applied: true, technique: 'pointing_claiming' };
        }
      }
    }
  }

  // Claiming: within a row or col, candidate only appears in 1 box -> eliminate from rest of box
  for (let r = 0; r < 9; r++) {
    for (let num = 1; num <= 9; num++) {
      const boxes = new Set<number>();
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0 && matrix[r][c].has(num)) {
          boxes.add(Math.floor(c / 3));
        }
      }
      if (boxes.size === 1) {
        const [targetBoxCol] = boxes;
        const br = Math.floor(r / 3) * 3;
        const bc = targetBoxCol * 3;
        let modified = false;
        for (let rr = br; rr < br + 3; rr++) {
          if (rr !== r) {
            for (let cc = bc; cc < bc + 3; cc++) {
              if (grid[rr][cc] === 0 && matrix[rr][cc].has(num)) {
                matrix[rr][cc].delete(num);
                modified = true;
              }
            }
          }
        }
        if (modified) {
          return { applied: true, technique: 'pointing_claiming' };
        }
      }
    }
  }

  return { applied: false };
}

/**
 * 5. Triples (Naked Triples)
 */
export function applyTriples(grid: SudokuGrid, matrix: CandidateMatrix): TechniqueResult {
  // Check rows for naked triples
  for (let r = 0; r < 9; r++) {
    const candidates = [];
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] === 0 && matrix[r][c].size >= 2 && matrix[r][c].size <= 3) {
        candidates.push({ col: c, set: matrix[r][c] });
      }
    }
    if (candidates.length >= 3) {
      for (let i = 0; i < candidates.length; i++) {
        for (let j = i + 1; j < candidates.length; j++) {
          for (let k = j + 1; k < candidates.length; k++) {
            const union = new Set([
              ...candidates[i].set,
              ...candidates[j].set,
              ...candidates[k].set,
            ]);
            if (union.size === 3) {
              let modified = false;
              for (let c = 0; c < 9; c++) {
                if (c !== candidates[i].col && c !== candidates[j].col && c !== candidates[k].col) {
                  for (const num of union) {
                    if (matrix[r][c].has(num)) {
                      matrix[r][c].delete(num);
                      modified = true;
                    }
                  }
                }
              }
              if (modified) {
                return { applied: true, technique: 'triples' };
              }
            }
          }
        }
      }
    }
  }
  return { applied: false };
}

/**
 * 6. X-Wing: 2 rows with candidate in identical 2 columns
 */
export function applyXWing(grid: SudokuGrid, matrix: CandidateMatrix): TechniqueResult {
  for (let num = 1; num <= 9; num++) {
    const rowCandCols: { row: number; cols: number[] }[] = [];
    for (let r = 0; r < 9; r++) {
      const cols: number[] = [];
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0 && matrix[r][c].has(num)) {
          cols.push(c);
        }
      }
      if (cols.length === 2) {
        rowCandCols.push({ row: r, cols });
      }
    }

    if (rowCandCols.length >= 2) {
      for (let i = 0; i < rowCandCols.length; i++) {
        for (let j = i + 1; j < rowCandCols.length; j++) {
          const r1 = rowCandCols[i];
          const r2 = rowCandCols[j];
          if (r1.cols[0] === r2.cols[0] && r1.cols[1] === r2.cols[1]) {
            // X-Wing found! Eliminate num from other rows in these 2 columns
            const c1 = r1.cols[0];
            const c2 = r1.cols[1];
            let modified = false;
            for (let r = 0; r < 9; r++) {
              if (r !== r1.row && r !== r2.row) {
                if (matrix[r][c1].has(num)) {
                  matrix[r][c1].delete(num);
                  modified = true;
                }
                if (matrix[r][c2].has(num)) {
                  matrix[r][c2].delete(num);
                  modified = true;
                }
              }
            }
            if (modified) {
              return { applied: true, technique: 'x_wing' };
            }
          }
        }
      }
    }
  }

  return { applied: false };
}

/**
 * 7. Y-Wing (XY-Wing)
 */
export function applyYWing(grid: SudokuGrid, matrix: CandidateMatrix): TechniqueResult {
  // Find all bivalue cells (size === 2)
  const biCells: { r: number; c: number; a: number; b: number }[] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] === 0 && matrix[r][c].size === 2) {
        const [a, b] = Array.from(matrix[r][c]);
        biCells.push({ r, c, a, b });
      }
    }
  }

  function canSee(r1: number, c1: number, r2: number, c2: number): boolean {
    if (r1 === r2 && c1 === c2) return false;
    if (r1 === r2 || c1 === c2) return true;
    return Math.floor(r1 / 3) === Math.floor(r2 / 3) && Math.floor(c1 / 3) === Math.floor(c2 / 3);
  }

  // Iterate potential pivot
  for (const pivot of biCells) {
    const pincers = biCells.filter(cell => canSee(pivot.r, pivot.c, cell.r, cell.c));
    for (let i = 0; i < pincers.length; i++) {
      for (let j = i + 1; j < pincers.length; j++) {
        const p1 = pincers[i];
        const p2 = pincers[j];
        if (canSee(p1.r, p1.c, p2.r, p2.c)) continue; // Must be wings

        // Check if pivot is AB, p1 is AC, p2 is BC
        const pivotCand = new Set([pivot.a, pivot.b]);
        const p1Cand = new Set([p1.a, p1.b]);
        const p2Cand = new Set([p2.a, p2.b]);

        const allCand = new Set([...pivotCand, ...p1Cand, ...p2Cand]);
        if (allCand.size !== 3) continue;

        // Find candidate C that is in p1 and p2 but not pivot
        let cVal = -1;
        for (const num of allCand) {
          if (!pivotCand.has(num) && p1Cand.has(num) && p2Cand.has(num)) {
            cVal = num;
            break;
          }
        }
        if (cVal === -1) continue;

        // Eliminate cVal from any cell that sees both p1 and p2
        let modified = false;
        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            if (grid[r][c] === 0 && matrix[r][c].has(cVal)) {
              if (canSee(r, c, p1.r, p1.c) && canSee(r, c, p2.r, p2.c)) {
                matrix[r][c].delete(cVal);
                modified = true;
              }
            }
          }
        }
        if (modified) {
          return { applied: true, technique: 'y_wing' };
        }
      }
    }
  }

  return { applied: false };
}
