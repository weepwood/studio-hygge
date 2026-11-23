import { getStoredValue, setStoredValue } from "@/lib/safe-storage"
import { useState, useCallback, useRef, useEffect } from "react";
import { shortcutActions } from "@/lib/shortcut-actions";
import { settingsFromBase64Url } from "@/lib/url-settings";

/**
 * Persist tool settings to localStorage with debounced writes.
 *
 * Returns [settings, update, reset]:
 * - update: shallow-merges a patch into current settings
 * - reset: reverts to defaults immediately
 */
export function useSettings<T extends Record<string, unknown>>(
  key: string,
  defaults: T,
): [T, (patch: Partial<T>) => void, () => void] {
  const storageKey = `studio:${key}`;
  const [settings, setSettings] = useState<T>(() => {
    // Priority: URL params > localStorage > defaults
    const urlParams = new URLSearchParams(window.location.search);
    const encoded = urlParams.get("s");
    if (encoded) {
      const decoded = settingsFromBase64Url(encoded);
      if (decoded) {
        const merged = { ...defaults, ...(decoded as Partial<T>) };
        setStoredValue(storageKey, JSON.stringify(merged));
        try { window.history.replaceState({}, "", window.location.pathname); } catch { /* opaque iframe origin */ }
        return merged;
      }
    }

    try {
      const raw = getStoredValue(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<T>;
        return { ...defaults, ...parsed };
      }
    } catch {
      // corrupted data — fall through to defaults
    }
    return defaults;
  });
  const latestRef = useRef(settings);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<T | null>(null);

  useEffect(() => {
    latestRef.current = settings;
  }, [settings]);

  const flushPendingWrite = useCallback(() => {
    if (!timerRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
    if (pendingRef.current !== null) {
      const next = pendingRef.current;
      setStoredValue(storageKey, JSON.stringify(next));
      latestRef.current = next;
      pendingRef.current = null;
    }
  }, [storageKey]);

  const clearPendingWrite = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingRef.current = null;
  }, []);

  // Debounced write to localStorage
  const writeToStorage = useCallback(
    (value: T) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      pendingRef.current = value;
      timerRef.current = setTimeout(() => {
        setStoredValue(storageKey, JSON.stringify(value));
        pendingRef.current = null;
      }, 200);
    },
    [storageKey],
  );

  // Flush pending write on unmount so settings aren't lost
  useEffect(() => {
    return flushPendingWrite;
  }, [flushPendingWrite]);

  // Register the current settings getter for saving designs.
  useEffect(() => {
    shortcutActions.getSettings = () => {
      flushPendingWrite();
      return latestRef.current;
    };
    return () => {
      shortcutActions.getSettings = null;
    };
  }, [flushPendingWrite, key]);

  // Listen for settings-loaded events (from loading saved designs)
  useEffect(() => {
    function onSettingsLoaded(e: Event) {
      const detail = (e as CustomEvent).detail
      if (detail?.key !== storageKey) return
      try {
        clearPendingWrite()
        const raw = getStoredValue(storageKey)
        if (raw) {
          const next = { ...defaults, ...JSON.parse(raw) }
          latestRef.current = next
          setSettings(next)
        }
      } catch {
        // ignore
      }
    }
    window.addEventListener('studio:settings-loaded', onSettingsLoaded)
    return () => window.removeEventListener('studio:settings-loaded', onSettingsLoaded)
  }, [clearPendingWrite, defaults, storageKey])

  const update = useCallback(
    (patch: Partial<T>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        writeToStorage(next);
        return next;
      });
    },
    [writeToStorage],
  );

  const reset = useCallback(() => {
    // Reset must win over any in-flight debounced write from a prior update.
    clearPendingWrite();
    latestRef.current = defaults;
    setSettings(defaults);
    setStoredValue(storageKey, JSON.stringify(defaults));
  }, [clearPendingWrite, defaults, storageKey]);

  return [settings, update, reset];
}
