import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { createBlocksSketch, PALETTES } from './sketch'
import { generateBlocksSvg } from './svg'
import type { BlocksSettings, BlocksGeometry } from './types'

const DEFAULTS: BlocksSettings = {
  seed: 4242,
  bgColor: '#faf7f2',
  patternType: 'mondrian',
  blockCount: 6,
  complexity: 4,
  lineWeight: 0,
  rotation: 0,
  palette: 'hygge',
  colors: [...PALETTES.hygge],
  lineColor: '#5b3a29',
  canvasPreset: 'square',
  customWidth: 2048,
  customHeight: 2048,
  asymmetry: 50,
  colorDensity: 40,
  gridDivisions: 4,
  texture: 60,
  grain: 30,
  halftone: 0,
  halftoneSize: 4,
  halftoneMisalign: 30,
  halftoneAngle: 15,
  edgeWobble: 40,
}

export default function Blocks() {
  const [renderStatus, setRenderStatus] = useState<RenderStatus>('loading')
  const containerRef = useRef<HTMLDivElement>(null)
  const geometryRef = useRef<BlocksGeometry | null>(null)
  const [settings, update, reset, undo, redo, canUndo, canRedo] = useSettings<BlocksSettings>('blocks', DEFAULTS)
  const [quality, setQuality] = useState<PreviewQuality>('auto')
  const [zoom, setZoom] = useState(1)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const exportBusyRef = useRef(false)
  const previewSettings = useMemo(() => {
    const [fullW,fullH] = resolveCanvasSize(settings.canvasPreset, settings.customWidth, settings.customHeight)
    const [w, h] = resolvePreviewSize([fullW,fullH], quality)
    return {...settings, canvasPreset: 'custom' as CanvasPreset, customWidth:w, customHeight:h,
      lineWeight:settings.lineWeight*w/fullW}
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
    (p: p5, settingsRef: RefObject<BlocksSettings>) => createBlocksSketch(p, settingsRef, geometryRef, () => setRenderStatus('ready')),
    [],
  )
  useP5(containerRef, sketchFn, previewSettings, {
    onError: () => setRenderStatus('error'),
  })
  useEffect(() => setRenderStatus('loading'), [previewSettings])
  const hasRasterEffects = settings.texture > 0 || settings.grain > 0 || settings.halftone > 0
  useShortcutActions({
    randomize,
    reset,
    undo,
    redo,
    download: hasRasterEffects ? handleExportPNG : handleExportSVG,
    exportPng: handleExportPNG,
    exportSvg: handleExportSVG,
  })

  function handlePaletteChange(name: string) {
    if (name === 'custom') {
      update({ palette: 'custom' })
    } else {
      const pal = PALETTES[name]
      if (pal) {
        update({ palette: name, colors: [...pal] })
      }
    }
  }

  function handleColorChange(index: number, color: string) {
    const newColors = [...settings.colors]
    newColors[index] = color
    update({ colors: newColors, palette: 'custom' })
  }

  function randomize() {
    const patternTypes: BlocksSettings['patternType'][] = ['mondrian', 'grid', 'horizontal', 'diagonal']
    const paletteNames = Object.keys(PALETTES)
    const palName = paletteNames[Math.floor(Math.random() * paletteNames.length)]

    const bgColors = ['#faf7f2', '#f7f2e7', '#f0eae0', '#ede6da', '#e6d5c1']
    update({
      seed: Math.floor(Math.random() * 99999),
      bgColor: bgColors[Math.floor(Math.random() * bgColors.length)],
      patternType: patternTypes[Math.floor(Math.random() * patternTypes.length)],
      blockCount: Math.floor(Math.random() * 15) + 3,
      complexity: Math.floor(Math.random() * 7) + 1,
      lineWeight: Math.random() > 0.5 ? Math.floor(Math.random() * 5) : 0,
      rotation: Math.random() > 0.7 ? Math.floor(Math.random() * 30) : 0,
      palette: palName,
      colors: [...(PALETTES[palName] ?? DEFAULTS.colors)],
      asymmetry: Math.floor(Math.random() * 80) + 10,
      colorDensity: Math.floor(Math.random() * 70) + 15,
      gridDivisions: Math.floor(Math.random() * 6) + 3,
      texture: Math.floor(Math.random() * 80),
      grain: Math.floor(Math.random() * 50),
      halftone: Math.random() > 0.7 ? Math.floor(Math.random() * 60) : 0,
      edgeWobble: Math.floor(Math.random() * 70),
    })
  }

  function handleExportSVG() {
    void runExport(() => withExportSketch<BlocksSettings, BlocksGeometry, void>(
      settings, createBlocksSketch, (_canvas, geo) => {
        if (!geo) throw new Error('Vector geometry is not ready')
        const svg = generateBlocksSvg(geo, settings)
        if (!svg) throw new Error('Unable to generate SVG')
        exportSVG(svg, generateFilename('blocks', 'svg'))
      },
      true,
    ))
  }

  function handleExportPNG() {
    void runExport(() => withExportSketch<BlocksSettings, BlocksGeometry, void>(
      settings, createBlocksSketch, async (canvas) => {
        const blob = await canvasPNG(canvas)
        downloadBlob(blob, generateFilename('blocks', 'png'))
      },
      true,
    ))
  }

  return (
    <>
      <Sidebar>
        <h2 className="mb-3 text-base font-medium text-text-primary">Blocks</h2>

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

        <Section title="Pattern">
          <SliderControl
            label="Seed"
            value={settings.seed}
            min={0}
            max={99999}
            step={1}
            onChange={(v) => update({ seed: v })}
          />
          <SelectControl
            label="Pattern Type"
            value={settings.patternType}
            options={[
              { value: 'mondrian', label: 'Mondrian' },
              { value: 'grid', label: 'Grid' },
              { value: 'horizontal', label: 'Horizontal' },
              { value: 'diagonal', label: 'Diagonal' },
            ]}
            onChange={(v) => update({ patternType: v as BlocksSettings['patternType'] })}
          />
          {settings.patternType !== 'diagonal' && (
            <SliderControl
              label="Block Count"
              value={settings.blockCount}
              min={1}
              max={20}
              step={1}
              onChange={(v) => update({ blockCount: v })}
            />
          )}
          <SliderControl
            label="Complexity"
            value={settings.complexity}
            min={0}
            max={8}
            step={1}
            onChange={(v) => update({ complexity: v })}
          />
          {settings.patternType === 'grid' && (
            <SliderControl
              label="Grid Divisions"
              value={settings.gridDivisions}
              min={2}
              max={10}
              step={1}
              onChange={(v) => update({ gridDivisions: v })}
            />
          )}
          {(settings.patternType === 'mondrian' || settings.patternType === 'horizontal') && (
            <SliderControl
              label="Asymmetry"
              value={settings.asymmetry}
              min={0}
              max={100}
              step={1}
              onChange={(v) => update({ asymmetry: v })}
            />
          )}
        </Section>

        <Section title="Layout">
          <SliderControl
            label="Rotation"
            value={settings.rotation}
            min={0}
            max={360}
            step={1}
            unit="°"
            onChange={(v) => update({ rotation: v })}
          />
        </Section>

        <Section title="Color">
          <ColorControl
            label="Background"
            value={settings.bgColor}
            onChange={(v) => update({ bgColor: v })}
          />
          <SelectControl
            label="Palette"
            value={settings.palette}
            options={[
              { value: 'mondrian', label: 'Mondrian' },
              { value: 'neo-mondrian', label: 'Neo-Mondrian' },
              { value: 'warm', label: 'Warm' },
              { value: 'hygge', label: 'Hygge' },
              { value: 'cool', label: 'Cool' },
              { value: 'monochrome', label: 'Monochrome' },
              { value: 'custom', label: 'Custom' },
            ]}
            onChange={handlePaletteChange}
          />
          {settings.colors.map((c, i) => (
            <ColorControl
              key={i}
              label={`Color ${i + 1}`}
              value={c}
              onChange={(v) => handleColorChange(i, v)}
            />
          ))}
          <ColorControl
            label="Line Color"
            value={settings.lineColor}
            onChange={(v) => update({ lineColor: v })}
          />
          <SliderControl
            label="Color Density"
            value={settings.colorDensity}
            min={0}
            max={100}
            step={1}
            onChange={(v) => update({ colorDensity: v })}
          />
        </Section>

        <Section title="Stroke">
          <SliderControl
            label="Line Weight"
            value={settings.lineWeight}
            min={0}
            max={10}
            step={1}
            onChange={(v) => update({ lineWeight: v })}
          />
          <SliderControl
            label="Edge Wobble"
            value={settings.edgeWobble}
            min={0}
            max={100}
            step={1}
            onChange={(v) => update({ edgeWobble: v })}
          />
        </Section>

        <Section title="Effects">
          <SliderControl
            label="Texture"
            value={settings.texture}
            min={0}
            max={100}
            step={1}
            onChange={(v) => update({ texture: v })}
          />
          <SliderControl
            label="Grain"
            value={settings.grain}
            min={0}
            max={100}
            step={1}
            onChange={(v) => update({ grain: v })}
          />
          <SliderControl
            label="Halftone"
            value={settings.halftone}
            min={0}
            max={100}
            step={1}
            onChange={(v) => update({ halftone: v })}
          />
          {settings.halftone > 0 && (
            <>
              <SliderControl
                label="Halftone Size"
                value={settings.halftoneSize}
                min={1}
                max={12}
                step={1}
                onChange={(v) => update({ halftoneSize: v })}
              />
              <SliderControl
                label="Halftone Misalign"
                value={settings.halftoneMisalign}
                min={0}
                max={100}
                step={1}
                onChange={(v) => update({ halftoneMisalign: v })}
              />
              <SliderControl
                label="Halftone Angle"
                value={settings.halftoneAngle}
                min={0}
                max={90}
                step={1}
                unit="°"
                onChange={(v) => update({ halftoneAngle: v })}
              />
            </>
          )}
        </Section>

      </Sidebar>
      <CanvasArea ref={containerRef} className="preview-stage" style={{'--preview-zoom':zoom} as React.CSSProperties}>
        <CanvasRenderFeedback status={renderStatus} />
        <CanvasToolbar onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo} zoom={zoom} onZoomChange={setZoom} quality={quality} onQualityChange={setQuality} exporting={exporting} exportError={exportError} />
      </CanvasArea>
    </>
  )
}
