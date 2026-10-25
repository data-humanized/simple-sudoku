/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Web Worker for background Sudoku generation.
 * Keeps CPU-intensive uniqueness checking and grading off the main UI thread.
 */

import { DifficultyLevel } from '../logic/types';
import { generatePuzzle } from '../logic/generator';

self.onmessage = (e: MessageEvent<{ type: string; level: DifficultyLevel; requestId?: string }>) => {
  if (e.data && e.data.type === 'GENERATE_PUZZLE') {
    try {
      const puzzle = generatePuzzle(e.data.level);
      self.postMessage({
        type: 'PUZZLE_GENERATED',
        level: e.data.level,
        puzzle,
        requestId: e.data.requestId,
      });
    } catch (err) {
      self.postMessage({
        type: 'PUZZLE_GENERATION_FAILED',
        level: e.data.level,
        error: String(err),
        requestId: e.data.requestId,
      });
    }
  }
};
