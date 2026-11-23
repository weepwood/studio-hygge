
import p5 from "p5"
import type { RefObject } from "react"
import { scheduleAfterPaint } from "@/lib/schedule-after-paint"
/** Render an isolated full-resolution p5 sketch on demand. Preview canvas is never resized. */
export function withExportSketch<T, G, R>(
  settings: T,
  createSketch: (p: p5, settingsRef: RefObject<T>, geometryRef: RefObject<G | null>) => void,
  capture: (canvas: HTMLCanvasElement, geometry: G | null) => Promise<R> | R,
): Promise<R> {
  return new Promise<R>((resolve, reject) => {
    const host = document.createElement("div")
    host.style.cssText = "position:fixed;left:-10000px;top:-10000px;visibility:hidden;pointer-events:none"
    document.body.append(host)
    let instance: p5 | null = null
    let done = false
    let started = false
    const settingsRef = {current: settings} as RefObject<T>
    const geometryRef = {current: null} as RefObject<G | null>
    let cancelTask = () => {}
    const timeout = window.setTimeout(()=> finish(new Error("Export render timed out")), 60000)
    function finish(error?: unknown, value?: R) {
      if (done) return
      done = true
      cancelTask()
      window.clearTimeout(timeout)
      if (instance) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(instance as any).hitCriticalError = true
        instance.remove()
      }
      host.remove()
      if (error) reject(error)
      else resolve(value as R)
    }
    cancelTask = scheduleAfterPaint(() => {
      if (done) return
      try {
        instance = new p5((p) => {
          createSketch(p, settingsRef, geometryRef)
          const setup = p.setup
          p.setup = () => {
            try {
              setup?.()
              if (started) return
              started = true
              // setup() draws the complete image in both current p5 sketches.
              window.setTimeout(() => {
                if (done) return
                const canvas = p.canvas as HTMLCanvasElement | undefined
                if (!canvas) { finish(new Error("Canvas unavailable")); return }
                Promise.resolve().then(() => capture(canvas, geometryRef.current))
                  .then(value => finish(undefined, value), error => finish(error))
              }, 0)
            } catch (error) { finish(error); throw error }
          }
        }, host)
      } catch(error) { finish(error) }
    })
  })
}
