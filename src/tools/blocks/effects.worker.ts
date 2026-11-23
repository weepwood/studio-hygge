
import { processBlocksPixels } from "./effects"
import type { BlocksSettings } from "./types"
type Job = { id: number; width: number; height: number; density: number;
  pixels: ArrayBuffer; settings: BlocksSettings; noiseMap: Float32Array | null; noiseMapWidth: number }
self.onmessage = (event: MessageEvent<Job>) => {
  const {id,width,height,density,pixels,settings,noiseMap,noiseMapWidth} = event.data
  const data = new Uint8ClampedArray(pixels)
  processBlocksPixels(data,width,height,density,settings,noiseMap,noiseMapWidth)
  self.postMessage({id,width,height,pixels:data.buffer}, {transfer:[data.buffer]})
}
