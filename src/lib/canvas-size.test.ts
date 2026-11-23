
import {describe,it,expect} from "vitest"
import {resolvePreviewSize, resolveCanvasSize, MAX_EXPORT_PIXELS} from "./canvas-size"
describe("preview resolution",()=>{
 it("preserves ratio while bounding preview work",()=>{
   expect(resolvePreviewSize([3840,2160],"balanced")).toEqual([1120,630])
   expect(resolvePreviewSize([400,300],"detail")).toEqual([400,300])
 })
 it("rejects pathological custom dimensions",()=>{
   const [w,h]=resolveCanvasSize("custom",9999999,9999999)
   expect(w*h).toBeLessThanOrEqual(MAX_EXPORT_PIXELS)
   expect(w).toBeGreaterThan(0)
 })
})
