
import type { BlocksSettings } from "./types"
/** Shared pixel kernel for Worker and for browsers without Worker support. */
export function processBlocksPixels(
  data: Uint8ClampedArray, w: number, h: number, d: number,
  s: BlocksSettings, noiseMap: Float32Array | null, nmW: number,
): void {
  const textureStrength = s.texture / 100
  const grainStrength = s.grain / 100
  const halftoneStrength = s.halftone / 100
  const textureVariation = textureStrength * 50
  const grainVariation = grainStrength * 35
  if (textureStrength > 0 || grainStrength > 0) {
      const invD2 = 1 / (d * 2)
      const hasGrain = grainStrength > 0
      const grainScale = grainVariation * 2

      for (let y = 0; y < h; y++) {
        const rowOffset = y * w * 4
        const ny = (y * invD2) | 0
        const noiseRowOffset = ny * nmW
        for (let x = 0; x < w; x++) {
          const i = rowOffset + x * 4
          let variation = 0

          if (noiseMap) {
            const nx = (x * invD2) | 0
            variation += noiseMap[noiseRowOffset + nx] * textureVariation
          }

          if (hasGrain) {
            variation += (Math.random() - 0.5) * grainScale
          }

          // Ternary clamp avoids Math.min/Math.max function call overhead
          let v = data[i] + variation
          data[i] = v > 255 ? 255 : v < 0 ? 0 : v
          v = data[i + 1] + variation
          data[i + 1] = v > 255 ? 255 : v < 0 ? 0 : v
          v = data[i + 2] + variation
          data[i + 2] = v > 255 ? 255 : v < 0 ? 0 : v
        }
      }
    }

    // Halftone pass
    if (halftoneStrength > 0) {
      const originalData = new Uint8ClampedArray(data)
      const dotSpacing = s.halftoneSize * 2
      const maxDotSize = dotSpacing * 0.9
      const maxDotSizeSq = maxDotSize * maxDotSize
      const halftoneAngle = s.halftoneAngle * (Math.PI / 180)
      const misalign = (s.halftoneMisalign / 100) * 4
      // Pre-compute offsets × pixelDensity
      const cyanOX = -misalign * d
      const cyanOY = misalign * 0.7 * d
      const magentaOX = misalign * 0.8 * d
      const magentaOY = -misalign * 0.5 * d
      const yellowOX = misalign * 0.3 * d
      const yellowOY = misalign * d

      const paperR = 252
      const paperG = 250
      const paperB = 245

      const cosA = Math.cos(halftoneAngle)
      const sinA = Math.sin(halftoneAngle)
      const centerX = dotSpacing / 2
      const centerY = dotSpacing / 2

      const blend = halftoneStrength * 0.7
      const wMinus1 = w - 1
      const hMinus1 = h - 1
      const inv255 = 1 / 255

      for (let y = 0; y < h; y++) {
        const rowOffset = y * w
        const rotYsinA = y * sinA
        const rotYcosA = y * cosA
        for (let x = 0; x < w; x++) {
          const i = (rowOffset + x) * 4
          const rotX = x * cosA - rotYsinA
          const rotY = x * sinA + rotYcosA
          const gridX = ((rotX % dotSpacing) + dotSpacing) % dotSpacing
          const gridY = ((rotY % dotSpacing) + dotSpacing) % dotSpacing
          const dx = gridX - centerX
          const dy = gridY - centerY
          // Compare dist² instead of dist to avoid sqrt
          const distSq = dx * dx + dy * dy

          // Inline color sampling — avoids closure + object allocation per call
          let sx: number, sy: number, si: number

          sx = x + cyanOX
          sx = sx > wMinus1 ? wMinus1 : sx < 0 ? 0 : sx | 0
          sy = y + cyanOY
          sy = sy > hMinus1 ? hMinus1 : sy < 0 ? 0 : sy | 0
          si = (sy * w + sx) * 4
          const cyan = 255 - originalData[si]

          sx = x + magentaOX
          sx = sx > wMinus1 ? wMinus1 : sx < 0 ? 0 : sx | 0
          sy = y + magentaOY
          sy = sy > hMinus1 ? hMinus1 : sy < 0 ? 0 : sy | 0
          si = (sy * w + sx) * 4
          const magenta = 255 - originalData[si + 1]

          sx = x + yellowOX
          sx = sx > wMinus1 ? wMinus1 : sx < 0 ? 0 : sx | 0
          sy = y + yellowOY
          sy = sy > hMinus1 ? hMinus1 : sy < 0 ? 0 : sy | 0
          si = (sy * w + sx) * 4
          const yellow = 255 - originalData[si + 2]

          si = (rowOffset + x) * 4
          const bkR = 255 - originalData[si]
          const bkG = 255 - originalData[si + 1]
          const bkB = 255 - originalData[si + 2]
          const black = bkR < bkG ? (bkR < bkB ? bkR : bkB) : (bkG < bkB ? bkG : bkB)

          // Compare dot size² against dist² to avoid sqrt
          const cyanDotSq = (cyan * inv255) * (cyan * inv255) * maxDotSizeSq
          const magentaDotSq = (magenta * inv255) * (magenta * inv255) * maxDotSizeSq
          const yellowDotSq = (yellow * inv255) * (yellow * inv255) * maxDotSizeSq
          const blackDotSq = (black * inv255) * 0.7 * (black * inv255) * 0.7 * maxDotSizeSq

          let finalR = paperR
          let finalG = paperG
          let finalB = paperB

          if (distSq < cyanDotSq) { finalR -= 200; finalG -= 30; finalB -= 20 }
          if (distSq < magentaDotSq) { finalR -= 30; finalG -= 180; finalB -= 30 }
          if (distSq < yellowDotSq) { finalR -= 10; finalG -= 20; finalB -= 200 }
          if (distSq < blackDotSq) { finalR -= 60; finalG -= 60; finalB -= 60 }

          finalR = finalR > 255 ? 255 : finalR < 0 ? 0 : finalR
          finalG = finalG > 255 ? 255 : finalG < 0 ? 0 : finalG
          finalB = finalB > 255 ? 255 : finalB < 0 ? 0 : finalB

          data[i] = data[i] + (finalR - data[i]) * blend
          data[i + 1] = data[i + 1] + (finalG - data[i + 1]) * blend
          data[i + 2] = data[i + 2] + (finalB - data[i + 2]) * blend
        }
      }
    }
}
