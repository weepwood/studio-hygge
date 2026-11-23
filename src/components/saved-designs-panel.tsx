import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Bookmark } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet'
import { ToolIcon } from '@/components/icons'
import { tools } from '@/tools/registry'
import {
  getSavedDesigns,
  deleteDesign,
  renameDesign,
  type SavedDesign,
} from '@/lib/saved-designs'
import { setSourceImage } from '@/lib/source-image'
import { useI18n } from '@/lib/i18n'

function timeAgo(ts: number, isChinese: boolean): string {
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 60) return isChinese ? '刚刚' : 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return isChinese ? `${minutes} 分钟前` : `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return isChinese ? `${hours} 小时前` : `${hours}h ago`
  const days = Math.floor(hours / 24)
  return isChinese ? `${days} 天前` : `${days}d ago`
}

function DesignName({ design, onRename, renameLabel }: { design: SavedDesign; onRename: (name: string) => void; renameLabel: string }) {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  if (editing) {
    return (
      <input
        ref={inputRef}
        defaultValue={design.name}
        aria-label={renameLabel}
        className="w-full bg-transparent text-xs text-text-primary outline-none"
        onBlur={(e) => {
          const val = e.target.value.trim()
          if (val && val !== design.name) onRename(val)
          setEditing(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') setEditing(false)
        }}
        autoFocus
      />
    )
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        setEditing(true)
      }}
      className="truncate text-left text-xs text-text-primary hover:text-hygge-rust"
    >
      {design.name}
    </button>
  )
}

interface SavedDesignsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SavedDesignsPanel({ open, onOpenChange }: SavedDesignsPanelProps) {
  const [designs, setDesigns] = useState<SavedDesign[]>([])
  const [filter, setFilter] = useState<string | null>(null)
  const navigate = useNavigate()
  const { t, isChinese } = useI18n()

  const loadDesigns = () => {
    getSavedDesigns().then(setDesigns)
  }

  useEffect(() => {
    if (open) loadDesigns()
  }, [open])

  // Refresh when a new design is saved
  useEffect(() => {
    const handler = () => {
      if (open) loadDesigns()
    }
    window.addEventListener('studio:designs-changed', handler)
    return () => window.removeEventListener('studio:designs-changed', handler)
  }, [open])

  const filtered = filter ? designs.filter((d) => d.toolId === filter) : designs

  // Get unique tool IDs that have saved designs
  const toolIds = [...new Set(designs.map((d) => d.toolId))]

  const handleLoad = (design: SavedDesign) => {
    localStorage.setItem(`studio:${design.toolId}`, JSON.stringify(design.settings))
    setSourceImage(design.toolId, design.sourceImage ?? null)
    window.dispatchEvent(
      new CustomEvent('studio:settings-loaded', { detail: { key: `studio:${design.toolId}` } }),
    )
    navigate(`/${design.toolId}`)
    onOpenChange(false)
  }

  const handleDelete = async (id: string) => {
    await deleteDesign(id)
    setDesigns((prev) => prev.filter((d) => d.id !== id))
  }

  const handleRename = async (id: string, name: string) => {
    await renameDesign(id, name)
    setDesigns((prev) => prev.map((d) => (d.id === id ? { ...d, name } : d)))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="center" className="border-border-control/90 bg-[#faf7f2]">
        <SheetHeader className="border-b border-border-control/80 bg-[#f0eae0]/80 px-6 py-5 pr-14 sm:px-8 sm:py-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-[#e6d5c1]/70 text-hygge-rust">
              <Bookmark className="size-4" />
            </span>
            <div>
              <SheetTitle className="font-serif text-xl font-normal text-text-primary">{t('Saved designs')}</SheetTitle>
              <SheetDescription className="mt-0.5 text-xs text-text-tertiary">
                {isChinese ? '收藏的灵感与创作' : 'A little collection of ideas and finished work'}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Filter pills */}
        {toolIds.length > 1 && (
          <div className="scrollbar-thin flex flex-wrap gap-2 border-b border-border-control/70 px-6 py-4 sm:px-8">
            <button
              type="button"
              onClick={() => setFilter(null)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
                filter === null
                  ? 'border-[#7d5b3a]/30 bg-[#7d5b3a] text-[#faf7f2]'
                  : 'border-border-control bg-transparent text-text-secondary hover:bg-[#e6d5c1]/50'
              }`}
            >
              {t('All')}
            </button>
            {toolIds.map((id) => {
              const tool = tools.find((t) => t.id === id)
              return (
                <button
                  type="button"
                  key={id}
                  onClick={() => setFilter(filter === id ? null : id)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
                    filter === id
                      ? 'border-[#7d5b3a]/30 bg-[#7d5b3a] text-[#faf7f2]'
                      : 'border-border-control bg-transparent text-text-secondary hover:bg-[#e6d5c1]/50'
                  }`}
                >
                  {tool?.name ?? id}
                </button>
              )
            })}
          </div>
        )}

        {/* Grid */}
        <div className="scrollbar-thin flex-1 overflow-y-auto p-6 sm:p-8">
          {filtered.length === 0 ? (
            <div className="flex h-full min-h-64 flex-col items-center justify-center gap-4 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-[#e6d5c1]/60 text-hygge-rust">
                <Bookmark className="size-5" />
              </span>
              <span className="text-sm text-text-secondary">
                {designs.length === 0
                  ? t('No saved designs yet.')
                  : t('No designs for this filter.')}
              </span>
              {designs.length === 0 && (
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="rounded-xl bg-[#7d5b3a] px-4 py-2.5 text-xs font-medium text-[#faf7f2] shadow-sm transition-colors hover:bg-[#5b3a29]"
                >
                  {t('Press S to save current design')}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {filtered.map((design) => {
                const tool = tools.find((t) => t.id === design.toolId)
                return (
                  <div
                    key={design.id}
                    className="group cursor-pointer rounded-2xl border border-border-control/65 bg-[#f0eae0]/55 p-2.5 transition-colors hover:border-border-hover hover:bg-[#f0eae0]"
                    onClick={() => handleLoad(design)}
                  >
                    {/* Thumbnail */}
                    <div className="relative overflow-hidden rounded-[17px] border border-border-control/70 bg-[#e6d5c1]/30">
                      <img
                        src={design.thumbnail}
                        alt={design.name}
                        className="aspect-[1.18/1] w-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"
                        draggable={false}
                      />
                      <button
                        type="button"
                        aria-label={t('Delete design')}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(design.id)
                        }}
                        className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#faf7f2]/90 text-text-secondary opacity-0 shadow-sm transition-opacity duration-150 hover:text-hygge-rust group-hover:opacity-100"
                      >
                        <X className="size-4 shrink-0" />
                      </button>
                    </div>
                    {/* Info */}
                    <div className="px-1 pb-1 pt-3">
                      <div className="flex items-center gap-1">
                        <ToolIcon tool={design.toolId} className="size-4 shrink-0" />
                        <DesignName
                          design={design}
                          renameLabel={t('Rename design')}
                          onRename={(name) => handleRename(design.id, name)}
                        />
                      </div>
                      <div className="mt-1 pl-5 text-[10px] text-text-tertiary">
                        {tool?.name ?? design.toolId} &middot; {timeAgo(design.createdAt, isChinese)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
