/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Difficulty Grader based on human logical techniques.
 * Evaluates whether a puzzle is Easy, Medium, Hard, or Expert.
 */

import { SudokuGrid, DifficultyLevel } from './types';
import { cloneGrid } from './solver';
import {
  initCandidates,
  applyNakedSingles,
  applyHiddenSingles,
  applyNakedPairs,
  applyPointingAndClaiming,
  applyTriples,
  applyXWing,
  applyYWing,
} from './techniques';

export interface GradingReport {
  level: DifficultyLevel;
  clueCount: number;
  highestTechnique: string;
  techniquesUsed: Set<string>;
  fullySolvedByLogic: boolean;
}

export function gradeDifficulty(puzzle: SudokuGrid): GradingReport {
  const working = cloneGrid(puzzle);
  const matrix = initCandidates(working);
  const techniquesUsed = new Set<string>();

  let clueCount = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (puzzle[r][c] !== 0) clueCount++;
    }
  }

  let progress = true;
  let iterations = 0;
  const MAX_ITERATIONS = 200;

  while (progress && iterations < MAX_ITERATIONS) {
    iterations++;
    progress = false;

    // 1. Easy: Naked Single
    const resNS = applyNakedSingles(working, matrix);
    if (resNS.applied) {
      techniquesUsed.add('naked_single');
      progress = true;
      continue;
    }

    // 2. Easy: Hidden Single
    const resHS = applyHiddenSingles(working, matrix);
    if (resHS.applied) {
      techniquesUsed.add('hidden_single');
      progress = true;
      continue;
    }

    // 3. Medium: Naked Pairs
    const resNP = applyNakedPairs(working, matrix);
    if (resNP.applied) {
      techniquesUsed.add('naked_pair');
      progress = true;
      continue;
    }

    // 4. Medium: Pointing / Claiming (Box-Line Reduction)
    const resPC = applyPointingAndClaiming(working, matrix);
    if (resPC.applied) {
      techniquesUsed.add('pointing_claiming');
      progress = true;
      continue;
    }

    // 5. Hard: Triples
    const resTR = applyTriples(working, matrix);
    if (resTR.applied) {
      techniquesUsed.add('triples');
      progress = true;
      continue;
    }

    // 6. Hard: X-Wing
    const resXW = applyXWing(working, matrix);
    if (resXW.applied) {
      techniquesUsed.add('x_wing');
      progress = true;
      continue;
    }

    // 7. Hard: Y-Wing
    const resYW = applyYWing(working, matrix);
    if (resYW.applied) {
      techniquesUsed.add('y_wing');
      progress = true;
      continue;
    }
  }

  // Check if fully solved by logic
  let solved = true;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (working[r][c] === 0) {
        solved = false;
        break;
      }
    }
    if (!solved) break;
  }

  // Determine difficulty level according to the prompt:
  // - Easy: naked singles and hidden singles only.
  // - Medium: adds naked/hidden pairs and pointing/claiming (box-line reduction).
  // - Hard: adds triples, X-Wing, and Y-Wing.
  // - Expert: requires advanced techniques (Swordfish, XY-Chain, etc.) or unresolved by Hard techniques.
  let level: DifficultyLevel = 'easy';
  let highestTechnique = 'singles';

  if (!solved) {
    // Requires techniques beyond triples/X-Wing/Y-Wing (Swordfish, XY-Chain, Forcing chains, etc.)
    level = 'expert';
    highestTechnique = 'advanced_chains';
  } else if (
    techniquesUsed.has('y_wing') ||
    techniquesUsed.has('x_wing') ||
    techniquesUsed.has('triples')
  ) {
    level = 'hard';
    highestTechnique = techniquesUsed.has('y_wing')
      ? 'y_wing'
      : techniquesUsed.has('x_wing')
      ? 'x_wing'
      : 'triples';
  } else if (
    techniquesUsed.has('naked_pair') ||
    techniquesUsed.has('pointing_claiming')
  ) {
    level = 'medium';
    highestTechnique = techniquesUsed.has('naked_pair') ? 'naked_pair' : 'pointing_claiming';
  } else {
    level = 'easy';
    highestTechnique = techniquesUsed.has('hidden_single') ? 'hidden_single' : 'naked_single';
  }

  // Clue count secondary guidance:
  // If clue count is very low (e.g. <= 25) but fell into hard/medium, it could be expert
  if (clueCount <= 24 && level === 'hard') {
    level = 'expert';
  }

  return {
    level,
    clueCount,
    highestTechnique,
    techniquesUsed,
    fullySolvedByLogic: solved,
  };
}
