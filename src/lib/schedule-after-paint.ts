/** Run expensive initialization only after the new React screen has painted.
 * A requestAnimationFrame callback runs before paint; its next task runs after.
 * Cancel both stages if the user navigates away before work begins.
 */
export function scheduleAfterPaint(task: () => void): () => void {
  let timeoutId: number | null = null
  const frameId = requestAnimationFrame(() => {
    timeoutId = window.setTimeout(task, 0)
  })
  return () => {
    cancelAnimationFrame(frameId)
    if (timeoutId !== null) window.clearTimeout(timeoutId)
  }
}
