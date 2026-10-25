/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Theme application manager for Light, Dark, High-Contrast, and System modes.
 */

import { AppSettings } from '../logic/types';

export function applyTheme(theme: AppSettings['theme']) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.classList.remove('dark', 'contrast');

  let resolvedTheme = theme;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    resolvedTheme = prefersDark ? 'dark' : 'light';
  }

  if (resolvedTheme === 'dark') {
    root.classList.add('dark');
  } else if (resolvedTheme === 'contrast') {
    root.classList.add('dark', 'contrast');
  }

  // Update meta theme-color
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    if (resolvedTheme === 'contrast') {
      metaTheme.setAttribute('content', '#000000');
    } else if (resolvedTheme === 'dark') {
      metaTheme.setAttribute('content', '#18181b');
    } else {
      metaTheme.setAttribute('content', '#fafaf9');
    }
  }
}
