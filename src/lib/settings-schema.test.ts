
import { describe, it, expect } from "vitest"
import { sanitizeSettings } from "./settings-schema"
const defaults = {seed:123, canvasPreset:'square', customWidth:800, customHeight:800,
  colorMode:'palette', bgColor:'#ffffff', contourLevels:20, grain:0}
describe("untrusted settings", () => {
 it("clamps huge dimensions and costly controls", () => {
   const s = sanitizeSettings("topo",{customWidth:1e12,customHeight:Infinity,contourLevels:50000,seed:-1,grain:1e9},defaults)
   expect(s.customWidth).toBe(3840);expect(s.customHeight).toBe(800)
   expect(s.contourLevels).toBe(50);expect(s.seed).toBe(0);expect(s.grain).toBe(50)
 })
 it("rejects invalid enum, colors, and prototype pollution keys", () => {
   const s = sanitizeSettings("topo",JSON.parse('{"canvasPreset":"evil","bgColor":"red;","colorMode":"evil","__proto__":{"polluted":true}}'),defaults)
   expect(s.canvasPreset).toBe('square')
   expect(s.bgColor).toBe('#ffffff')
   expect(s.colorMode).toBe('palette')
   expect(Object.prototype.hasOwnProperty.call(s,'polluted')).toBe(false)
 })
 it("accepts valid inputs and does not modify defaults", () => {
   const s = sanitizeSettings("topo",{canvasPreset:"custom",colorMode:"single",bgColor:"#123abc"}, defaults)
   expect(s).toMatchObject({canvasPreset:"custom",colorMode:"single",bgColor:"#123abc"})
   expect(defaults.colorMode).toBe('palette')
 })
})
