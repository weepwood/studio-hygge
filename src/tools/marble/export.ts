
import type { MarbleSettings } from "./types"
import { createMarbleEngine, type MarbleEngine } from "./engine"
import { resolveCanvasSize } from "@/lib/canvas-size"
import { canvasPNG } from "@/lib/export-blob"

/** Isolated WebGL render for full-resolution PNG; never resizes the live preview. */
export function renderMarblePNG(settings: MarbleSettings): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    const canvas = document.createElement("canvas")
    const [w, h] = resolveCanvasSize(settings.canvasPreset, settings.customWidth, settings.customHeight)
    canvas.width = w
    canvas.height = h
    const stillSettings = {...settings, animated: false}
    let engine: MarbleEngine | null = null
    let settled = false
    let captureQueued = false
    const timeout = window.setTimeout(() => finish(new Error("Marble export timed out")), 60000)
    function finish(error?: unknown, blob?: Blob) {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      engine?.destroy()
      if (error) reject(error)
      else resolve(blob as Blob)
    }
    try {
      engine = createMarbleEngine(canvas, {current:stillSettings}, undefined, () => {
        if (captureQueued) return
        captureQueued = true
        requestAnimationFrame(() => {
          if (settled) return
          canvasPNG(canvas).then(blob => finish(undefined, blob), error => finish(error))
        })
      })
      if (!engine) finish(new Error("WebGL2 is unavailable or cannot render this image size"))
    } catch (error) { finish(error) }
  })
}
