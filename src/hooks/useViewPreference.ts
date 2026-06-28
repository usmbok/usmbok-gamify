import { useState, useEffect } from 'react';

export type ViewMode = 'card' | 'list';

const STORAGE_KEY = 'view_preferences';

function getPreferences(): Record<string, ViewMode> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setPreference(page: string, mode: ViewMode) {
  const prefs = getPreferences();
  prefs[page] = mode;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function useViewPreference(page: string, defaultMode: ViewMode = 'card'): [ViewMode, (m: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>(() => {
    const prefs = getPreferences();
    return prefs[page] ?? defaultMode;
  });

  useEffect(() => {
    setPreference(page, mode);
  }, [page, mode]);

  return [mode, setMode];
}
