/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Pure Game State Transitions and Reducers for ZenSudoku.
 * Zero UI/browser dependencies.
 */

import { CellPosition, GameState, GeneratedPuzzle, MoveAction, SudokuGrid } from './types';
import { cloneGrid, isBoardCompleteAndCorrect, getCandidates } from './solver';
import { calculateGameScore } from './scoring';

export function createInitialGameState(puzzle: GeneratedPuzzle): GameState {
  const initialGrid = cloneGrid(puzzle.puzzle);
  const solution = cloneGrid(puzzle.solution);
  const currentGrid = cloneGrid(puzzle.puzzle);

  const notes = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => [] as number[])
  );

  const hintedCells = Array.from({ length: 9 }, () =>
    Array(9).fill(false)
  );

  return {
    id: puzzle.id,
    level: puzzle.level,
    initialGrid,
    solution,
    currentGrid,
    notes,
    hintedCells,
    mistakes: 0,
    hintsUsed: 0,
    elapsedSeconds: 0,
    isPaused: false,
    isCompleted: false,
    undoStack: [],
    redoStack: [],
    startedAt: Date.now(),
    lastActiveAt: Date.now(),
  };
}

export function isGivenCell(state: GameState, row: number, col: number): boolean {
  return state.initialGrid[row][col] !== 0;
}

export function setCellValue(
  state: GameState,
  row: number,
  col: number,
  value: number,
  autoRemoveNotes = true
): GameState {
  if (state.isCompleted || isGivenCell(state, row, col)) {
    return state;
  }

  const prevValue = state.currentGrid[row][col];
  if (prevValue === value) return state;

  const prevNotes = [...state.notes[row][col]];
  const nextGrid = cloneGrid(state.currentGrid);
  nextGrid[row][col] = value;

  const nextNotes = state.notes.map(r => r.map(c => [...c]));
  nextNotes[row][col] = []; // Placing real number clears that cell's notes

  // Check if entered value is correct
  const isCorrect = value !== 0 && value === state.solution[row][col];

  // Count mistake if value is wrong (conflicts with solution)
  let nextMistakes = state.mistakes;
  if (value !== 0 && !isCorrect) {
    nextMistakes++;
  }

  // Auto-remove notes from row, column, box ONLY when digit is correct
  // (Wrong entries must not eliminate pencil candidates)
  if (autoRemoveNotes && isCorrect) {
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let c = 0; c < 9; c++) {
      nextNotes[row][c] = nextNotes[row][c].filter(n => n !== value);
    }
    for (let r = 0; r < 9; r++) {
      nextNotes[r][col] = nextNotes[r][col].filter(n => n !== value);
    }
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        nextNotes[br + r][bc + c] = nextNotes[br + r][bc + c].filter(n => n !== value);
      }
    }
  }

  const action: MoveAction = {
    type: 'SET_VALUE',
    row,
    col,
    prevValue,
    nextValue: value,
    prevNotes,
    nextNotes: [],
  };

  const isCompleted = isBoardCompleteAndCorrect(nextGrid, state.solution);
  let finalScore = state.finalScore;
  let completedAt = state.completedAt;

  if (isCompleted && !state.isCompleted) {
    completedAt = Date.now();
    finalScore = calculateGameScore(
      state.level,
      state.elapsedSeconds,
      state.hintsUsed,
      nextMistakes
    );
  }

  return {
    ...state,
    currentGrid: nextGrid,
    notes: nextNotes,
    mistakes: nextMistakes,
    undoStack: [...state.undoStack, action],
    redoStack: [],
    isCompleted,
    completedAt,
    finalScore,
    lastActiveAt: Date.now(),
  };
}

export function toggleNote(
  state: GameState,
  row: number,
  col: number,
  num: number
): GameState {
  if (state.isCompleted || isGivenCell(state, row, col) || state.currentGrid[row][col] !== 0) {
    return state;
  }

  const currentNotes = state.notes[row][col];
  const wasPresent = currentNotes.includes(num);
  const nextCellNotes = wasPresent
    ? currentNotes.filter(n => n !== num)
    : [...currentNotes, num].sort((a, b) => a - b);

  const nextNotes = state.notes.map((rArr, rIdx) =>
    rArr.map((cArr, cIdx) => (rIdx === row && cIdx === col ? nextCellNotes : [...cArr]))
  );

  const action: MoveAction = {
    type: 'TOGGLE_NOTE',
    row,
    col,
    num,
    wasPresent,
  };

  return {
    ...state,
    notes: nextNotes,
    undoStack: [...state.undoStack, action],
    redoStack: [],
    lastActiveAt: Date.now(),
  };
}

export function eraseCell(state: GameState, row: number, col: number): GameState {
  if (state.isCompleted || isGivenCell(state, row, col)) {
    return state;
  }

  const prevValue = state.currentGrid[row][col];
  const prevNotes = [...state.notes[row][col]];

  if (prevValue === 0 && prevNotes.length === 0) {
    return state;
  }

  const nextGrid = cloneGrid(state.currentGrid);
  nextGrid[row][col] = 0;

  const nextNotes = state.notes.map((rArr, rIdx) =>
    rArr.map((cArr, cIdx) => (rIdx === row && cIdx === col ? [] : [...cArr]))
  );

  const action: MoveAction = {
    type: 'ERASE_CELL',
    row,
    col,
    prevValue,
    prevNotes,
  };

  return {
    ...state,
    currentGrid: nextGrid,
    notes: nextNotes,
    undoStack: [...state.undoStack, action],
    redoStack: [],
    lastActiveAt: Date.now(),
  };
}

export function applyHintFillNumber(
  state: GameState,
  selectedPos: CellPosition | null
): { state: GameState; targetPos: CellPosition | null } {
  if (state.isCompleted || !selectedPos) return { state, targetPos: null };

  const targetR = selectedPos.row;
  const targetC = selectedPos.col;

  // Act ONLY on the selected cell if not given and currently empty
  if (isGivenCell(state, targetR, targetC) || state.currentGrid[targetR][targetC] !== 0) {
    return { state, targetPos: null };
  }

  const correctNum = state.solution[targetR][targetC];
  const prevValue = state.currentGrid[targetR][targetC];
  const prevNotes = [...state.notes[targetR][targetC]];

  const nextGrid = cloneGrid(state.currentGrid);
  nextGrid[targetR][targetC] = correctNum;

  const nextNotes = state.notes.map(r => r.map(c => [...c]));
  nextNotes[targetR][targetC] = [];

  // Remove that candidate from row, col, box notes
  const br = Math.floor(targetR / 3) * 3;
  const bc = Math.floor(targetC / 3) * 3;
  for (let c = 0; c < 9; c++) {
    nextNotes[targetR][c] = nextNotes[targetR][c].filter(n => n !== correctNum);
  }
  for (let r = 0; r < 9; r++) {
    nextNotes[r][targetC] = nextNotes[r][targetC].filter(n => n !== correctNum);
  }
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      nextNotes[br + r][bc + c] = nextNotes[br + r][bc + c].filter(n => n !== correctNum);
    }
  }

  const nextHinted = state.hintedCells.map((r, rIdx) =>
    r.map((val, cIdx) => (rIdx === targetR && cIdx === targetC ? true : val))
  );

  const action: MoveAction = {
    type: 'SET_VALUE',
    row: targetR,
    col: targetC,
    prevValue,
    nextValue: correctNum,
    prevNotes,
    nextNotes: [],
    isHint: true,
  };

  const isCompleted = isBoardCompleteAndCorrect(nextGrid, state.solution);
  let finalScore = state.finalScore;
  let completedAt = state.completedAt;

  if (isCompleted && !state.isCompleted) {
    completedAt = Date.now();
    finalScore = calculateGameScore(
      state.level,
      state.elapsedSeconds,
      state.hintsUsed + 1,
      state.mistakes
    );
  }

  return {
    state: {
      ...state,
      currentGrid: nextGrid,
      notes: nextNotes,
      hintedCells: nextHinted,
      hintsUsed: state.hintsUsed + 1,
      undoStack: [...state.undoStack, action],
      redoStack: [],
      isCompleted,
      completedAt,
      finalScore,
      lastActiveAt: Date.now(),
    },
    targetPos: { row: targetR, col: targetC },
  };
}

export function applyHintFillCandidates(
  state: GameState,
  selectedPos: CellPosition | null
): GameState {
  if (state.isCompleted || !selectedPos) return state;

  const targetR = selectedPos.row;
  const targetC = selectedPos.col;

  // Act ONLY on the selected cell if not given and currently empty
  if (isGivenCell(state, targetR, targetC) || state.currentGrid[targetR][targetC] !== 0) {
    return state;
  }

  // Construct sanitized grid that only contains given or correct numbers
  // Wrong entries must not be used when calculating pencil candidates!
  const sanitizedGrid = cloneGrid(state.currentGrid);
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (sanitizedGrid[r][c] !== 0 && sanitizedGrid[r][c] !== state.solution[r][c]) {
        sanitizedGrid[r][c] = 0; // Disregard wrong entries
      }
    }
  }

  const candidates = getCandidates(sanitizedGrid, targetR, targetC);
  const prevNotes = [...state.notes[targetR][targetC]];
  const nextNotes = state.notes.map((rArr, rIdx) =>
    rArr.map((cArr, cIdx) => (rIdx === targetR && cIdx === targetC ? [...candidates] : [...cArr]))
  );

  const action: MoveAction = {
    type: 'FILL_CANDIDATES',
    changes: [
      {
        row: targetR,
        col: targetC,
        prevNotes,
        nextNotes: [...candidates],
      },
    ],
  };

  return {
    ...state,
    notes: nextNotes,
    hintsUsed: state.hintsUsed + 1,
    undoStack: [...state.undoStack, action],
    redoStack: [],
    lastActiveAt: Date.now(),
  };
}

export function undo(state: GameState): GameState {
  if (state.undoStack.length === 0 || state.isCompleted) return state;

  const action = state.undoStack[state.undoStack.length - 1];
  const newUndoStack = state.undoStack.slice(0, -1);
  const nextGrid = cloneGrid(state.currentGrid);
  const nextNotes = state.notes.map(r => r.map(c => [...c]));
  const nextHinted = state.hintedCells.map(r => [...r]);

  switch (action.type) {
    case 'SET_VALUE':
      nextGrid[action.row][action.col] = action.prevValue;
      nextNotes[action.row][action.col] = [...action.prevNotes];
      if (action.isHint) {
        nextHinted[action.row][action.col] = false;
      }
      break;

    case 'TOGGLE_NOTE':
      if (action.wasPresent) {
        if (!nextNotes[action.row][action.col].includes(action.num)) {
          nextNotes[action.row][action.col] = [...nextNotes[action.row][action.col], action.num].sort(
            (a, b) => a - b
          );
        }
      } else {
        nextNotes[action.row][action.col] = nextNotes[action.row][action.col].filter(
          n => n !== action.num
        );
      }
      break;

    case 'ERASE_CELL':
      nextGrid[action.row][action.col] = action.prevValue;
      nextNotes[action.row][action.col] = [...action.prevNotes];
      break;

    case 'FILL_CANDIDATES':
      for (const ch of action.changes) {
        nextNotes[ch.row][ch.col] = [...ch.prevNotes];
      }
      break;
  }

  return {
    ...state,
    currentGrid: nextGrid,
    notes: nextNotes,
    hintedCells: nextHinted,
    undoStack: newUndoStack,
    redoStack: [...state.redoStack, action],
    lastActiveAt: Date.now(),
  };
}

export function redo(state: GameState): GameState {
  if (state.redoStack.length === 0 || state.isCompleted) return state;

  const action = state.redoStack[state.redoStack.length - 1];
  const newRedoStack = state.redoStack.slice(0, -1);
  const nextGrid = cloneGrid(state.currentGrid);
  const nextNotes = state.notes.map(r => r.map(c => [...c]));
  const nextHinted = state.hintedCells.map(r => [...r]);

  switch (action.type) {
    case 'SET_VALUE':
      nextGrid[action.row][action.col] = action.nextValue;
      nextNotes[action.row][action.col] = [...action.nextNotes];
      if (action.isHint) {
        nextHinted[action.row][action.col] = true;
      }
      break;

    case 'TOGGLE_NOTE':
      if (action.wasPresent) {
        nextNotes[action.row][action.col] = nextNotes[action.row][action.col].filter(
          n => n !== action.num
        );
      } else {
        if (!nextNotes[action.row][action.col].includes(action.num)) {
          nextNotes[action.row][action.col] = [...nextNotes[action.row][action.col], action.num].sort(
            (a, b) => a - b
          );
        }
      }
      break;

    case 'ERASE_CELL':
      nextGrid[action.row][action.col] = 0;
      nextNotes[action.row][action.col] = [];
      break;

    case 'FILL_CANDIDATES':
      for (const ch of action.changes) {
        nextNotes[ch.row][ch.col] = [...ch.nextNotes];
      }
      break;
  }

  const isCompleted = isBoardCompleteAndCorrect(nextGrid, state.solution);
  let finalScore = state.finalScore;
  let completedAt = state.completedAt;

  if (isCompleted && !state.isCompleted) {
    completedAt = Date.now();
    finalScore = calculateGameScore(
      state.level,
      state.elapsedSeconds,
      state.hintsUsed,
      state.mistakes
    );
  }

  return {
    ...state,
    currentGrid: nextGrid,
    notes: nextNotes,
    hintedCells: nextHinted,
    undoStack: [...state.undoStack, action],
    redoStack: newRedoStack,
    isCompleted,
    completedAt,
    finalScore,
    lastActiveAt: Date.now(),
  };
}
