import { useEffect, useMemo, useRef, useState } from "react"
import { useSettings } from "@/hooks/use-settings"
import { CanvasArea } from "@/components/canvas-area"
import { CanvasToolbar } from "@/components/canvas-toolbar"
import { downloadBlob, waitForPaint } from "@/lib/export-blob"
import { renderMarblePNG } from "./export"
import { CanvasRenderFeedback, type RenderStatus } from "@/components/canvas-render-feedback"
import { scheduleAfterPaint } from "@/lib/schedule-after-paint"
import { Sidebar } from "@/components/sidebar"
import { Section } from "@/components/controls/section"
import { SliderControl } from "@/components/controls/slider-control"
import { SwitchControl } from "@/components/controls/switch-control"
import { ColorControl } from "@/components/controls/color-control"
import { useShortcutActions } from "@/hooks/use-shortcut-actions"
import { generateFilename, createRecorder, type Recorder } from "@/lib/export"
import { CanvasSizeControl } from "@/components/controls/canvas-size-control"
import { resolveCanvasSize, resolvePreviewSize, type PreviewQuality, type CanvasPreset } from "@/lib/canvas-size"
import type { MarbleSettings } from "./types"
import { DEFAULTS, randomizeColors } from "./types"
import { createMarbleEngine } from "./engine"
import type { MarbleEngine } from "./engine"

const MAX_RECORDING_DIM = 1080
const MAX_RECORDING_MS = 60_000

export default function Marble() {
  const [settings, update, reset, undo, redo, canUndo, canRedo] = useSettings<MarbleSettings>("marble", DEFAULTS)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<MarbleEngine | null>(null)
  const recorderRef = useRef<Recorder | null>(null)
  const recordTimerRef = useRef<number | null>(null)
  const startingRef = useRef(false)
  const mountedRef = useRef(false)
  const exportBusyRef = useRef(false)
  const [quality, setQuality] = useState<PreviewQuality>('auto')
  const [zoom, setZoom] = useState(1)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [renderStatus, setRenderStatus] = useState<RenderStatus>("loading")
  const previewSettings = useMemo(() => {
    const [w,h] = resolvePreviewSize(resolveCanvasSize(settings.canvasPreset, settings.customWidth, settings.customHeight), quality)
    return {...settings,canvasPreset:'custom' as CanvasPreset,customWidth:w,customHeight:h}
  }, [settings, quality])
  const settingsRef = useRef(previewSettings)
  settingsRef.current = previewSettings

  // Mount React controls first. Compiling shaders starts only after the first paint.
  useEffect(() => {
    let disposed = false
    mountedRef.current = true
    const canvas = canvasRef.current
    if (!canvas) return
    function initialize() {
      if (disposed || !canvas) return
      engineRef.current?.destroy()
      engineRef.current = null
      const current = settingsRef.current
      const [w, h] = resolveCanvasSize(current.canvasPreset, current.customWidth, current.customHeight)
      canvas.width = w
      canvas.height = h
      setRenderStatus('loading')
      try {
        const engine = createMarbleEngine(canvas, settingsRef, recorderRef, () => {
          if (!disposed) setRenderStatus('ready')
        })
        if (disposed) engine?.destroy()
        else {
          engineRef.current = engine
          if (!engine) setRenderStatus('error')
        }
      } catch(error) {
        console.error('Unable to initialize Marble:',error)
        if (!disposed) setRenderStatus('error')
      }
    }
    function contextLost(event: Event) {
      event.preventDefault()
      if (recordTimerRef.current !== null) window.clearTimeout(recordTimerRef.current)
      recorderRef.current?.cancel()
      recorderRef.current = null
      setIsRecording(false)
      engineRef.current?.destroy()
      engineRef.current = null
      setRenderStatus('error')
    }
    function contextRestored() { initialize() }
    canvas.addEventListener('webglcontextlost',contextLost)
    canvas.addEventListener('webglcontextrestored',contextRestored)
    const cancelScheduled = scheduleAfterPaint(initialize)
    return () => {
      disposed = true
      mountedRef.current = false
      cancelScheduled()
      canvas.removeEventListener('webglcontextlost',contextLost)
      canvas.removeEventListener('webglcontextrestored',contextRestored)
      if (recordTimerRef.current !== null) window.clearTimeout(recordTimerRef.current)
      recorderRef.current?.cancel()
      recorderRef.current = null
      engineRef.current?.destroy()
      engineRef.current = null
    }
  }, [])

  // Re-render when settings change (starts/stops animation loop as needed)
  useEffect(() => {
    engineRef.current?.requestRender()
  }, [previewSettings])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("studio:actions-changed", { detail: { isRecording } }))
  }, [isRecording])

  // Resize canvas when size settings change
  useEffect(() => {
    const [w,h] = resolveCanvasSize(previewSettings.canvasPreset, previewSettings.customWidth, previewSettings.customHeight)
    engineRef.current?.resize(w, h)
  }, [previewSettings.canvasPreset, previewSettings.customWidth, previewSettings.customHeight])

  function randomize() {
    update({
      ...randomizeColors(),
      noiseScale: 0.5 + Math.random() * 2.5,
      windSpeed: 0.01 + Math.random() * 0.49,
      warpPower: Math.random(),
      fbmStrength: 0.1 + Math.random() * 2.9,
      fbmDamping: 0.1 + Math.random() * 0.9,
      watercolorDetail: 1 + Math.random() * 29,
      watercolorWarp: Math.random() * 0.1,
      blurRadius: 0.1 + Math.random() * 2.9,
      veinIntensity: Math.random() > 0.5 ? Math.random() * 0.8 : 0,
      veinScale: 1 + Math.random() * 9,
      veinColor: randomizeColors().colorLow,
    })
  }

  function download() {
    if (exportBusyRef.current) return
    exportBusyRef.current = true
    setExporting(true)
    setExportError(null)
    void (async () => {
      try {
        await waitForPaint()
        const blob = await renderMarblePNG(settings)
        downloadBlob(blob, generateFilename('marble','png'))
      } catch(error) {
        setExportError(error instanceof Error ? error.message : 'Unable to export')
        console.error('Marble export failed',error)
      } finally {
        exportBusyRef.current = false
        setExporting(false)
      }
    })()
  }

  async function stopRecording() {
    const recorder = recorderRef.current
    if (!recorder) return
    recorderRef.current = null
    if (recordTimerRef.current !== null) window.clearTimeout(recordTimerRef.current)
    recordTimerRef.current = null
    setIsRecording(false)
    setExporting(true)
    try {
      const blob = await recorder.stop()
      downloadBlob(blob, generateFilename('marble','mp4'))
    } catch(error) {
      setExportError(error instanceof Error ? error.message : 'Recording failed')
      console.error('Recording stop error',error)
      recorder.cancel()
    } finally {
      setExporting(false)
    }
  }

  async function toggleRecording() {
    if (recorderRef.current) {
      await stopRecording()
      return
    }
    if (startingRef.current) return
    startingRef.current = true
    setExportError(null)
    try {
      if (typeof VideoEncoder === 'undefined') throw new Error('VideoEncoder not available in this browser')
      const [sourceW,sourceH] = resolvePreviewSize(
        resolveCanvasSize(previewSettings.canvasPreset,previewSettings.customWidth,previewSettings.customHeight),'detail')
      const scale = Math.min(1,MAX_RECORDING_DIM/Math.max(sourceW,sourceH))
      const recW = (Math.round(sourceW*scale) & ~1)
      const recH = (Math.round(sourceH*scale) & ~1)
      const pixels = recW * recH
      const bitrate = Math.max(2_000_000, Math.round(5_000_000 * pixels / (1920 * 1080)))
      const supported = await VideoEncoder.isConfigSupported({
        codec:'avc1.640028',width:recW,height:recH,bitrate,framerate:30,
      })
      if (!supported.supported) throw new Error('H.264 encoding is unsupported on this device')
      if (!mountedRef.current) return
      const recorder = createRecorder({width:recW,height:recH,sourceWidth:sourceW,sourceHeight:sourceH,fps:30,bitrate})
      if (!recorder) throw new Error('Recorder is unavailable')
      recorder.start()
      recorderRef.current = recorder
      setIsRecording(true)
      if (!settings.animated) update({animated:true})
      recordTimerRef.current = window.setTimeout(() => {void stopRecording()}, MAX_RECORDING_MS)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Unable to record')
      console.error('Recording start error',error)
    } finally {
      startingRef.current = false
    }
  }

  useShortcutActions({ randomize, reset, undo, redo, download, toggleRecording })

  return (
    <>
      <Sidebar>
        <h2 className="mb-3 text-base font-medium text-text-primary">Marble</h2>
        <div className="flex flex-col gap-4">
          <Section title="Canvas">
            <CanvasSizeControl
              preset={settings.canvasPreset}
              customWidth={settings.customWidth}
              customHeight={settings.customHeight}
              onPresetChange={(v) => update({ canvasPreset: v as CanvasPreset })}
              onWidthChange={(v) => update({ customWidth: v })}
              onHeightChange={(v) => update({ customHeight: v })}
            />
          </Section>

          <Section title="Colors" defaultOpen>
            <ColorControl
              label="Main"
              value={settings.colorMain}
              onChange={(v) => update({ colorMain: v })}
            />
            <ColorControl
              label="Low"
              value={settings.colorLow}
              onChange={(v) => update({ colorLow: v })}
            />
            <ColorControl
              label="Mid"
              value={settings.colorMid}
              onChange={(v) => update({ colorMid: v })}
            />
            <ColorControl
              label="High"
              value={settings.colorHigh}
              onChange={(v) => update({ colorHigh: v })}
            />
          </Section>

          <Section title="Fluid">
            <SliderControl
              label="Noise Scale"
              value={settings.noiseScale}
              min={0.5}
              max={3}
              step={0.05}
              onChange={(v) => update({ noiseScale: v })}
            />
            <SliderControl
              label="Wind Speed"
              value={settings.windSpeed}
              min={0.01}
              max={0.5}
              step={0.01}
              onChange={(v) => update({ windSpeed: v })}
            />
            <SliderControl
              label="Warp"
              value={settings.warpPower}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => update({ warpPower: v })}
            />
          </Section>

          <Section title="FBM">
            <SliderControl
              label="Strength"
              value={settings.fbmStrength}
              min={0.1}
              max={3}
              step={0.05}
              onChange={(v) => update({ fbmStrength: v })}
            />
            <SliderControl
              label="Damping"
              value={settings.fbmDamping}
              min={0.1}
              max={1}
              step={0.01}
              onChange={(v) => update({ fbmDamping: v })}
            />
          </Section>

          <Section title="Watercolor">
            <SliderControl
              label="Detail"
              value={settings.watercolorDetail}
              min={1}
              max={30}
              step={0.5}
              onChange={(v) => update({ watercolorDetail: v })}
            />
            <SliderControl
              label="Warp"
              value={settings.watercolorWarp}
              min={0}
              max={0.1}
              step={0.001}
              decimals={3}
              onChange={(v) => update({ watercolorWarp: v })}
            />
            <SliderControl
              label="Blur"
              value={settings.blurRadius}
              min={0.1}
              max={3}
              step={0.05}
              onChange={(v) => update({ blurRadius: v })}
            />
          </Section>

          <Section title="Veins">
            <SliderControl
              label="Intensity"
              value={settings.veinIntensity}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => update({ veinIntensity: v })}
            />
            {settings.veinIntensity > 0 && (
              <>
                <SliderControl
                  label="Scale"
                  value={settings.veinScale}
                  min={1}
                  max={10}
                  step={0.1}
                  onChange={(v) => update({ veinScale: v })}
                />
                <ColorControl
                  label="Color"
                  value={settings.veinColor}
                  onChange={(v) => update({ veinColor: v })}
                />
              </>
            )}
          </Section>

          <Section title="Texture">
            <SliderControl
              label="Grain"
              value={settings.grain}
              min={0}
              max={100}
              step={1}
              onChange={(v) => update({ grain: v })}
            />
          </Section>

          <Section title="Animation">
            <SwitchControl
              label="Animate"
              checked={settings.animated}
              onChange={(v) => update({ animated: v })}
            />
            {settings.animated && (
              <SliderControl
                label="Speed"
                value={settings.speed}
                min={0.1}
                max={3}
                step={0.05}
                onChange={(v) => update({ speed: v })}
              />
            )}
          </Section>
        </div>
      </Sidebar>
      <CanvasArea className="preview-stage" style={{'--preview-zoom':zoom} as React.CSSProperties}>
        <canvas ref={canvasRef} style={{maxWidth:'100%', maxHeight:'100%'}} />
        <CanvasRenderFeedback status={renderStatus} />
        <CanvasToolbar onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo} zoom={zoom} onZoomChange={setZoom} quality={quality} onQualityChange={setQuality} exporting={exporting} recording={isRecording} exportError={exportError} />
      </CanvasArea>
    </>
  )
}
