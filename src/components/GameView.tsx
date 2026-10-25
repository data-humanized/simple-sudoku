/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Pause,
  RotateCcw,
  RotateCw,
  Eraser,
  PenTool,
  HelpCircle,
  Lightbulb,
  Sparkles,
} from 'lucide-react';
import { AppSettings, CellPosition, GameState } from '../logic/types';
import {
  setCellValue,
  toggleNote,
  eraseCell,
  applyHintFillNumber,
  applyHintFillCandidates,
  undo,
  redo,
  isGivenCell,
} from '../logic/gameActions';
import { audio, triggerHaptic } from '../utils/feedback';
import { OutOfLivesModal } from './OutOfLivesModal';

interface GameViewProps {
  gameState: GameState;
  settings: AppSettings;
  onUpdateState: (nextState: GameState) => void;
  onNavigateHome: () => void;
  onGameCompleted: (finalState: GameState) => void;
}

export const GameView: React.FC<GameViewProps> = ({
  gameState,
  settings,
  onUpdateState,
  onNavigateHome,
  onGameCompleted,
}) => {
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>({ row: 0, col: 0 });
  const [isPencilMode, setIsPencilMode] = useState<boolean>(false);
  const [showHintMenu, setShowHintMenu] = useState<boolean>(false);
  const [shakingCell, setShakingCell] = useState<CellPosition | null>(null);
  const [hintTooltip, setHintTooltip] = useState<{ row: number; col: number; message: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const hintMenuRef = useRef<HTMLDivElement>(null);
  const tooltipTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isOutOfLives = gameState.mistakes >= 3;

  const showCellTooltip = useCallback((row: number, col: number, message: string) => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    setToastMessage(null);
    setHintTooltip({ row, col, message });
    tooltipTimerRef.current = setTimeout(() => {
      setHintTooltip(null);
    }, 2000);
  }, []);

  const showToast = useCallback((message: string) => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    setHintTooltip(null);
    setToastMessage(message);
    tooltipTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    };
  }, []);

  // Timer interval
  useEffect(() => {
    if (gameState.isPaused || gameState.isCompleted || isOutOfLives) return;

    const timer = setInterval(() => {
      onUpdateState({
        ...gameState,
        elapsedSeconds: gameState.elapsedSeconds + 1,
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, isOutOfLives, onUpdateState]);

  // When mistakes reach 3, auto-pause the timer
  useEffect(() => {
    if (isOutOfLives && !gameState.isPaused) {
      onUpdateState({
        ...gameState,
        isPaused: true,
      });
    }
  }, [isOutOfLives, gameState, onUpdateState]);

  // Handle "Get a life": resets mistakes to 0 and resumes the game and timer
  const handleGetLife = useCallback(() => {
    onUpdateState({
      ...gameState,
      mistakes: 0,
      isPaused: false,
    });
  }, [gameState, onUpdateState]);

  // Auto-pause when tab is blurred or hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !gameState.isPaused && !gameState.isCompleted) {
        onUpdateState({
          ...gameState,
          isPaused: true,
        });
      }
    };

    const handleWindowBlur = () => {
      if (!gameState.isPaused && !gameState.isCompleted) {
        onUpdateState({
          ...gameState,
          isPaused: true,
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [gameState, onUpdateState]);

  // Close hint menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (hintMenuRef.current && !hintMenuRef.current.contains(e.target as Node)) {
        setShowHintMenu(false);
      }
    };
    if (showHintMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHintMenu]);

  // Check victory condition
  useEffect(() => {
    if (gameState.isCompleted && gameState.finalScore !== undefined) {
      audio.playVictory(settings.soundEffects);
      triggerHaptic(settings.hapticFeedback, 'success');
      onGameCompleted(gameState);
    }
  }, [gameState, settings, onGameCompleted]);

  // Actions
  const handleDigitInput = useCallback(
    (digit: number) => {
      if (!selectedCell || gameState.isPaused || gameState.isCompleted || isOutOfLives) return;

      const { row, col } = selectedCell;
      if (isGivenCell(gameState, row, col)) return;

      if (isPencilMode) {
        // Toggle note
        const nextState = toggleNote(gameState, row, col, digit);
        audio.playTap(settings.soundEffects);
        triggerHaptic(settings.hapticFeedback, 'light');
        onUpdateState(nextState);
      } else {
        // Place value
        const isWrong = digit !== gameState.solution[row][col];

        if (isWrong) {
          // Play short shake animation (350ms) on cell/board
          setShakingCell({ row, col });
          setTimeout(() => {
            setShakingCell(null);
          }, 350);
          audio.playMistake(settings.soundEffects);
          triggerHaptic(settings.hapticFeedback, 'medium');
        } else {
          audio.playTap(settings.soundEffects);
          triggerHaptic(settings.hapticFeedback, 'light');
        }

        const nextState = setCellValue(gameState, row, col, digit, settings.autoRemoveNotes);
        if (nextState.mistakes >= 3) {
          nextState.isPaused = true;
        }

        onUpdateState(nextState);
      }
    },
    [selectedCell, gameState, isOutOfLives, isPencilMode, settings, onUpdateState]
  );

  const handleErase = useCallback(() => {
    if (!selectedCell || gameState.isPaused || gameState.isCompleted || isOutOfLives) return;
    const { row, col } = selectedCell;
    if (isGivenCell(gameState, row, col)) return;

    const nextState = eraseCell(gameState, row, col);
    audio.playErase(settings.soundEffects);
    triggerHaptic(settings.hapticFeedback, 'light');
    onUpdateState(nextState);
  }, [selectedCell, gameState, isOutOfLives, settings, onUpdateState]);

  const handleUndo = useCallback(() => {
    if (gameState.isPaused || gameState.isCompleted || gameState.undoStack.length === 0 || isOutOfLives) return;
    const nextState = undo(gameState);
    audio.playTap(settings.soundEffects);
    onUpdateState(nextState);
  }, [gameState, isOutOfLives, settings, onUpdateState]);

  const handleRedo = useCallback(() => {
    if (gameState.isPaused || gameState.isCompleted || gameState.redoStack.length === 0 || isOutOfLives) return;
    const nextState = redo(gameState);
    audio.playTap(settings.soundEffects);
    onUpdateState(nextState);
  }, [gameState, isOutOfLives, settings, onUpdateState]);

  const handleHintFillNumber = useCallback(() => {
    setShowHintMenu(false);
    if (gameState.isPaused || gameState.isCompleted || isOutOfLives) return;

    if (!selectedCell) {
      showToast('Select a cell first');
      return;
    }

    const { row, col } = selectedCell;
    if (isGivenCell(gameState, row, col)) {
      showCellTooltip(row, col, "Can't fill pre-filled box");
      return;
    }

    if (gameState.currentGrid[row][col] !== 0) {
      showCellTooltip(row, col, 'Block already filled');
      return;
    }

    const { state: nextState, targetPos } = applyHintFillNumber(gameState, selectedCell);
    if (targetPos) {
      setSelectedCell(targetPos);
    }
    audio.playHint(settings.soundEffects);
    triggerHaptic(settings.hapticFeedback, 'medium');
    onUpdateState(nextState);
  }, [gameState, selectedCell, isOutOfLives, settings, showToast, showCellTooltip, onUpdateState]);

  const handleHintFillCandidates = useCallback(() => {
    setShowHintMenu(false);
    if (gameState.isPaused || gameState.isCompleted || isOutOfLives) return;

    if (!selectedCell) {
      showToast('Select a cell first');
      return;
    }

    const { row, col } = selectedCell;
    if (isGivenCell(gameState, row, col)) {
      showCellTooltip(row, col, "Can't fill pre-filled box");
      return;
    }

    if (gameState.currentGrid[row][col] !== 0) {
      showCellTooltip(row, col, 'Block already filled');
      return;
    }

    const nextState = applyHintFillCandidates(gameState, selectedCell);
    audio.playHint(settings.soundEffects);
    triggerHaptic(settings.hapticFeedback, 'medium');
    onUpdateState(nextState);
  }, [gameState, selectedCell, isOutOfLives, settings, showToast, showCellTooltip, onUpdateState]);

  const togglePause = useCallback(() => {
    if (isOutOfLives) return;
    onUpdateState({
      ...gameState,
      isPaused: !gameState.isPaused,
    });
  }, [gameState, isOutOfLives, onUpdateState]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState.isPaused || isOutOfLives) {
        if (!isOutOfLives && (e.key === ' ' || e.key === 'p' || e.key === 'P')) {
          e.preventDefault();
          togglePause();
        }
        return;
      }

      // Pause toggle
      if (e.key === ' ' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        togglePause();
        return;
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Pencil mode toggle (N)
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setIsPencilMode(prev => !prev);
        return;
      }

      // Hint toggle (H)
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setShowHintMenu(prev => !prev);
        return;
      }

      // Arrow keys navigation
      if (selectedCell) {
        let { row, col } = selectedCell;
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
          e.preventDefault();
          row = Math.max(0, row - 1);
          setSelectedCell({ row, col });
        } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
          e.preventDefault();
          row = Math.min(8, row + 1);
          setSelectedCell({ row, col });
        } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          col = Math.max(0, col - 1);
          setSelectedCell({ row, col });
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          col = Math.min(8, col + 1);
          setSelectedCell({ row, col });
        }
      }

      // Numbers 1-9
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        handleDigitInput(parseInt(e.key, 10));
        return;
      }

      // Erase (Backspace, Delete, 0)
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        e.preventDefault();
        handleErase();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    gameState.isPaused,
    selectedCell,
    handleDigitInput,
    handleErase,
    handleUndo,
    handleRedo,
    togglePause,
  ]);

  // Selected cell value for same-number highlight
  const selectedCellValue =
    selectedCell && gameState.currentGrid[selectedCell.row][selectedCell.col] !== 0
      ? gameState.currentGrid[selectedCell.row][selectedCell.col]
      : null;

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Font size scale class for notes and digits
  const noteSizeClasses = {
    small: 'text-[8px] leading-[9px]',
    medium: 'text-[9px] leading-[10px] sm:text-[10px] sm:leading-[12px]',
    large: 'text-[11px] leading-[12px] sm:text-[12px] sm:leading-[14px]',
  }[settings.fontSize];

  const digitSizeClasses = {
    small: 'text-lg sm:text-xl',
    medium: 'text-xl sm:text-2xl',
    large: 'text-2xl sm:text-3xl',
  }[settings.fontSize];

  return (
    <div className="relative w-full max-w-md mx-auto px-2 sm:px-4 py-2 flex flex-col justify-between select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="absolute top-12 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all"
          role="status"
          aria-live="polite"
        >
          <div className="bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 text-xs font-medium px-3.5 py-1.5 rounded-full shadow-xl whitespace-nowrap animate-in fade-in duration-150">
            {toastMessage}
          </div>
        </div>
      )}

      {/* Top Header / Bar */}
      <div className="flex items-center justify-between py-2 border-b border-stone-200/60 dark:border-stone-800/60 mb-2 sm:mb-4">
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-1.5 text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 p-1 rounded"
          aria-label="Back to home screen"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium capitalize tracking-wider text-stone-700 dark:text-stone-300">
            {gameState.level}
          </span>
          <span className="text-stone-300 dark:text-stone-700">•</span>
          <span className={`text-xs font-mono font-medium ${gameState.mistakes > 0 ? 'text-red-600 dark:text-red-400' : 'text-stone-600 dark:text-stone-400'}`}>
            Mistakes: {gameState.mistakes}/3
          </span>
        </div>

        <div className="flex items-center gap-3">
          {settings.showTimer && (
            <span className="text-xs font-mono tabular-nums text-stone-600 dark:text-stone-400">
              {formatTimer(gameState.elapsedSeconds)}
            </span>
          )}
          <button
            onClick={togglePause}
            className="p-1.5 rounded-lg text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
            aria-label={gameState.isPaused ? 'Resume game' : 'Pause game'}
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 9x9 Board */}
      <div className="relative w-full aspect-square max-w-[420px] mx-auto bg-stone-900 dark:bg-stone-200 p-[2px] rounded-lg shadow-xs overflow-visible">
        <div className="grid grid-cols-9 grid-rows-9 w-full h-full gap-[1px] bg-stone-300 dark:bg-stone-800 rounded-md">
          {Array.from({ length: 9 }).map((_, r) =>
            Array.from({ length: 9 }).map((_, c) => {
              const val = gameState.currentGrid[r][c];
              const isGiven = isGivenCell(gameState, r, c);
              const isHinted = gameState.hintedCells[r][c];
              const isSelected = selectedCell?.row === r && selectedCell?.col === c;
              const isCellShaking = shakingCell?.row === r && shakingCell?.col === c;
              const isTooltipCell = hintTooltip?.row === r && hintTooltip?.col === c;
              const isSameRowColBox =
                selectedCell &&
                (selectedCell.row === r ||
                  selectedCell.col === c ||
                  (Math.floor(selectedCell.row / 3) === Math.floor(r / 3) &&
                    Math.floor(selectedCell.col / 3) === Math.floor(c / 3)));
              const isSameNumber =
                settings.highlightSameNumbers &&
                selectedCellValue !== null &&
                val === selectedCellValue;

              // Correct/wrong evaluation for non-given digits
              const isUserPlaced = val !== 0 && !isGiven;
              const isCorrect = isUserPlaced && val === gameState.solution[r][c];
              const isWrong = isUserPlaced && val !== gameState.solution[r][c];
              const useColorFeedback = settings.colorFeedback ?? true;

              // Box border math (thicker border on box boundaries)
              const borderRight = c % 3 === 2 && c !== 8 ? 'border-r-2 border-stone-900 dark:border-stone-100' : '';
              const borderBottom = r % 3 === 2 && r !== 8 ? 'border-b-2 border-stone-900 dark:border-stone-100' : '';

              // Cell Background colors
              let bgClass = 'bg-stone-50 dark:bg-stone-950';

              if (useColorFeedback && isCorrect) {
                if (isSelected) {
                  bgClass = 'bg-emerald-200 dark:bg-emerald-900/90 ring-2 ring-inset ring-emerald-600 z-10';
                } else if (isSameNumber) {
                  bgClass = 'bg-emerald-100 dark:bg-emerald-950/80 ring-1 ring-inset ring-emerald-500/50';
                } else if (isSameRowColBox) {
                  bgClass = 'bg-emerald-50/90 dark:bg-emerald-950/60';
                } else {
                  bgClass = 'bg-emerald-50/70 dark:bg-emerald-950/40';
                }
              } else if (useColorFeedback && isWrong) {
                if (isSelected) {
                  bgClass = 'bg-red-200 dark:bg-red-900/90 ring-2 ring-inset ring-red-600 z-10';
                } else if (isSameNumber) {
                  bgClass = 'bg-red-100 dark:bg-red-950/80 ring-1 ring-inset ring-red-500/50';
                } else if (isSameRowColBox) {
                  bgClass = 'bg-red-50/90 dark:bg-red-950/60';
                } else {
                  bgClass = 'bg-red-50/70 dark:bg-red-950/40';
                }
              } else if (isSelected) {
                bgClass = 'bg-stone-200 dark:bg-stone-800 ring-2 ring-inset ring-stone-500 z-10';
              } else if (isSameNumber) {
                bgClass = 'bg-stone-200/90 dark:bg-stone-800/90';
              } else if (isSameRowColBox) {
                bgClass = 'bg-stone-100/70 dark:bg-stone-900/60';
              }

              // Text color
              let textClass = 'font-medium text-stone-700 dark:text-stone-300';

              if (isGiven) {
                // Given (pre-filled) digits: clearly distinct neutral bold
                textClass = 'font-bold text-stone-900 dark:text-stone-100';
              } else if (useColorFeedback) {
                if (isCorrect) {
                  // Correct digit: distinct dark green
                  textClass = 'font-bold text-emerald-800 dark:text-emerald-300';
                } else if (isWrong) {
                  // Wrong digit: distinct dark red
                  textClass = 'font-bold text-red-700 dark:text-red-300';
                }
              } else {
                if (isHinted) {
                  textClass = 'font-semibold text-amber-700 dark:text-amber-400';
                } else if (settings.highlightMistakes && isWrong) {
                  textClass = 'font-bold text-red-600 dark:text-red-400';
                }
              }

              const cellNotes = gameState.notes[r][c];
              const shakeClass = isCellShaking ? 'animate-shake z-20' : '';

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => {
                    if (!isOutOfLives) {
                      setSelectedCell({ row: r, col: c });
                      setHintTooltip(null);
                      setToastMessage(null);
                    }
                  }}
                  className={`relative flex items-center justify-center p-0 ${borderRight} ${borderBottom} ${bgClass} ${shakeClass} focus:outline-none transition-colors duration-75`}
                  aria-label={`Row ${r + 1}, Column ${c + 1}: ${val !== 0 ? val : 'empty'}`}
                >
                  {/* Tooltip bubble placed right beside selected cell */}
                  {isTooltipCell && hintTooltip && (
                    <div
                      className={`absolute ${
                        c >= 5 ? 'right-full mr-2' : 'left-full ml-2'
                      } top-1/2 -translate-y-1/2 z-50 pointer-events-none flex items-center`}
                      role="status"
                      aria-live="polite"
                    >
                      <div className="relative bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 text-[11px] font-medium px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap flex items-center">
                        <span>{hintTooltip.message}</span>
                        {/* Triangle pointer arrow */}
                        <div
                          className={`absolute top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent ${
                            c >= 5
                              ? 'left-full border-l-4 border-l-stone-900 dark:border-l-stone-100'
                              : 'right-full border-r-4 border-r-stone-900 dark:border-r-stone-100'
                          }`}
                        />
                      </div>
                    </div>
                  )}

                  {val !== 0 ? (
                    <span className={`${digitSizeClasses} ${textClass} tabular-nums select-none`}>
                      {val}
                    </span>
                  ) : (
                    <div className="w-full h-full grid grid-cols-3 grid-rows-3 p-[1px] pointer-events-none">
                      {Array.from({ length: 9 }).map((_, nIdx) => {
                        const noteNum = nIdx + 1;
                        const hasNote = cellNotes.includes(noteNum);
                        return (
                          <span
                            key={noteNum}
                            className={`flex items-center justify-center text-stone-500 dark:text-stone-400 font-mono ${noteSizeClasses}`}
                          >
                            {hasNote ? noteNum : ''}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center justify-between w-full max-w-[420px] mx-auto px-1 py-3 text-stone-600 dark:text-stone-400">
        <button
          onClick={handleUndo}
          disabled={gameState.undoStack.length === 0}
          className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-900 disabled:opacity-30 disabled:hover:bg-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
          aria-label="Undo move"
          title="Undo (Ctrl+Z)"
        >
          <RotateCcw className="w-5 h-5" />
          <span className="text-[10px] font-medium">Undo</span>
        </button>

        <button
          onClick={handleRedo}
          disabled={gameState.redoStack.length === 0}
          className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-900 disabled:opacity-30 disabled:hover:bg-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
          aria-label="Redo move"
          title="Redo (Ctrl+Y)"
        >
          <RotateCw className="w-5 h-5" />
          <span className="text-[10px] font-medium">Redo</span>
        </button>

        <button
          onClick={handleErase}
          className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
          aria-label="Erase selected cell"
          title="Erase (Backspace)"
        >
          <Eraser className="w-5 h-5" />
          <span className="text-[10px] font-medium">Erase</span>
        </button>

        <button
          onClick={() => setIsPencilMode(prev => !prev)}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 ${
            isPencilMode
              ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900'
              : 'hover:bg-stone-100 dark:hover:bg-stone-900'
          }`}
          aria-label="Toggle notes / pencil mode"
          aria-pressed={isPencilMode}
          title="Pencil Mode (N)"
        >
          <PenTool className="w-5 h-5" />
          <span className="text-[10px] font-medium">Notes {isPencilMode ? 'ON' : 'OFF'}</span>
        </button>

        {/* Hint with Menu */}
        <div className="relative" ref={hintMenuRef}>
          <button
            onClick={() => setShowHintMenu(prev => !prev)}
            className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
            aria-label="Hint options"
            aria-expanded={showHintMenu}
            title="Hint (H)"
          >
            <HelpCircle className="w-5 h-5" />
            <span className="text-[10px] font-medium">Hint</span>
          </button>

          {showHintMenu && (
            <div className="absolute right-0 bottom-full mb-2 w-48 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-lg py-1 z-50 text-xs">
              <button
                onClick={handleHintFillNumber}
                className="w-full px-3 py-2 text-left flex items-center gap-2 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Fill number</span>
              </button>
              <button
                onClick={handleHintFillCandidates}
                className="w-full px-3 py-2 text-left flex items-center gap-2 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors border-t border-stone-100 dark:border-stone-800"
              >
                <Sparkles className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                <span>Fill possible numbers</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Number Pad (1-9) */}
      {/* CRITICAL RULE: Buttons 1-9 ALWAYS stay visible, enabled, and look identical, even when digit placed 9 times. */}
      <div className="grid grid-cols-9 gap-1.5 w-full max-w-[420px] mx-auto mt-1 mb-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button
            key={num}
            type="button"
            onClick={() => handleDigitInput(num)}
            className="h-12 sm:h-14 flex items-center justify-center rounded-lg bg-stone-100 dark:bg-stone-800/90 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 font-semibold text-lg sm:text-xl tabular-nums shadow-2xs active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
            aria-label={`Enter number ${num}`}
          >
            {num}
          </button>
        ))}
      </div>

      <OutOfLivesModal
        isOpen={isOutOfLives}
        onGetLife={handleGetLife}
        onQuitToHome={onNavigateHome}
      />
    </div>
  );
};
