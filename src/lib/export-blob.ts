
export function canvasPNG(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("PNG encoding failed")), "image/png"))
}
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(()=>URL.revokeObjectURL(url), 1000)
}
export function waitForPaint(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => window.setTimeout(resolve, 0)))
}
