import { describe, expect, it, vi } from "vitest"
import { getStoredValue, setStoredValue } from "./safe-storage"

describe("sandbox-safe storage", () => {
  it("falls back to session memory when localStorage is denied", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => { throw new DOMException("Blocked", "SecurityError") },
      setItem: () => { throw new DOMException("Blocked", "SecurityError") },
    })
    try {
      expect(getStoredValue("test:iframe")).toBeNull()
      expect(() => setStoredValue("test:iframe", "selected")).not.toThrow()
      expect(getStoredValue("test:iframe")).toBe("selected")
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
