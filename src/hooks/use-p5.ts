import { useEffect, useRef, type RefObject } from "react"
import p5 from "p5"
import { scheduleAfterPaint } from "@/lib/schedule-after-paint"

interface UseP5Options {
  animated?: boolean
  onReady?: () => void
  onError?: () => void
}

/** Mount tool controls first; defer expensive p5 construction and drawing until after paint. */
export function useP5<T>(
  containerRef: RefObject<HTMLDivElement | null>,
  sketchFn: (p: p5, settingsRef: RefObject<T>) => void,
  settings: T,
  options?: UseP5Options,
): RefObject<p5 | null> {
  const instanceRef = useRef<p5 | null>(null)
  const settingsRef = useRef(settings)
  const callbacksRef = useRef({ onReady: options?.onReady, onError: options?.onError })
  settingsRef.current = settings
  callbacksRef.current = { onReady: options?.onReady, onError: options?.onError }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let disposed = false
    const cancelScheduled = scheduleAfterPaint(() => {
      if (disposed) return
      container.querySelectorAll("canvas").forEach((canvas) => canvas.remove())
      try {
        const instance = new p5((p: p5) => {
          sketchFn(p, settingsRef)
          const originalSetup = p.setup
          p.setup = () => {
            try {
              originalSetup?.()
              if (!disposed) callbacksRef.current.onReady?.()
            } catch (error) {
              if (!disposed) callbacksRef.current.onError?.()
              console.error("Sketch initialization failed:", error)
              throw error
            }
          }
        }, container)
        if (disposed) {
          // p5 v2 can finish initializing after unmount.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(instance as any).hitCriticalError = true
          instance.remove()
        } else {
          instanceRef.current = instance
        }
      } catch (error) {
        if (!disposed) callbacksRef.current.onError?.()
        console.error("Unable to initialize sketch:", error)
      }
    })
    return () => {
      disposed = true
      cancelScheduled()
      const instance = instanceRef.current
      if (instance) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(instance as any).hitCriticalError = true
        instance.remove()
        instanceRef.current = null
      }
      container.querySelectorAll("canvas").forEach((canvas) => canvas.remove())
    }
    // sketchFn must be stable, defined with useCallback by callers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef])

  const rafRef = useRef<number | null>(null)
  useEffect(() => {
    if (!options?.animated && instanceRef.current) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        instanceRef.current?.redraw()
      })
    }
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [settings, options?.animated])
  return instanceRef
}
