/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { History, BarChart3, Settings, Download } from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';

interface HeaderProps {
  onOpenHistory: () => void;
  onOpenStats: () => void;
  onOpenSettings: () => void;
  activeView: 'home' | 'game';
  onNavigateHome: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenHistory,
  onOpenStats,
  onOpenSettings,
  onNavigateHome,
}) => {
  const { isInstallable, install } = usePWAInstall();

  return (
    <header className="w-full max-w-xl mx-auto px-4 py-3 flex items-center justify-between gap-4 border-b border-stone-200/80 dark:border-stone-800/80">
      {/* Zone 1: Brand wordmark */}
      <button
        onClick={onNavigateHome}
        className="flex items-center gap-2.5 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 rounded-md"
        aria-label="ZenSudoku Home"
      >
        <span className="flex items-center justify-center w-7 h-7 rounded bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 font-semibold text-xs tracking-wider shadow-xs">
          9
        </span>
        <span className="text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100 group-hover:text-stone-600 dark:group-hover:text-stone-300 transition-colors">
          ZenSudoku
        </span>
      </button>

      {/* Zone 2: Navigation / Modals */}
      <div className="flex items-center gap-1 sm:gap-2">
        {isInstallable && (
          <button
            onClick={install}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
            aria-label="Install App"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Install</span>
          </button>
        )}

        <button
          onClick={onOpenHistory}
          className="p-2 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-900 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
          aria-label="Open Game History"
          title="History"
        >
          <History className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenStats}
          className="p-2 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-900 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
          aria-label="Open Statistics"
          title="Statistics"
        >
          <BarChart3 className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenSettings}
          className="p-2 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-900 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
          aria-label="Open Settings"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
