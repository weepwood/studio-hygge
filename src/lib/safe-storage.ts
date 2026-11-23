// An iframe with an opaque sandbox origin cannot use localStorage.
// Keep the current session interactive without weakening the parent sandbox.
const sessionValues = new Map<string, string>()

export function getStoredValue(key: string): string | null {
  try {
    return localStorage.getItem(key) ?? sessionValues.get(key) ?? null
  } catch {
    return sessionValues.get(key) ?? null
  }
}

export function setStoredValue(key: string, value: string): void {
  sessionValues.set(key, value)
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage is unavailable in an opaque-origin iframe.
  }
}
