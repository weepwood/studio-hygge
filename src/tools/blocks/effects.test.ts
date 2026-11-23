
import { describe, expect, it } from "vitest"
import { processBlocksPixels } from "./effects"
import type { BlocksSettings } from "./types"
const base = {seed:42,texture:0,grain:70,halftone:0,halftoneSize:4,
  halftoneMisalign:20,halftoneAngle:15} as BlocksSettings
function input() {
  const pixels = new Uint8ClampedArray(4*5*4)
  for (let i=0;i<pixels.length;i+=4) {
    pixels[i]=128; pixels[i+1]=90; pixels[i+2]=40; pixels[i+3]=255
  }
  return pixels
}
describe("Blocks pixel processing",()=>{
 it("reproduces grain for the same seed across repeated renders",()=>{
   const a=input(),b=input()
   processBlocksPixels(a,5,4,1,base,null,0)
   processBlocksPixels(b,5,4,1,base,null,0)
   expect(a).toEqual(b)
   expect([...a]).not.toEqual([...input()])
 })
 it("preserves alpha and works without grain",()=>{
   const a=input()
   processBlocksPixels(a,5,4,1,{...base,grain:0,halftone:0},null,0)
   expect(a).toEqual(input())
 })
 it("applies halftone without requiring a noise map",()=>{
   const a=input()
   processBlocksPixels(a,5,4,1,{...base,grain:0,halftone:70},null,0)
   expect([...a]).not.toEqual([...input()])
   for(let i=3;i<a.length;i+=4) expect(a[i]).toBe(255)
 })
})
