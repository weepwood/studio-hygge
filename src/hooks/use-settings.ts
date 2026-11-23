import { getStoredValue, setStoredValue } from "@/lib/safe-storage"
import { useState, useCallback, useRef, useEffect } from "react";
import { shortcutActions } from "@/lib/shortcut-actions";
import { settingsFromBase64Url } from "@/lib/url-settings";
import { sanitizeSettings } from "@/lib/settings-schema";

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
): [T, (patch: Partial<T>) => void, () => void, () => void, () => void, boolean, boolean] {
  const storageKey = `studio:${key}`;
  const [settings, setSettings] = useState<T>(() => {
    // Priority: URL params > localStorage > defaults
    const urlParams = new URLSearchParams(window.location.search);
    const encoded = urlParams.get("s");
    if (encoded) {
      const decoded = settingsFromBase64Url(encoded);
      if (decoded) {
        const merged = sanitizeSettings(key, decoded, defaults);
        setStoredValue(storageKey, JSON.stringify(merged));
        try { window.history.replaceState({}, "", window.location.pathname); } catch { /* opaque iframe origin */ }
        return merged;
      }
    }

    try {
      const raw = getStoredValue(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<T>;
        return sanitizeSettings(key, parsed, defaults);
      }
    } catch {
      // corrupted data — fall through to defaults
    }
    return defaults;
  });
  const latestRef = useRef(settings);
  const historyRef = useRef<{past:T[];future:T[]}>({past:[],future:[]});

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
          const next = sanitizeSettings(key, JSON.parse(raw), defaults)
          latestRef.current = next
          historyRef.current = {past:[],future:[]}
          setSettings(next)
        }
      } catch {
        // ignore
      }
    }
    window.addEventListener('studio:settings-loaded', onSettingsLoaded)
    return () => window.removeEventListener('studio:settings-loaded', onSettingsLoaded)
  }, [clearPendingWrite, defaults, storageKey])

  const update = useCallback((patch: Partial<T>) => {
    const previous = latestRef.current;
    const next = sanitizeSettings(key, {...previous,...patch},defaults);
    if (JSON.stringify(previous) === JSON.stringify(next)) return;
    historyRef.current.past.push(previous);
    if (historyRef.current.past.length > 50) historyRef.current.past.shift();
    historyRef.current.future = [];
    latestRef.current = next;
    setSettings(next);
    writeToStorage(next);
  },[writeToStorage,key,defaults]);

  const reset = useCallback(() => {
    const previous = latestRef.current;
    historyRef.current.past.push(previous);
    if (historyRef.current.past.length > 50) historyRef.current.past.shift();
    historyRef.current.future = [];
    clearPendingWrite();
    latestRef.current = defaults;
    setSettings(defaults);
    setStoredValue(storageKey, JSON.stringify(defaults));
  }, [clearPendingWrite, defaults, storageKey]);

  const undo = useCallback(() => {
    const previous = historyRef.current.past.pop();
    if (!previous) return;
    historyRef.current.future.push(latestRef.current);
    latestRef.current = previous;
    setSettings(previous);
    writeToStorage(previous);
  }, [writeToStorage]);

  const redo = useCallback(() => {
    const next = historyRef.current.future.pop();
    if (!next) return;
    historyRef.current.past.push(latestRef.current);
    latestRef.current = next;
    setSettings(next);
    writeToStorage(next);
  }, [writeToStorage]);

  return [settings, update, reset, undo, redo,
    historyRef.current.past.length > 0, historyRef.current.future.length > 0];
}
