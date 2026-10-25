/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { X, Download, Upload, AlertTriangle, Check, RefreshCw } from 'lucide-react';
import { AppSettings } from '../logic/types';
import {
  AppStoragePayload,
  exportBackupJson,
  validateAndParseBackup,
} from '../storage/storage';

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  storageData: AppStoragePayload;
  onUpdateSettings: (next: AppSettings) => void;
  onImportBackup: (importedData: AppStoragePayload) => void;
  onResetAllData: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  storageData,
  onUpdateSettings,
  onImportBackup,
  onResetAllData,
  onClose,
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExport = () => {
    const json = exportBackupJson(storageData);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zensudoku-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result as string;
      const parsed = validateAndParseBackup(text);
      if (parsed) {
        onImportBackup(parsed);
        setImportStatus('Backup restored successfully!');
        setTimeout(() => setImportStatus(null), 3000);
      } else {
        setImportStatus('Invalid backup file. Please verify format.');
        setTimeout(() => setImportStatus(null), 3000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    onUpdateSettings({
      ...settings,
      [key]: value,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 dark:bg-black/60 backdrop-blur-xs p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div className="w-full max-w-md max-h-[90vh] rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200/80 dark:border-stone-800/80">
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            aria-label="Close Settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-6 text-sm text-stone-700 dark:text-stone-300">
          {/* Theme Section */}
          <div className="flex flex-col gap-2.5">
            <label className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              Theme
            </label>
            <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-stone-100 dark:bg-stone-800">
              {(['system', 'light', 'dark', 'contrast'] as const).map(th => (
                <button
                  key={th}
                  onClick={() => updateSetting('theme', th)}
                  className={`py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${
                    settings.theme === th
                      ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                  }`}
                >
                  {th === 'contrast' ? 'Contrast' : th}
                </button>
              ))}
            </div>
          </div>

          {/* Number & Note Size */}
          <div className="flex flex-col gap-2.5">
            <label className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              Number & Note Size
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-stone-100 dark:bg-stone-800">
              {(['small', 'medium', 'large'] as const).map(sz => (
                <button
                  key={sz}
                  onClick={() => updateSetting('fontSize', sz)}
                  className={`py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${
                    settings.fontSize === sz
                      ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          {/* Gameplay Toggles */}
          <div className="flex flex-col gap-3 pt-2 border-t border-stone-100 dark:border-stone-800">
            <label className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              Gameplay
            </label>

            {/* Show Timer */}
            <div className="flex items-center justify-between py-1">
              <div>
                <div className="font-medium text-stone-900 dark:text-stone-100">Show Timer</div>
                <div className="text-xs text-stone-500">Count up time during puzzles</div>
              </div>
              <input
                type="checkbox"
                checked={settings.showTimer}
                onChange={e => updateSetting('showTimer', e.target.checked)}
                className="w-4 h-4 rounded text-stone-900 focus:ring-stone-400"
              />
            </div>

            {/* Highlight Same Numbers */}
            <div className="flex items-center justify-between py-1">
              <div>
                <div className="font-medium text-stone-900 dark:text-stone-100">
                  Highlight Same Numbers
                </div>
                <div className="text-xs text-stone-500">
                  Highlight other cells with matching digit
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.highlightSameNumbers}
                onChange={e => updateSetting('highlightSameNumbers', e.target.checked)}
                className="w-4 h-4 rounded text-stone-900 focus:ring-stone-400"
              />
            </div>

            {/* Color Feedback (Green/Red) - Default ON */}
            <div className="flex items-center justify-between py-1">
              <div>
                <div className="font-medium text-stone-900 dark:text-stone-100">
                  Color Feedback
                </div>
                <div className="text-xs text-stone-500">
                  Highlight correct digits in green and wrong digits in red
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.colorFeedback ?? true}
                onChange={e => updateSetting('colorFeedback', e.target.checked)}
                className="w-4 h-4 rounded text-stone-900 focus:ring-stone-400"
              />
            </div>

            {/* Auto-remove notes (default ON) */}
            <div className="flex items-center justify-between py-1">
              <div>
                <div className="font-medium text-stone-900 dark:text-stone-100">
                  Auto-Remove Notes
                </div>
                <div className="text-xs text-stone-500">
                  Clear candidate from row, col, and box on placement
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.autoRemoveNotes}
                onChange={e => updateSetting('autoRemoveNotes', e.target.checked)}
                className="w-4 h-4 rounded text-stone-900 focus:ring-stone-400"
              />
            </div>

            {/* Haptic Feedback (default OFF) */}
            <div className="flex items-center justify-between py-1">
              <div>
                <div className="font-medium text-stone-900 dark:text-stone-100">Haptic Feedback</div>
                <div className="text-xs text-stone-500">Vibrate on moves and actions</div>
              </div>
              <input
                type="checkbox"
                checked={settings.hapticFeedback}
                onChange={e => updateSetting('hapticFeedback', e.target.checked)}
                className="w-4 h-4 rounded text-stone-900 focus:ring-stone-400"
              />
            </div>

            {/* Sound Effects (default OFF) */}
            <div className="flex items-center justify-between py-1">
              <div>
                <div className="font-medium text-stone-900 dark:text-stone-100">Sound Effects</div>
                <div className="text-xs text-stone-500">Gentle synthesized audio chimes</div>
              </div>
              <input
                type="checkbox"
                checked={settings.soundEffects}
                onChange={e => updateSetting('soundEffects', e.target.checked)}
                className="w-4 h-4 rounded text-stone-900 focus:ring-stone-400"
              />
            </div>
          </div>

          {/* Backup & Data Management */}
          <div className="flex flex-col gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
            <label className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              Data & Backup
            </label>

            {importStatus && (
              <div className="p-2.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-xs font-medium text-stone-800 dark:text-stone-200 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{importStatus}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExport}
                className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/60 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/60 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import JSON</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Reset All Data */}
            {!showResetConfirm ? (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="mt-2 py-2 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-left transition-colors"
              >
                Reset All Progress...
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex flex-col gap-2.5 text-xs text-red-900 dark:text-red-200">
                <div className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Are you sure? This erases all streaks, history, and records.</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => {
                      onResetAllData();
                      setShowResetConfirm(false);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
                  >
                    Yes, Reset Everything
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 hover:bg-red-100/50 dark:hover:bg-red-900/30 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
