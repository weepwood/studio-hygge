
export type CanvasPreset = 'square' | 'landscape' | 'wide' | 'portrait' | 'tall' | 'custom'
export type PreviewQuality = 'fast' | 'balanced' | 'detail'
export const CANVAS_PRESETS: Record<Exclude<CanvasPreset, 'custom'>, [number, number]> = {
  square: [2048, 2048], landscape: [2048, 1536], wide: [3840, 2160],
  portrait: [1536, 2048], tall: [2160, 3840],
}
export const CANVAS_PRESET_OPTIONS: {value: CanvasPreset; label: string}[] = [
  {value:'square',label:'Square (1:1)'},{value:'landscape',label:'Landscape (4:3)'},
  {value:'wide',label:'Wide (16:9)'},{value:'portrait',label:'Portrait (3:4)'},
  {value:'tall',label:'Tall (9:16)'},{value:'custom',label:'Custom'},
]
export const MAX_EXPORT_SIDE = 3840
export const MAX_EXPORT_PIXELS = 3840 * 3840
export function clampCanvasDimension(value: number): number {
  return Math.max(256, Math.min(MAX_EXPORT_SIDE, Math.round(Number.isFinite(value) ? value : 1024)))
}
export function resolveCanvasSize(preset: CanvasPreset, customWidth: number, customHeight: number): [number, number] {
  if (preset === 'custom') {
    const w = clampCanvasDimension(customWidth), h = clampCanvasDimension(customHeight)
    if (w * h > MAX_EXPORT_PIXELS) {
      const ratio = Math.sqrt(MAX_EXPORT_PIXELS / (w * h))
      return [Math.round(w * ratio), Math.round(h * ratio)]
    }
    return [w, h]
  }
  return CANVAS_PRESETS[preset] ?? CANVAS_PRESETS.square
}
export const PREVIEW_LIMITS: Record<PreviewQuality, number> = {fast: 760, balanced: 1120, detail: 1680}
export function resolvePreviewSize(size: readonly [number, number], quality: PreviewQuality): [number, number] {
  const [w, h] = size
  const scale = Math.min(1, PREVIEW_LIMITS[quality] / Math.max(w, h))
  return [Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))]
}
