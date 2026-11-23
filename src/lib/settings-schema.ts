
import { clampCanvasDimension } from "@/lib/canvas-size"

type Bounds = [number, number]
const common: Record<string, Bounds> = {
  customWidth: [256, 3840], customHeight: [256, 3840],
}
const bounds: Record<string, Record<string, Bounds>> = {
  topo: {seed:[0,99999],contourLevels:[5,50],noiseScale:[0.002,0.02],octaves:[1,6],
    falloff:[0.3,0.7],strokeWeight:[0.5,5],wobble:[0,50],roughness:[0,30],
    smoothing:[0,100],opacity:[10,100],grain:[0,50],margin:[0,100]},
  blocks: {seed:[0,99999],blockCount:[1,20],complexity:[0,8],lineWeight:[0,10],
    rotation:[-360,360],asymmetry:[0,100],colorDensity:[0,100],gridDivisions:[2,16],
    texture:[0,100],grain:[0,100],halftone:[0,100],halftoneSize:[1,12],
    halftoneMisalign:[0,100],halftoneAngle:[0,90],edgeWobble:[0,100]},
  marble: {noiseScale:[0.5,3],windSpeed:[0.01,0.5],warpPower:[0,1],
    fbmStrength:[0.1,3],fbmDamping:[0.1,1],speed:[0.1,3],
    watercolorDetail:[1,30],watercolorWarp:[0,0.1],blurRadius:[0.1,3],
    grain:[0,100],veinIntensity:[0,1],veinScale:[1,10]},
}
const choices: Record<string, Record<string, readonly string[]>> = {
  topo: {colorMode:['single','elevation','palette'],palette:['mono','topo','ocean','earth','sunset','forest','hygge','heat']},
  blocks: {patternType:['mondrian','grid','horizontal','diagonal'],palette:['mondrian','neo-mondrian','warm','hygge','cool','monochrome','custom']},
}
const presets = ['square','landscape','wide','portrait','tall','custom']
const hex = /^#[0-9a-fA-F]{6}$/
function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

/** Sanitizes URL, IndexedDB and localStorage settings using the same constraints as the UI. */
export function sanitizeSettings<T extends Record<string, unknown>>(tool: string, value: unknown, defaults: T): T {
  if (!isRecord(value)) return {...defaults}
  const result: Record<string, unknown> = {...defaults}
  for (const [key, initial] of Object.entries(defaults)) {
    const incoming = value[key]
    if (typeof initial === 'number') {
      if (typeof incoming !== 'number' || !Number.isFinite(incoming)) continue
      const [min,max] = bounds[tool]?.[key] ?? common[key] ?? [-10000, 10000]
      result[key] = Math.max(min, Math.min(max, key === 'customWidth' || key === 'customHeight'
        ? clampCanvasDimension(incoming) : incoming))
    } else if (typeof initial === 'boolean') {
      if (typeof incoming === 'boolean') result[key] = incoming
    } else if (typeof initial === 'string') {
      if (typeof incoming !== 'string' || incoming.length > 80) continue
      if (key.toLowerCase().includes('color') && key !== 'colorMode') {
        if (hex.test(incoming)) result[key] = incoming
      } else if (key === 'canvasPreset') {
        if (presets.includes(incoming)) result[key] = incoming
      } else {
        const allowed = choices[tool]?.[key]
        if (allowed ? allowed.includes(incoming) : incoming === initial) result[key] = incoming
      }
    } else if (Array.isArray(initial)) {
      if (Array.isArray(incoming) && incoming.length === initial.length &&
          incoming.every(c => typeof c === 'string' && hex.test(c))) result[key] = [...incoming]
      else result[key] = [...initial]
    }
  }
  return result as T
}
