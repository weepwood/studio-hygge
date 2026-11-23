
import { ZoomIn, ZoomOut, Maximize2, Undo2, Redo2 } from "lucide-react"
import type { PreviewQuality } from "@/lib/canvas-size"
import { useI18n } from "@/lib/i18n"

interface Props {
  zoom: number
  onZoomChange: (zoom: number) => void
  quality: PreviewQuality
  onQualityChange: (quality: PreviewQuality) => void
  exporting?: boolean
  exportError?: string | null
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
}
export function CanvasToolbar({zoom,onZoomChange,quality,onQualityChange,exporting=false,exportError,onUndo,onRedo,canUndo,canRedo}: Props) {
  const {isChinese} = useI18n()
  const label = isChinese ? "预览" : "Preview"
  return <div className="absolute bottom-4 left-1/2 z-20 flex max-w-[calc(100%-1rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-2xl border border-border-control/85 bg-[#fffdf9]/95 p-1.5 text-text-secondary shadow-[0_8px_28px_rgba(91,58,41,.1)] backdrop-blur-md" role="toolbar" aria-label={isChinese?"画布工具栏":"Canvas toolbar"}>
    {onUndo && <button type="button" aria-label={isChinese?"撤销":"Undo"} disabled={!canUndo} onClick={onUndo} className="rounded-lg p-2 hover:bg-hygge-oat/50 disabled:opacity-30"><Undo2 size={14}/></button>}
    {onRedo && <button type="button" aria-label={isChinese?"重做":"Redo"} disabled={!canRedo} onClick={onRedo} className="rounded-lg p-2 hover:bg-hygge-oat/50 disabled:opacity-30"><Redo2 size={14}/></button>}
    {(onUndo || onRedo) && <span className="mx-1 h-5 w-px bg-border-control" aria-hidden="true"/>}
    <button type="button" aria-label={isChinese?"缩小":"Zoom out"} onClick={()=>onZoomChange(Math.max(.5,+(zoom-.25).toFixed(2)))} className="rounded-lg p-2 hover:bg-hygge-oat/50 focus-visible:outline-2 focus-visible:outline-hygge-rust"><ZoomOut size={15}/></button>
    <span className="min-w-[41px] text-center font-mono text-xs tabular-nums">{Math.round(zoom*100)}%</span>
    <button type="button" aria-label={isChinese?"放大":"Zoom in"} onClick={()=>onZoomChange(Math.min(2,+(zoom+.25).toFixed(2)))} className="rounded-lg p-2 hover:bg-hygge-oat/50 focus-visible:outline-2 focus-visible:outline-hygge-rust"><ZoomIn size={15}/></button>
    <button type="button" aria-label={isChinese?"适应窗口":"Fit to window"} onClick={()=>onZoomChange(1)} className="rounded-lg p-2 hover:bg-hygge-oat/50 focus-visible:outline-2 focus-visible:outline-hygge-rust"><Maximize2 size={14}/></button>
    <span className="mx-1 h-5 w-px bg-border-control" aria-hidden="true"/>
    <label className="sr-only" htmlFor="preview-quality">{label}</label>
    <select id="preview-quality" value={quality} onChange={e=>onQualityChange(e.target.value as PreviewQuality)} className="max-w-32 rounded-lg bg-transparent px-2 py-1.5 text-xs text-text-secondary hover:bg-hygge-oat/50 focus-visible:outline-2 focus-visible:outline-hygge-rust">
      <option value="fast">{isChinese?"快速预览":"Fast"}</option>
      <option value="balanced">{isChinese?"平衡预览":"Balanced"}</option>
      <option value="detail">{isChinese?"精细预览":"Detail"}</option>
    </select>
    {exporting && <span role="status" className="px-2 text-[10px] text-hygge-rust">{isChinese?"正在导出…":"Exporting…"}</span>}
    {exportError && <span role="alert" className="max-w-44 truncate px-2 text-[10px] text-red-700" title={exportError}>{isChinese?"导出失败":"Export failed"}</span>}
  </div>
}
