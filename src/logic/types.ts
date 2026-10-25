/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Pure TypeScript data models and interfaces for ZenSudoku.
 * Zero UI / browser dependencies so this logic can be ported to Flutter/Dart, React Native, or another platform.
 */

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert';

export interface CellPosition {
  row: number; // 0..8
  col: number; // 0..8
}

export type SudokuGrid = number[][]; // 9x9 matrix (0 = empty, 1..9 = value)
export type NotesGrid = number[][][]; // 9x9 matrix containing arrays of candidate numbers 1..9

export type MoveAction =
  | {
      type: 'SET_VALUE';
      row: number;
      col: number;
      prevValue: number;
      nextValue: number;
      prevNotes: number[];
      nextNotes: number[];
      isHint?: boolean;
    }
  | {
      type: 'TOGGLE_NOTE';
      row: number;
      col: number;
      num: number;
      wasPresent: boolean;
    }
  | {
      type: 'ERASE_CELL';
      row: number;
      col: number;
      prevValue: number;
      prevNotes: number[];
    }
  | {
      type: 'FILL_CANDIDATES';
      changes: {
        row: number;
        col: number;
        prevNotes: number[];
        nextNotes: number[];
      }[];
    };

export interface GameState {
  id: string;
  level: DifficultyLevel;
  initialGrid: SudokuGrid;
  solution: SudokuGrid;
  currentGrid: SudokuGrid;
  notes: NotesGrid;
  hintedCells: boolean[][]; // 9x9 boolean matrix: true if cell was filled by hint
  mistakes: number;
  hintsUsed: number;
  elapsedSeconds: number;
  isPaused: boolean;
  isCompleted: boolean;
  undoStack: MoveAction[];
  redoStack: MoveAction[];
  startedAt: number;
  lastActiveAt: number;
  completedAt?: number;
  finalScore?: number;
}

export interface GeneratedPuzzle {
  id: string;
  level: DifficultyLevel;
  puzzle: SudokuGrid;
  solution: SudokuGrid;
}

export interface HistoryRecord {
  id: string;
  date: string; // YYYY-MM-DD (device local date)
  completedAt: number; // timestamp in ms
  level: DifficultyLevel;
  timeSeconds: number;
  score: number;
  hintsUsed: number;
  mistakes: number;
}

export interface StreakInfo {
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate: string | null; // YYYY-MM-DD
}

export interface LevelStats {
  completed: number;
  bestTime: number | null; // in seconds
  averageTime: number | null; // in seconds
  bestScore: number | null;
  averageScore: number | null;
}

export interface GameStats {
  totalCompleted: number;
  currentStreak: number;
  bestStreak: number;
  levels: Record<DifficultyLevel, LevelStats>;
}

export interface UnlockStatus {
  level: DifficultyLevel;
  isUnlocked: boolean;
  current: number;
  required: number;
  prerequisiteLevel: DifficultyLevel | null;
}

export interface AppSettings {
  theme: 'system' | 'light' | 'dark' | 'contrast';
  fontSize: 'small' | 'medium' | 'large';
  showTimer: boolean;
  highlightSameNumbers: boolean;
  colorFeedback: boolean;   // Green for correct, red for wrong (default: true)
  highlightMistakes?: boolean; // legacy alias
  autoRemoveNotes: boolean;
  hapticFeedback: boolean;
  soundEffects: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  fontSize: 'medium',
  showTimer: true,
  highlightSameNumbers: true,
  colorFeedback: true,      // Default ON per user requirements
  highlightMistakes: false,
  autoRemoveNotes: true,    // Default ON per requirements
  hapticFeedback: false,    // Default OFF per requirements
  soundEffects: false,      // Default OFF per requirements
};
