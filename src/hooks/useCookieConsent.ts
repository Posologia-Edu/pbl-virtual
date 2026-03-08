import { useState, useCallback, useEffect } from "react";

export interface CookiePreferences {
  essential: boolean; // always true
  analytical: boolean;
  functional: boolean;
  marketing: boolean;
}

const STORAGE_KEY = "cookie_consent";

const DEFAULT_PREFERENCES: CookiePreferences = {
  essential: true,
  analytical: false,
  functional: false,
  marketing: false,
};

function loadPreferences(): CookiePreferences | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CookiePreferences;
  } catch {
    return null;
  }
}

export function useCookieConsent() {
  const [preferences, setPreferences] = useState<CookiePreferences | null>(() => loadPreferences());
  const [showBanner, setShowBanner] = useState(() => loadPreferences() === null);

  const save = useCallback((prefs: CookiePreferences) => {
    const final = { ...prefs, essential: true };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(final));
    setPreferences(final);
    setShowBanner(false);
  }, []);

  const acceptAll = useCallback(() => {
    save({ essential: true, analytical: true, functional: true, marketing: true });
  }, [save]);

  const rejectNonEssential = useCallback(() => {
    save({ ...DEFAULT_PREFERENCES });
  }, [save]);

  const updatePreferences = useCallback((prefs: Partial<CookiePreferences>) => {
    save({ ...(preferences ?? DEFAULT_PREFERENCES), ...prefs, essential: true });
  }, [preferences, save]);

  const reopenBanner = useCallback(() => {
    setShowBanner(true);
  }, []);

  const hasConsent = useCallback((category: keyof CookiePreferences) => {
    return preferences?.[category] ?? false;
  }, [preferences]);

  return {
    preferences,
    showBanner,
    acceptAll,
    rejectNonEssential,
    updatePreferences,
    reopenBanner,
    hasConsent,
    hasDecided: preferences !== null,
  };
}
