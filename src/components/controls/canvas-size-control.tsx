import { SelectControl } from './select-control'
import { SliderControl } from './slider-control'
import { CANVAS_PRESET_OPTIONS, type CanvasPreset } from '@/lib/canvas-size'
import { useI18n } from '@/lib/i18n'

interface CanvasSizeControlProps {
  preset: CanvasPreset
  customWidth: number
  customHeight: number
  onPresetChange: (preset: CanvasPreset) => void
  onWidthChange: (w: number) => void
  onHeightChange: (h: number) => void
}

export function CanvasSizeControl({
  preset,
  customWidth,
  customHeight,
  onPresetChange,
  onWidthChange,
  onHeightChange,
}: CanvasSizeControlProps) {
  const { t } = useI18n()
  return (
    <>
      <SelectControl
        label="Canvas Size"
        value={preset}
        options={CANVAS_PRESET_OPTIONS.map((option) => ({ ...option, label: t(option.label) }))}
        onChange={(v) => onPresetChange(v as CanvasPreset)}
      />
      {preset === 'custom' && (
        <>
          <SliderControl
            label="Width"
            value={customWidth}
            min={256}
            max={3840}
            step={1}
            unit="px"
            onChange={onWidthChange}
          />
          <SliderControl
            label="Height"
            value={customHeight}
            min={256}
            max={3840}
            step={1}
            unit="px"
            onChange={onHeightChange}
          />
        </>
      )}
    </>
  )
}
