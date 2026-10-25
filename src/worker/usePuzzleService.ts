/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Puzzle Generation Service.
 * Manages background Web Worker generation and pre-caching.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { DifficultyLevel, GeneratedPuzzle } from '../logic/types';
import { getVerifiedSeedPuzzle } from '../logic/generator';

const CACHE_TARGET_PER_LEVEL = 2;

export function usePuzzleService(
  initialCache: Record<DifficultyLevel, GeneratedPuzzle[]>,
  onCacheUpdate: (cache: Record<DifficultyLevel, GeneratedPuzzle[]>) => void
) {
  const [cache, setCache] = useState<Record<DifficultyLevel, GeneratedPuzzle[]>>(initialCache);
  const workerRef = useRef<Worker | null>(null);
  const isGeneratingRef = useRef<Record<DifficultyLevel, boolean>>({
    easy: false,
    medium: false,
    hard: false,
    expert: false,
  });

  // Keep ref up to date
  const cacheRef = useRef(cache);
  cacheRef.current = cache;

  const requestGeneration = useCallback((level: DifficultyLevel) => {
    if (!workerRef.current || isGeneratingRef.current[level]) return;

    if (cacheRef.current[level].length < CACHE_TARGET_PER_LEVEL) {
      isGeneratingRef.current[level] = true;
      workerRef.current.postMessage({
        type: 'GENERATE_PUZZLE',
        level,
        requestId: `${level}-${Date.now()}`,
      });
    }
  }, []);

  const replenishAll = useCallback(() => {
    (['easy', 'medium', 'hard', 'expert'] as DifficultyLevel[]).forEach(lvl => {
      requestGeneration(lvl);
    });
  }, [requestGeneration]);

  useEffect(() => {
    try {
      const worker = new Worker(new URL('./puzzleWorker.ts', import.meta.url), {
        type: 'module',
      });

      worker.onmessage = (e: MessageEvent) => {
        if (e.data && e.data.type === 'PUZZLE_GENERATED') {
          const { level, puzzle } = e.data as { level: DifficultyLevel; puzzle: GeneratedPuzzle };
          isGeneratingRef.current[level] = false;

          setCache(prev => {
            const currentList = prev[level] || [];
            if (currentList.length >= CACHE_TARGET_PER_LEVEL) return prev;
            const updated = {
              ...prev,
              [level]: [...currentList, puzzle],
            };
            onCacheUpdate(updated);
            return updated;
          });

          // Check if we still need more
          requestGeneration(level);
        } else if (e.data && e.data.type === 'PUZZLE_GENERATION_FAILED') {
          isGeneratingRef.current[e.data.level as DifficultyLevel] = false;
        }
      };

      workerRef.current = worker;
      replenishAll();
    } catch (err) {
      console.warn('Web Worker initialization failed, will use synchronous seeds:', err);
    }

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [onCacheUpdate, replenishAll, requestGeneration]);

  const getNextPuzzle = useCallback((level: DifficultyLevel): GeneratedPuzzle => {
    const list = cacheRef.current[level] || [];
    if (list.length > 0) {
      const [first, ...rest] = list;
      const updated = {
        ...cacheRef.current,
        [level]: rest,
      };
      setCache(updated);
      onCacheUpdate(updated);

      // Replenish in background
      setTimeout(() => requestGeneration(level), 100);
      return first;
    }

    // Cache was empty: use verified instant seed and schedule generation
    setTimeout(() => requestGeneration(level), 100);
    return getVerifiedSeedPuzzle(level);
  }, [onCacheUpdate, requestGeneration]);

  return {
    getNextPuzzle,
    cache,
  };
}
