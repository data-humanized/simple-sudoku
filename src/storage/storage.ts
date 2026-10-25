/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Versioned Local Storage Manager for ZenSudoku.
 * Ensures data durability, schema migration, and offline persistence.
 */

import { AppSettings, DEFAULT_SETTINGS, GameState, HistoryRecord, GeneratedPuzzle, DifficultyLevel } from '../logic/types';

export const STORAGE_VERSION = 1;

export interface AppStoragePayload {
  version: number;
  activeGame: GameState | null;
  history: HistoryRecord[];
  settings: AppSettings;
  puzzleCache: Record<DifficultyLevel, GeneratedPuzzle[]>;
  updatedAt: number;
}

const STORAGE_KEY = 'zensudoku_app_data_v1';

export function loadStoredData(): AppStoragePayload {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createInitialStorage();
    }
    const data = JSON.parse(raw) as Partial<AppStoragePayload>;

    // Handle version migration if necessary
    const version = data.version || 1;
    const settings: AppSettings = {
      ...DEFAULT_SETTINGS,
      ...(data.settings || {}),
    };

    const activeGame = data.activeGame ? { ...data.activeGame, isPaused: true } : null; // Return in paused state per requirements

    return {
      version,
      activeGame,
      history: Array.isArray(data.history) ? data.history : [],
      settings,
      puzzleCache: data.puzzleCache || {
        easy: [],
        medium: [],
        hard: [],
        expert: [],
      },
      updatedAt: data.updatedAt || Date.now(),
    };
  } catch (err) {
    console.error('Failed to load ZenSudoku storage:', err);
    return createInitialStorage();
  }
}

export function saveStoredData(data: AppStoragePayload): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to persist ZenSudoku storage:', err);
  }
}

function createInitialStorage(): AppStoragePayload {
  return {
    version: STORAGE_VERSION,
    activeGame: null,
    history: [],
    settings: { ...DEFAULT_SETTINGS },
    puzzleCache: {
      easy: [],
      medium: [],
      hard: [],
      expert: [],
    },
    updatedAt: Date.now(),
  };
}

export function exportBackupJson(data: AppStoragePayload): string {
  return JSON.stringify(data, null, 2);
}

export function validateAndParseBackup(jsonString: string): AppStoragePayload | null {
  try {
    const obj = JSON.parse(jsonString);
    if (typeof obj !== 'object' || obj === null) return null;
    if (!Array.isArray(obj.history)) return null;
    if (typeof obj.settings !== 'object' || obj.settings === null) return null;

    return {
      version: typeof obj.version === 'number' ? obj.version : STORAGE_VERSION,
      activeGame: obj.activeGame || null,
      history: obj.history,
      settings: { ...DEFAULT_SETTINGS, ...obj.settings },
      puzzleCache: obj.puzzleCache || { easy: [], medium: [], hard: [], expert: [] },
      updatedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

export function clearAllStoredData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear ZenSudoku storage:', err);
  }
}
