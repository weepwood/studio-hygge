import type p5 from 'p5'
import type { RefObject } from 'react'
import type { BlocksSettings, RectBlock, PolyBlock, BlocksGeometry } from './types'
import { seededRandom } from '@/lib/math'
import { resolveCanvasSize } from '@/lib/canvas-size'
import { processBlocksPixels } from './effects'

export const PALETTES: Record<string, string[]> = {
  mondrian: ['#c92a2a', '#1862a8', '#f4d03f', '#ffffff', '#ffffff'],
  'neo-mondrian': ['#e63946', '#457b9d', '#f1c453', '#f1faee', '#a8dadc'],
  warm: ['#d64045', '#e8985e', '#f4d35e', '#fffffc', '#fffffc'],
  hygge: ['#a65e2e', '#c76a3d', '#d69434', '#faf7f2', '#f0eae0'],
  cool: ['#264653', '#2a9d8f', '#e9c46a', '#f4f1de', '#f4f1de'],
  monochrome: ['#212529', '#495057', '#adb5bd', '#f8f9fa', '#ffffff'],
}

export function pickColor(rng: () => number, colorDensity: number, colors: string[]): string {
  if (rng() < colorDensity) {
    return colors[Math.floor(rng() * 3) % colors.length]
  }
  return colors[Math.floor(rng() * 2 + 3) % colors.length]
}

export function createBlocksSketch(p: p5, settingsRef: RefObject<BlocksSettings>, geometryRef?: RefObject<BlocksGeometry | null>, onFrameReady?: () => void) {
  const ctx = () => p.drawingContext as CanvasRenderingContext2D

  // Cached geometry
  let cachedRects: RectBlock[] = []
  let cachedPolys: PolyBlock[] = []
  let cachedLayoutKey = ''

  // Pre-effects canvas cache — avoids redrawing geometry when only effects change,
  // and avoids re-running effects when only geometry changes with same effect params.
  let preEffectsCanvas: OffscreenCanvas | null = null
  let cachedDrawKey = ''
  let cachedNoiseMap: Float32Array | null = null
  let cachedNoiseMapW = 0
  let cachedNoiseMapDims = ''
  let worker: Worker | null = null
  let effectTimer: ReturnType<typeof setTimeout> | null = null
  let revision = 0
  let disposed = false
  function cancelEffect() {
    revision++
    if (effectTimer !== null) clearTimeout(effectTimer)
    effectTimer = null
    worker?.terminate()
    worker = null
  }
  ;(p as p5 & {cleanupEffects?: () => void}).cleanupEffects = () => {
    disposed = true
    cancelEffect()
  }

  function layoutKey(s: BlocksSettings): string {
    return `${s.seed}|${s.patternType}|${s.blockCount}|${s.complexity}|${s.asymmetry}|${s.gridDivisions}|${s.canvasPreset}|${s.customWidth}|${s.customHeight}`
  }

  // Everything that affects the drawn geometry (before effects)
  function drawKey(s: BlocksSettings): string {
    return `${layoutKey(s)}|${s.bgColor}|${s.colors.join(',')}|${s.colorDensity}|${s.lineWeight}|${s.lineColor}|${s.edgeWobble}|${s.rotation}`
  }

  p.setup = () => {
    const s = settingsRef.current
    const [w, h] = resolveCanvasSize(s.canvasPreset, s.customWidth, s.customHeight)
    p.createCanvas(w, h)
    p.pixelDensity(1)
    p.colorMode(p.RGB, 255)
    p.noLoop()
    redrawCanvas()
  }

  p.draw = () => {
    redrawCanvas()
  }

  function redrawCanvas() {
    const s = settingsRef.current

    // Resize canvas if needed
    const [tw, th] = resolveCanvasSize(s.canvasPreset, s.customWidth, s.customHeight)
    if (p.width !== tw || p.height !== th) {
      p.resizeCanvas(tw, th)
      p.colorMode(p.RGB, 255)
      cachedLayoutKey = '' // force recompute
      cachedDrawKey = '' // force geometry redraw
    }

    const dk = drawKey(s)
    const needsGeometryRedraw = dk !== cachedDrawKey

    if (needsGeometryRedraw) {
      const c = ctx()

      // Use p.background() to clear — it resets p5's internal transform state
      p.background(s.bgColor)

      // Recompute layout if cache key changed
      const lk = layoutKey(s)
      if (lk !== cachedLayoutKey) {
        computeLayout(s)
        cachedLayoutKey = lk
      }

      // Expose geometry for SVG export
      if (geometryRef) {
        geometryRef.current = { rects: cachedRects, polys: cachedPolys, width: p.width, height: p.height }
      }

      // Assign colors deterministically
      const colorRng = seededRandom(s.seed + 7)
      const colorDensity = s.colorDensity / 100
      const wobble = s.edgeWobble / 100

      // Apply rotation via Canvas 2D
      c.save()
      c.translate(p.width / 2, p.height / 2)
      c.rotate(s.rotation * Math.PI / 180)
      c.translate(-p.width / 2, -p.height / 2)

      if (s.patternType === 'diagonal') {
        const drawRng = seededRandom(s.seed + 13)
        for (const poly of cachedPolys) {
          const blockColor = pickColor(colorRng, colorDensity, s.colors)
          drawPaintedPolygon(c, poly.points, blockColor, wobble, drawRng)
        }
        if (s.lineWeight > 0) {
          const outlineRng = seededRandom(s.seed + 19)
          c.strokeStyle = s.lineColor
          c.lineWidth = s.lineWeight
          for (const poly of cachedPolys) {
            c.beginPath()
            for (let k = 0; k < poly.points.length; k++) {
              const pt = poly.points[k]
              const px = pt.x + (outlineRng() - 0.5) * wobble * 4
              const py = pt.y + (outlineRng() - 0.5) * wobble * 4
              if (k === 0) c.moveTo(px, py)
              else c.lineTo(px, py)
            }
            c.closePath()
            c.stroke()
          }
        }
      } else {
        const drawRng = seededRandom(s.seed + 13)
        for (const rect of cachedRects) {
          const blockColor = pickColor(colorRng, colorDensity, s.colors)
          drawPaintedBlock(c, rect, blockColor, wobble, drawRng)
        }
        if (s.lineWeight > 0) {
          const outlineRng = seededRandom(s.seed + 19)
          c.strokeStyle = s.lineColor
          c.lineWidth = s.lineWeight
          for (const rect of cachedRects) {
            drawWobblyRectOutline(c, rect, wobble, outlineRng)
          }
        }
      }

      c.restore()

      // Snapshot pre-effects state to offscreen canvas
      const d = p.pixelDensity()
      const pw = p.width * d
      const ph = p.height * d
      if (!preEffectsCanvas || preEffectsCanvas.width !== pw || preEffectsCanvas.height !== ph) {
        preEffectsCanvas = new OffscreenCanvas(pw, ph)
      }
      preEffectsCanvas.getContext('2d')!.drawImage(c.canvas, 0, 0)
      cachedDrawKey = dk
    } else {
      // Geometry hasn't changed — restore from cache
      const c = ctx()
      c.drawImage(preEffectsCanvas!, 0, 0)
    }

    // Post-processing effects
    cancelEffect()
    if (s.texture > 0 || s.grain > 0 || s.halftone > 0) {
      applyEffects(s)
    } else {
      onFrameReady?.()
    }
  }

  function computeLayout(s: BlocksSettings) {
    cachedRects = []
    cachedPolys = []
    const rng = seededRandom(s.seed)

    switch (s.patternType) {
      case 'mondrian':
        cachedRects = generateMondrian(rng, s)
        break
      case 'grid':
        cachedRects = generateGrid(rng, s)
        break
      case 'horizontal':
        cachedRects = generateHorizontal(rng, s)
        break
      case 'diagonal':
        cachedPolys = generateDiagonal(rng, s)
        break
    }
  }

  // --- Pattern generators (geometry only, no colors) ---

  function generateMondrian(rng: () => number, s: BlocksSettings): RectBlock[] {
    const blocks: RectBlock[] = []
    const asymmetry = s.asymmetry / 100

    function subdivide(x: number, y: number, w: number, h: number, depth: number) {
      if (depth <= 0 || w < 50 || h < 50) {
        blocks.push({ x, y, w, h })
        return
      }

      const splitVertical = w > h
        ? rng() < 0.5 + asymmetry * 0.3
        : rng() < 0.5 - asymmetry * 0.3

      if (splitVertical && w > 80) {
        const minSplit = 0.2 + (1 - asymmetry) * 0.15
        const maxSplit = 0.8 - (1 - asymmetry) * 0.15
        const split = rng() * (maxSplit - minSplit) + minSplit
        const w1 = w * split
        subdivide(x, y, w1, h, depth - 1)
        subdivide(x + w1, y, w - w1, h, depth - 1)
      } else if (h > 80) {
        const minSplit = 0.2 + (1 - asymmetry) * 0.15
        const maxSplit = 0.8 - (1 - asymmetry) * 0.15
        const split = rng() * (maxSplit - minSplit) + minSplit
        const h1 = h * split
        subdivide(x, y, w, h1, depth - 1)
        subdivide(x, y + h1, w, h - h1, depth - 1)
      } else {
        blocks.push({ x, y, w, h })
      }
    }

    subdivide(0, 0, p.width, p.height, s.complexity + 2)
    return blocks
  }

  function generateGrid(rng: () => number, s: BlocksSettings): RectBlock[] {
    const divisions = s.gridDivisions
    const cellW = p.width / divisions
    const cellH = p.height / divisions
    const occupied: boolean[][] = Array.from({ length: divisions }, () =>
      Array(divisions).fill(false) as boolean[],
    )
    const blocks: RectBlock[] = []

    // Place larger blocks
    const numLarge = s.blockCount
    for (let i = 0; i < numLarge; i++) {
      const col = Math.floor(rng() * divisions)
      const row = Math.floor(rng() * divisions)
      if (occupied[row][col]) continue

      let spanW = 1
      let spanH = 1
      if (rng() > 0.4) spanW = Math.min(Math.floor(rng() * 2 + 2), divisions - col)
      if (rng() > 0.4) spanH = Math.min(Math.floor(rng() * 2 + 2), divisions - row)

      let canPlace = true
      for (let r = row; r < row + spanH && canPlace; r++) {
        for (let c = col; c < col + spanW && canPlace; c++) {
          if (occupied[r]?.[c]) canPlace = false
        }
      }

      if (canPlace) {
        for (let r = row; r < row + spanH; r++) {
          for (let c = col; c < col + spanW; c++) {
            occupied[r][c] = true
          }
        }
        blocks.push({ x: col * cellW, y: row * cellH, w: spanW * cellW, h: spanH * cellH })
      }
    }

    // Fill remaining cells
    for (let row = 0; row < divisions; row++) {
      for (let col = 0; col < divisions; col++) {
        if (!occupied[row][col]) {
          blocks.push({ x: col * cellW, y: row * cellH, w: cellW, h: cellH })
        }
      }
    }

    return blocks
  }

  function generateHorizontal(rng: () => number, s: BlocksSettings): RectBlock[] {
    const numBands = s.blockCount + 2
    const asymmetry = s.asymmetry / 100
    const blocks: RectBlock[] = []
    let y = 0

    for (let i = 0; i < numBands; i++) {
      const minH = p.height / numBands * 0.3
      const maxH = p.height / numBands * (1 + asymmetry)
      const h = Math.min(rng() * (maxH - minH) + minH, p.height - y)
      if (h <= 0) break

      let x = 0
      const numCols = Math.floor(rng() * s.complexity) + 1
      for (let j = 0; j < numCols; j++) {
        const w = j === numCols - 1
          ? p.width - x
          : rng() * (p.width / numCols) + (p.width / numCols * 0.5)
        blocks.push({ x, y, w: Math.min(w, p.width - x), h })
        x += w
        if (x >= p.width) break
      }

      y += h
      if (y >= p.height) break
    }

    return blocks
  }

  function generateDiagonal(rng: () => number, s: BlocksSettings): PolyBlock[] {
    const blocks: PolyBlock[] = []
    const numStrips = s.complexity + 3
    const stripWidth = (p.width + p.height) / numStrips

    for (let i = 0; i < numStrips; i++) {
      const numSections = Math.floor(rng() * s.complexity) + 1
      const sectionHeight = p.height / numSections

      for (let j = 0; j < numSections; j++) {
        const x1 = i * stripWidth - p.height + j * sectionHeight
        const y1 = j * sectionHeight
        const x2 = x1 + stripWidth
        const y2 = y1 + sectionHeight

        blocks.push({
          points: [
            { x: x1, y: y1 },
            { x: x2, y: y1 },
            { x: x2 + sectionHeight, y: y2 },
            { x: x1 + sectionHeight, y: y2 },
          ],
        })
      }
    }

    return blocks
  }

  // --- Drawing helpers (Canvas 2D API for performance) ---

  function drawPaintedBlock(
    c: CanvasRenderingContext2D,
    rect: RectBlock,
    blockColor: string,
    wobble: number,
    rng: () => number,
  ) {
    c.fillStyle = blockColor

    if (wobble <= 0) {
      c.fillRect(rect.x, rect.y, rect.w, rect.h)
      return
    }

    const maxWobble = wobble * 4
    const mw2 = maxWobble * 2
    const segments = 15
    c.beginPath()
    // Top edge
    c.moveTo(rect.x, rect.y + (rng() - 0.5) * mw2)
    for (let i = 1; i <= segments; i++) {
      c.lineTo(
        rect.x + (rect.w * i) / segments,
        rect.y + (rng() - 0.5) * mw2,
      )
    }
    // Right edge
    for (let i = 1; i <= segments; i++) {
      c.lineTo(
        rect.x + rect.w + (rng() - 0.5) * mw2,
        rect.y + (rect.h * i) / segments,
      )
    }
    // Bottom edge
    for (let i = 1; i <= segments; i++) {
      c.lineTo(
        rect.x + rect.w - (rect.w * i) / segments,
        rect.y + rect.h + (rng() - 0.5) * mw2,
      )
    }
    // Left edge
    for (let i = 1; i < segments; i++) {
      c.lineTo(
        rect.x + (rng() - 0.5) * mw2,
        rect.y + rect.h - (rect.h * i) / segments,
      )
    }
    c.closePath()
    c.fill()
  }

  function drawPaintedPolygon(
    c: CanvasRenderingContext2D,
    originalPoints: { x: number; y: number }[],
    blockColor: string,
    wobble: number,
    rng: () => number,
  ) {
    c.fillStyle = blockColor

    if (wobble <= 0) {
      c.beginPath()
      c.moveTo(originalPoints[0].x, originalPoints[0].y)
      for (let k = 1; k < originalPoints.length; k++) {
        c.lineTo(originalPoints[k].x, originalPoints[k].y)
      }
      c.closePath()
      c.fill()
      return
    }

    const maxWobble = wobble * 4
    const mw2 = maxWobble * 2
    const segments = 10
    c.beginPath()
    let first = true
    for (let i = 0; i < originalPoints.length; i++) {
      const p1 = originalPoints[i]
      const p2 = originalPoints[(i + 1) % originalPoints.length]
      const dx = p2.x - p1.x
      const dy = p2.y - p1.y
      for (let j = 0; j < segments; j++) {
        const t = j / segments
        const vx = p1.x + dx * t + (rng() - 0.5) * mw2
        const vy = p1.y + dy * t + (rng() - 0.5) * mw2
        if (first) { c.moveTo(vx, vy); first = false }
        else c.lineTo(vx, vy)
      }
    }
    c.closePath()
    c.fill()
  }

  function drawWobblyRectOutline(
    c: CanvasRenderingContext2D,
    rect: RectBlock,
    wobble: number,
    rng: () => number,
  ) {
    const w4 = wobble * 4
    c.beginPath()
    // Top edge
    c.moveTo(
      rect.x + (rng() - 0.5) * w4,
      rect.y + (rng() - 0.5) * w4,
    )
    for (let i = 1; i <= 10; i++) {
      c.lineTo(
        rect.x + (rect.w * i) / 10 + (rng() - 0.5) * w4,
        rect.y + (rng() - 0.5) * w4,
      )
    }
    // Right edge
    for (let i = 0; i <= 10; i++) {
      c.lineTo(
        rect.x + rect.w + (rng() - 0.5) * w4,
        rect.y + (rect.h * i) / 10 + (rng() - 0.5) * w4,
      )
    }
    // Bottom edge
    for (let i = 0; i <= 10; i++) {
      c.lineTo(
        rect.x + rect.w - (rect.w * i) / 10 + (rng() - 0.5) * w4,
        rect.y + rect.h + (rng() - 0.5) * w4,
      )
    }
    // Right-to-left on bottom already handled, now left edge going up
    for (let i = 0; i <= 10; i++) {
      c.lineTo(
        rect.x + (rng() - 0.5) * w4,
        rect.y + rect.h - (rect.h * i) / 10 + (rng() - 0.5) * w4,
      )
    }
    c.closePath()
    c.stroke()
  }

  // --- Post-processing effects ---
  function applyEffects(s: BlocksSettings) {
    const c = ctx()
    const d = p.pixelDensity()
    const w = p.width * d
    const h = p.height * d
    const imageData = c.getImageData(0, 0, w, h)
    let noiseMap: Float32Array | null = null
    let nmW = 0
    if (s.texture > 0) {
      const dims = `${w}|${h}|${d}`
      if (cachedNoiseMap && cachedNoiseMapDims === dims) {
        noiseMap = cachedNoiseMap
        nmW = cachedNoiseMapW
      } else {
        p.noiseSeed(42)
        const step = 2
        nmW = Math.ceil(w / (d * step))
        const nmH = Math.ceil(h / (d * step))
        noiseMap = new Float32Array(nmW * nmH)
        for (let ny = 0; ny < nmH; ny++) {
          const py = ny * step
          for (let nx = 0; nx < nmW; nx++) {
            const px = nx * step
            const fine = p.noise(px * 0.5, py * 0.5) - 0.5
            const med = p.noise(px * 0.08 + 100, py * 0.08 + 100) - 0.5
            const coarse = p.noise(px * 0.02 + 200, py * 0.02 + 200) - 0.5
            noiseMap[ny * nmW + nx] = (fine * 0.4 + med * 0.35 + coarse * 0.25) * 2
          }
        }
        cachedNoiseMap = noiseMap
        cachedNoiseMapW = nmW
        cachedNoiseMapDims = dims
      }
    }
    const thisRevision = revision
    // Paint geometry immediately, defer CPU-bound pixel work until the slider settles.
    effectTimer = setTimeout(() => {
      effectTimer = null
      if (disposed || thisRevision !== revision) return
      function fallback() {
        if (disposed || thisRevision !== revision) return
        // A failed Worker may already own the transferred buffer.
        const current = c.getImageData(0,0,w,h)
        processBlocksPixels(current.data,w,h,d,s,noiseMap,nmW)
        c.putImageData(current,0,0)
        onFrameReady?.()
      }
      try {
        worker = new Worker(new URL('./effects.worker.ts', import.meta.url), {type:'module'})
        worker.onmessage = (event: MessageEvent<{id:number;pixels:ArrayBuffer;width:number;height:number}>) => {
          if (disposed || event.data.id !== revision) return
          const pixels = new Uint8ClampedArray(event.data.pixels)
          c.putImageData(new ImageData(pixels,event.data.width,event.data.height),0,0)
          worker?.terminate()
          worker = null
          onFrameReady?.()
        }
        worker.onerror = () => {
          worker?.terminate()
          worker = null
          fallback()
        }
        worker.postMessage({
          id:thisRevision, width:w,height:h,density:d,
          pixels:imageData.data.buffer, settings:s, noiseMap, noiseMapWidth:nmW,
        }, [imageData.data.buffer])
      } catch {
        worker?.terminate()
        worker = null
        fallback()
      }
    }, 70)
  }
}
