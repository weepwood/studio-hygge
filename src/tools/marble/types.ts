import type { CanvasPreset } from "@/lib/canvas-size"

export type MarbleSettings = {
  canvasPreset: CanvasPreset
  customWidth: number
  customHeight: number
  colorMain: string
  colorLow: string
  colorMid: string
  colorHigh: string
  noiseScale: number
  windSpeed: number
  warpPower: number
  fbmStrength: number
  fbmDamping: number
  animated: boolean
  speed: number
  watercolorDetail: number
  watercolorWarp: number
  blurRadius: number
  grain: number
  veinIntensity: number
  veinScale: number
  veinColor: string
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, "0")
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export function randomizeColors(): {
  colorMain: string
  colorLow: string
  colorMid: string
  colorHigh: string
} {
  const naturalHues = [22, 34, 42, 105, 142, 198]
  const baseHue = naturalHues[Math.floor(Math.random() * naturalHues.length)] + Math.random() * 14 - 7
  const sat = Math.random() * 22 + 24
  return {
    colorMain: hslToHex(baseHue, sat, Math.random() * 14 + 70),
    colorLow: hslToHex((baseHue - 12 + 360) % 360, sat + 5, Math.random() * 16 + 40),
    colorMid: hslToHex((baseHue + 12) % 360, sat, Math.random() * 14 + 53),
    colorHigh: hslToHex((baseHue + 24) % 360, Math.max(10, sat - 12), Math.random() * 8 + 86),
  }
}

export const DEFAULTS: MarbleSettings = {
  canvasPreset: "square",
  customWidth: 800,
  customHeight: 800,
  colorMain: "#7d5b3a",
  colorLow: "#b7c9b2",
  colorMid: "#d69434",
  colorHigh: "#faf7f2",
  noiseScale: 1.25,
  windSpeed: 0.12,
  warpPower: 0.35,
  fbmStrength: 1.2,
  fbmDamping: 0.55,
  animated: false,
  speed: 1.0,
  watercolorDetail: 18.0,
  watercolorWarp: 0.02,
  blurRadius: 1.0,
  grain: 0,
  veinIntensity: 0,
  veinScale: 3.0,
  veinColor: "#5b3a29",
}
