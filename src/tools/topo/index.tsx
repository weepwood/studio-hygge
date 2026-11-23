import { useCallback, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type p5 from 'p5'
import { useSettings } from '@/hooks/use-settings'
import { useP5 } from '@/hooks/use-p5'
import { exportSVG, generateFilename } from '@/lib/export'
import { CanvasArea } from '@/components/canvas-area'
import { CanvasToolbar } from '@/components/canvas-toolbar'
import { resolveCanvasSize, resolvePreviewSize, type PreviewQuality } from '@/lib/canvas-size'
import { withExportSketch } from '@/lib/export-p5'
import { canvasPNG, downloadBlob, waitForPaint } from '@/lib/export-blob'
import { CanvasRenderFeedback, type RenderStatus } from '@/components/canvas-render-feedback'
import { Sidebar } from '@/components/sidebar'
import { Section } from '@/components/controls/section'
import { SliderControl } from '@/components/controls/slider-control'
import { SelectControl } from '@/components/controls/select-control'
import { ColorControl } from '@/components/controls/color-control'
import { useShortcutActions } from '@/hooks/use-shortcut-actions'
import { CanvasSizeControl } from '@/components/controls/canvas-size-control'
import type { CanvasPreset } from '@/lib/canvas-size'
import { createTopoSketch } from './sketch'
import { generateTopoSvg } from './svg'
import type { TopoSettings, TopoGeometry } from './types'

const DEFAULTS: TopoSettings = {
  seed: 12345,
  contourLevels: 20,
  noiseScale: 0.008,
  octaves: 4,
  falloff: 0.5,
  strokeWeight: 1.5,
  wobble: 0,
  roughness: 0,
  smoothing: 50,
  bgColor: '#faf7f2',
  colorMode: 'palette',
  lineColor: '#7d5b3a',
  palette: 'hygge',
  opacity: 100,
  grain: 0,
  margin: 20,
  canvasPreset: 'square',
  customWidth: 2048,
  customHeight: 2048,
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function randomColor(): string {
  const hues = [22, 34, 42, 105, 142, 198]
  const h = hues[Math.floor(Math.random() * hues.length)] + Math.floor(Math.random() * 17 - 8)
  const s = Math.floor(Math.random() * 28 + 22)
  const l = Math.floor(Math.random() * 32 + 28)
  return hslToHex(h, s, l)
}

export default function Topo() {
  const [renderStatus, setRenderStatus] = useState<RenderStatus>('loading')
  const containerRef = useRef<HTMLDivElement>(null)
  const geometryRef = useRef<TopoGeometry | null>(null)
  const [settings, update, reset, undo, redo, canUndo, canRedo] = useSettings<TopoSettings>('topo', DEFAULTS)
  const [quality, setQuality] = useState<PreviewQuality>('balanced')
  const [zoom, setZoom] = useState(1)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const exportBusyRef = useRef(false)
  const previewSettings = useMemo(() => {
    const [w, h] = resolvePreviewSize(resolveCanvasSize(settings.canvasPreset, settings.customWidth, settings.customHeight), quality)
    return {...settings, canvasPreset: 'custom' as CanvasPreset, customWidth:w, customHeight:h}
  }, [settings, quality])
  async function runExport(task: () => Promise<void>) {
    if (exportBusyRef.current) return
    exportBusyRef.current = true
    setExporting(true)
    setExportError(null)
    try {
      await waitForPaint()
      await task()
    } catch(error) {
      console.error('Export failed:',error)
      setExportError(error instanceof Error ? error.message : 'Export failed')
    } finally {
      exportBusyRef.current = false
      setExporting(false)
    }
  }
  const sketchFn = useCallback(
    (p: p5, settingsRef: RefObject<TopoSettings>) => createTopoSketch(p, settingsRef, geometryRef),
    [],
  )
  useP5(containerRef, sketchFn, previewSettings, {
    onReady: () => setRenderStatus('ready'),
    onError: () => setRenderStatus('error'),
  })
  const hasRasterEffects = settings.grain > 0
  useShortcutActions({
    randomize,
    reset,
    undo,
    redo,
    download: hasRasterEffects ? handleExportPNG : handleExportSVG,
    exportPng: handleExportPNG,
    exportSvg: handleExportSVG,
  })

  function randomize() {
    const paletteNames = ['topo', 'earth', 'forest', 'hygge']
    let colorMode: TopoSettings['colorMode'] = 'single'
    let lineColor = settings.lineColor
    let palette = settings.palette

    const r = Math.random()
    if (r > 0.4) {
      colorMode = 'palette'
      palette = paletteNames[Math.floor(Math.random() * paletteNames.length)]
    } else if (r > 0.2) {
      colorMode = 'elevation'
      lineColor = randomColor()
    } else {
      colorMode = 'single'
      lineColor = randomColor()
    }

    let bgColor: string
    if (Math.random() > 0.2) {
      const backgrounds = ['#faf7f2', '#f7f2e7', '#f0eae0', '#ede6da']
      bgColor = backgrounds[Math.floor(Math.random() * backgrounds.length)]
    } else {
      bgColor = Math.random() > 0.5 ? '#5b3a29' : '#445243'
    }

    const hasTexture = Math.random() > 0.7

    update({
      seed: Math.floor(Math.random() * 99999),
      contourLevels: Math.floor(Math.random() * 27 + 8),
      noiseScale: Math.random() * 0.012 + 0.003,
      octaves: Math.floor(Math.random() * 4 + 2),
      falloff: Math.random() * 0.3 + 0.35,
      strokeWeight: Math.random() * 2.2 + 0.8,
      wobble: hasTexture ? Math.floor(Math.random() * 25 + 5) : 0,
      roughness: hasTexture ? Math.floor(Math.random() * 15) : 0,
      smoothing: Math.floor(Math.random() * 50 + 30),
      bgColor,
      colorMode,
      lineColor,
      palette,
      opacity: Math.floor(Math.random() * 30 + 70),
      grain: Math.random() > 0.5 ? Math.floor(Math.random() * 15 + 5) : 0,
      margin: Math.floor(Math.random() * 40 + 10),
    })
  }

  function handleExportSVG() {
    void runExport(() => withExportSketch<TopoSettings, TopoGeometry, void>(
      settings, createTopoSketch, (_canvas, geo) => {
        if (!geo) throw new Error('Vector geometry is not ready')
        const svg = generateTopoSvg(geo, settings)
        if (!svg) throw new Error('Unable to generate SVG')
        exportSVG(svg, generateFilename('topo', 'svg'))
      },
    ))
  }

  function handleExportPNG() {
    void runExport(() => withExportSketch<TopoSettings, TopoGeometry, void>(
      settings, createTopoSketch, async (canvas) => {
        const blob = await canvasPNG(canvas)
        downloadBlob(blob, generateFilename('topo', 'png'))
      },
    ))
  }

  return (
    <>
      <Sidebar>
        <h2 className="mb-3 text-base font-medium text-text-primary">Topo</h2>

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

        <Section title="Terrain">
          <SliderControl
            label="Seed"
            value={settings.seed}
            min={0}
            max={99999}
            step={1}
            onChange={(v) => update({ seed: v })}
          />
          <SliderControl
            label="Contour Levels"
            value={settings.contourLevels}
            min={5}
            max={50}
            step={1}
            onChange={(v) => update({ contourLevels: v })}
          />
          <SliderControl
            label="Noise Scale"
            value={settings.noiseScale}
            min={0.002}
            max={0.020}
            step={0.001}
            decimals={3}
            onChange={(v) => update({ noiseScale: v })}
          />
          <SliderControl
            label="Octaves"
            value={settings.octaves}
            min={1}
            max={6}
            step={1}
            onChange={(v) => update({ octaves: v })}
          />
          <SliderControl
            label="Falloff"
            value={settings.falloff}
            min={0.30}
            max={0.70}
            step={0.01}
            decimals={2}
            onChange={(v) => update({ falloff: v })}
          />
        </Section>

        <Section title="Stroke">
          <SliderControl
            label="Weight"
            value={settings.strokeWeight}
            min={0.5}
            max={5.0}
            step={0.1}
            decimals={1}
            onChange={(v) => update({ strokeWeight: v })}
          />
          <SliderControl
            label="Wobble"
            value={settings.wobble}
            min={0}
            max={50}
            step={1}
            onChange={(v) => update({ wobble: v })}
          />
          <SliderControl
            label="Roughness"
            value={settings.roughness}
            min={0}
            max={30}
            step={1}
            onChange={(v) => update({ roughness: v })}
          />
          <SliderControl
            label="Smoothing"
            value={settings.smoothing}
            min={0}
            max={100}
            step={1}
            onChange={(v) => update({ smoothing: v })}
          />
        </Section>

        <Section title="Color">
          <ColorControl
            label="Background"
            value={settings.bgColor}
            onChange={(v) => update({ bgColor: v })}
          />
          <SelectControl
            label="Mode"
            value={settings.colorMode}
            options={[
              { value: 'single', label: 'Single' },
              { value: 'elevation', label: 'Elevation' },
              { value: 'palette', label: 'Palette' },
            ]}
            onChange={(v) => update({ colorMode: v as TopoSettings['colorMode'] })}
          />
          {(settings.colorMode === 'single' || settings.colorMode === 'elevation') && (
            <ColorControl
              label="Line Color"
              value={settings.lineColor}
              onChange={(v) => update({ lineColor: v })}
            />
          )}
          {settings.colorMode === 'palette' && (
            <SelectControl
              label="Palette"
              value={settings.palette}
              options={[
                { value: 'mono', label: 'Mono' },
                { value: 'topo', label: 'Topo' },
                { value: 'ocean', label: 'Ocean' },
                { value: 'earth', label: 'Earth' },
                { value: 'sunset', label: 'Sunset' },
                { value: 'forest', label: 'Forest' },
                { value: 'hygge', label: 'Hygge' },
                { value: 'heat', label: 'Heat' },
              ]}
              onChange={(v) => update({ palette: v })}
            />
          )}
          <SliderControl
            label="Opacity"
            value={settings.opacity}
            min={10}
            max={100}
            step={1}
            unit="%"
            onChange={(v) => update({ opacity: v })}
          />
        </Section>

        <Section title="Effects">
          <SliderControl
            label="Grain"
            value={settings.grain}
            min={0}
            max={50}
            step={1}
            onChange={(v) => update({ grain: v })}
          />
          <SliderControl
            label="Margin"
            value={settings.margin}
            min={0}
            max={100}
            step={1}
            onChange={(v) => update({ margin: v })}
          />
        </Section>

      </Sidebar>
      <CanvasArea ref={containerRef} className="preview-stage" style={{'--preview-zoom':zoom} as React.CSSProperties}>
        <CanvasRenderFeedback status={renderStatus} />
        <CanvasToolbar onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo} zoom={zoom} onZoomChange={setZoom} quality={quality} onQualityChange={setQuality} exporting={exporting} exportError={exportError} />
      </CanvasArea>
    </>
  )
}
