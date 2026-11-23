
import { describe, expect, it } from "vitest"
import { settingsFromBase64Url, settingsToBase64Url } from "./url-settings"
describe("URL-based settings",()=>{
 it("roundtrips simple objects",()=>{
   const s={seed:42,canvasPreset:'square',grain:3}
   expect(settingsFromBase64Url(settingsToBase64Url(s))).toEqual(s)
 })
 it("rejects malformed or huge inputs",()=>{
   expect(settingsFromBase64Url("not-base64***")).toBeNull()
   expect(settingsFromBase64Url("x".repeat(17000))).toBeNull()
   expect(settingsFromBase64Url(settingsToBase64Url([] as unknown as Record<string,unknown>))).toBeNull()
 })
})
