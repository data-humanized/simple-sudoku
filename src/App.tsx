/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  DifficultyLevel,
  GameState,
  HistoryRecord,
  AppSettings,
} from './logic/types';
import { createInitialGameState } from './logic/gameActions';
import { formatLocalDate, calculateStreak } from './logic/streak';
import {
  loadStoredData,
  saveStoredData,
  clearAllStoredData,
  AppStoragePayload,
} from './storage/storage';
import { usePuzzleService } from './worker/usePuzzleService';
import { applyTheme } from './utils/theme';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { GameView } from './components/GameView';
import { PausedModal } from './components/PausedModal';
import { CompletionModal } from './components/CompletionModal';
import { HistoryModal } from './components/HistoryModal';
import { StatsModal } from './components/StatsModal';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  const [initialData] = useState<AppStoragePayload>(() => loadStoredData());
  const [activeView, setActiveView] = useState<'home' | 'game'>(() =>
    initialData.activeGame && !initialData.activeGame.isCompleted ? 'game' : 'home'
  );
  const [gameState, setGameState] = useState<GameState | null>(initialData.activeGame);
  const [history, setHistory] = useState<HistoryRecord[]>(initialData.history);
  const [settings, setSettings] = useState<AppSettings>(initialData.settings);

  // Modals
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [completedGameState, setCompletedGameState] = useState<GameState | null>(null);

  // Background Web Worker Puzzle Cache
  const handleCacheUpdate = useCallback((cache: AppStoragePayload['puzzleCache']) => {
    saveStoredData({
      version: 1,
      activeGame: gameState,
      history,
      settings,
      puzzleCache: cache,
      updatedAt: Date.now(),
    });
  }, [gameState, history, settings]);

  const { getNextPuzzle, cache: puzzleCache } = usePuzzleService(
    initialData.puzzleCache,
    handleCacheUpdate
  );

  // Apply theme whenever settings.theme changes
  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  // Persist state changes
  useEffect(() => {
    saveStoredData({
      version: 1,
      activeGame: gameState,
      history,
      settings,
      puzzleCache,
      updatedAt: Date.now(),
    });
  }, [gameState, history, settings, puzzleCache]);

  // Start new game
  const handleStartNewGame = useCallback(
    (level: DifficultyLevel) => {
      const puzzle = getNextPuzzle(level);
      const newState = createInitialGameState(puzzle);
      setGameState(newState);
      setCompletedGameState(null);
      setActiveView('game');
    },
    [getNextPuzzle]
  );

  // Resume game
  const handleResumeGame = useCallback(() => {
    if (gameState) {
      setGameState({
        ...gameState,
        isPaused: false,
      });
      setActiveView('game');
    }
  }, [gameState]);

  // Game completed handler
  const handleGameCompleted = useCallback(
    (finalState: GameState) => {
      if (completedGameState?.id === finalState.id) return; // Prevent duplicate recording

      const record: HistoryRecord = {
        id: `rec-${finalState.id}`,
        date: formatLocalDate(),
        completedAt: finalState.completedAt || Date.now(),
        level: finalState.level,
        timeSeconds: finalState.elapsedSeconds,
        score: finalState.finalScore || 0,
        hintsUsed: finalState.hintsUsed,
        mistakes: finalState.mistakes,
      };

      setHistory(prev => [...prev, record]);
      setCompletedGameState(finalState);
      setGameState(null); // Clears active game from storage
    },
    [completedGameState]
  );

  // Reset progress
  const handleResetAllData = useCallback(() => {
    clearAllStoredData();
    const fresh = loadStoredData();
    setGameState(null);
    setHistory([]);
    setSettings(fresh.settings);
    setCompletedGameState(null);
    setActiveView('home');
  }, []);

  // Import backup
  const handleImportBackup = useCallback((data: AppStoragePayload) => {
    setGameState(data.activeGame);
    setHistory(data.history);
    setSettings(data.settings);
    setCompletedGameState(null);
    saveStoredData(data);
    applyTheme(data.settings.theme);
  }, []);

  const streakInfo = calculateStreak(history);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100 selection:bg-stone-200 dark:selection:bg-stone-800 transition-colors">
      <Header
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenStats={() => setIsStatsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        activeView={activeView}
        onNavigateHome={() => setActiveView('home')}
      />

      <main className="flex-1 flex flex-col justify-center items-center w-full">
        {activeView === 'home' || !gameState ? (
          <HomeView
            history={history}
            activeGame={gameState}
            onStartNewGame={handleStartNewGame}
            onResumeGame={handleResumeGame}
          />
        ) : (
          <GameView
            gameState={gameState}
            settings={settings}
            onUpdateState={setGameState}
            onNavigateHome={() => setActiveView('home')}
            onGameCompleted={handleGameCompleted}
          />
        )}
      </main>

      {/* Footer calm copyright / zen space */}
      <footer className="w-full max-w-xl mx-auto py-3 px-4 text-center text-[11px] text-stone-400 dark:text-stone-600">
        Distraction-free · Offline · Local
      </footer>

      {/* Paused Screen Overlay (hides entire board) */}
      {gameState && (
        <PausedModal
          isOpen={gameState.isPaused && activeView === 'game' && gameState.mistakes < 3}
          elapsedSeconds={gameState.elapsedSeconds}
          level={gameState.level}
          onResume={() => setGameState({ ...gameState, isPaused: false })}
          onQuitToHome={() => {
            setGameState({ ...gameState, isPaused: true });
            setActiveView('home');
          }}
        />
      )}

      {/* Victory / Completion Modal */}
      {completedGameState && (
        <CompletionModal
          isOpen={true}
          level={completedGameState.level}
          timeSeconds={completedGameState.elapsedSeconds}
          hintsUsed={completedGameState.hintsUsed}
          mistakes={completedGameState.mistakes}
          score={completedGameState.finalScore || 0}
          currentStreak={streakInfo.currentStreak}
          onNewGame={() => handleStartNewGame(completedGameState.level)}
          onGoHome={() => {
            setCompletedGameState(null);
            setActiveView('home');
          }}
        />
      )}

      {/* History Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        history={history}
        onClose={() => setIsHistoryOpen(false)}
      />

      {/* Stats Modal */}
      <StatsModal
        isOpen={isStatsOpen}
        history={history}
        onClose={() => setIsStatsOpen(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        storageData={{
          version: 1,
          activeGame: gameState,
          history,
          settings,
          puzzleCache,
          updatedAt: Date.now(),
        }}
        onUpdateSettings={setSettings}
        onImportBackup={handleImportBackup}
        onResetAllData={handleResetAllData}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
