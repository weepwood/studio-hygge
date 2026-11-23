import { setStoredValue } from "@/lib/safe-storage"
import { useState, useEffect } from "react"
import { NavLink, useLocation } from "react-router-dom"
import { BookmarkCheck, BookmarkPlus, Dices, Download, FileImage, Image, RotateCcw, Video, Undo2, Redo2 } from "lucide-react"
import { preloadTool, tools } from "@/tools/registry"
import { ToolIcon } from "@/components/icons"
import { useMobile } from "@/hooks/use-mobile"
import { SavedDesignsPanel } from "@/components/saved-designs-panel"
import { shortcutActions } from "@/lib/shortcut-actions"
import { useI18n } from "@/lib/i18n"
import { Kbd } from "@/components/ui/kbd"
import { saveDesign } from "@/lib/saved-designs"
import { copyImageToClipboard } from "@/lib/share"

function ActionButton({
  icon,
  label,
  shortcut,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  shortcut?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-full items-center gap-2.5 rounded-xl px-2.5 text-left text-xs text-text-secondary transition-colors hover:bg-[#e6d5c1]/55 hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-hygge-rust"
    >
      <span className="flex size-5 shrink-0 items-center justify-center text-hygge-rust">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {shortcut && <Kbd>{shortcut}</Kbd>}
    </button>
  )
}

export function ToolSwitcher() {
  const isMobile = useMobile()
  const [open, setOpen] = useState(false)
  const [savedOpen, setSavedOpen] = useState(false)
  const [bounce, setBounce] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "duplicate">("idle")
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle")
  const currentToolId = useLocation().pathname.slice(1)
  const currentTool = tools.find((tool) => tool.id === currentToolId) ?? tools[0]
  const isMarble = currentTool.id === "marble"
  const { t } = useI18n()

  useEffect(() => {
    const onDesignsChanged = () => {
      setBounce(true)
      setTimeout(() => setBounce(false), 600)
    }
    const onActionsChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ isRecording: boolean }>).detail
      if (detail) setIsRecording(detail.isRecording)
    }
    window.addEventListener("studio:designs-changed", onDesignsChanged)
    window.addEventListener("studio:actions-changed", onActionsChanged)
    return () => {
      window.removeEventListener("studio:designs-changed", onDesignsChanged)
      window.removeEventListener("studio:actions-changed", onActionsChanged)
    }
  }, [])

  useEffect(() => {
    shortcutActions.save = () => {
      const canvas = document.querySelector("canvas") as HTMLCanvasElement | null
      const settings = shortcutActions.getSettings?.()
      if (!canvas || !settings) return
      saveDesign(currentTool.id, settings, canvas).then((saved) => {
        setSaveStatus(saved ? "saved" : "duplicate")
        setTimeout(() => setSaveStatus("idle"), 1500)
        if (saved) window.dispatchEvent(new CustomEvent("studio:designs-changed"))
      })
    }
    return () => {
      shortcutActions.save = null
    }
  }, [currentTool.id])

  const handleCopyImage = async () => {
    const canvas = document.querySelector("canvas") as HTMLCanvasElement | null
    if (!canvas) return
    const copied = await copyImageToClipboard(canvas)
    setCopyStatus(copied ? "copied" : "failed")
    setTimeout(() => setCopyStatus("idle"), 1500)
  }

  const actions = (
    <div className="space-y-2.5">
      <div className="space-y-0.5">
        <div className="grid grid-cols-2 gap-1">
          <ActionButton icon={<Undo2 className="size-4" />} label={t("Undo")} onClick={() => shortcutActions.undo?.()} />
          <ActionButton icon={<Redo2 className="size-4" />} label={t("Redo")} onClick={() => shortcutActions.redo?.()} />
        </div>
        <ActionButton icon={<Dices className="size-4" />} label={t("Randomize")} shortcut="R" onClick={() => shortcutActions.randomize?.()} />
        <ActionButton icon={<RotateCcw className="size-4" />} label={t("Reset")} shortcut="⌫" onClick={() => shortcutActions.reset?.()} />
      </div>
      <div className="space-y-0.5 border-t border-border-control/70 pt-2">
        <ActionButton icon={<Image className="size-4" />} label={t(copyStatus === "copied" ? "Image Copied!" : copyStatus === "failed" ? "Failed" : "Copy Image")} onClick={handleCopyImage} />
        <ActionButton
          icon={<Download className="size-4" />}
          label={t("Export PNG")}
          shortcut="⌘S"
          onClick={() => {
            if (shortcutActions.exportPng) shortcutActions.exportPng()
            else shortcutActions.download?.()
          }}
        />
        {isMarble ? (
          <ActionButton
            icon={<Video className="size-4" />}
            label={t(isRecording ? "Stop Recording" : "Record MP4")}
            onClick={() => shortcutActions.toggleRecording?.()}
          />
        ) : (
          <ActionButton icon={<FileImage className="size-4" />} label={t("Export SVG")} onClick={() => shortcutActions.exportSvg?.()} />
        )}
      </div>
      <div className="space-y-0.5 border-t border-border-control/70 pt-2">
        <ActionButton
          icon={<BookmarkPlus className="size-4" />}
          label={t(saveStatus === "saved" ? "Saved!" : saveStatus === "duplicate" ? "Already saved" : "Save Design")}
          shortcut={saveStatus === "idle" ? "S" : undefined}
          onClick={() => shortcutActions.save?.()}
        />
        <ActionButton
          icon={<BookmarkCheck className="size-4" fill={bounce ? "currentColor" : "none"} />}
          label={t("Saved")}
          onClick={() => setSavedOpen(true)}
        />
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="fixed left-3 top-3 z-40 flex h-10 w-10 items-center justify-center rounded-xl border border-border-control bg-surface-elevated text-hygge-rust shadow-sm"
          aria-label={t("Switch tool")}
        >
          <ToolIcon tool={currentTool.id} className="h-6 w-6" />
        </button>
        <SavedDesignsPanel open={savedOpen} onOpenChange={setSavedOpen} />
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="fixed left-3 top-16 z-50 w-60 rounded-2xl border border-border-control bg-surface-elevated p-3 shadow-xl">
              <div className="grid grid-cols-3 gap-2">
                {tools.map((tool) => (
                  <NavLink
                    key={tool.id}
                    to={`/${tool.id}`}
                    onPointerEnter={() => preloadTool(tool.id)}
                    onFocus={() => preloadTool(tool.id)}
                    onClick={() => {
                      setStoredValue("studio:last-tool", tool.id)
                      setOpen(false)
                    }}
                    className="flex flex-col items-center gap-1 rounded-lg p-1.5"
                  >
                    {({ isActive }) => (
                      <>
                        <span className={`rounded-[9px] ${isActive ? "bg-[#e6d5c1]/70 ring-1 ring-inset ring-border-control" : "opacity-65"}`}>
                          <ToolIcon tool={tool.id} />
                        </span>
                        <span className={`text-[9px] ${isActive ? "text-text-primary" : "text-text-tertiary"}`}>{tool.name}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
              <div className="my-2 border-t border-border-control/80" />
              {actions}
            </div>
          </>
        )}
      </>
    )
  }

  return (
    <>
      <nav className="scrollbar-thin flex w-toolbar shrink-0 flex-col items-stretch overflow-y-auto border-r border-border-control/80 bg-sidebar/90 px-3 py-4">
        <NavLink to="/" aria-label={t("Studio home")} className="mb-3 flex items-center gap-3 rounded-xl px-2 py-2 text-hygge-rust transition-colors hover:bg-[#e6d5c1]/45">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#7d5b3a] font-serif text-lg text-[#faf7f2]">S</span>
          <span className="font-serif text-lg text-text-primary">Studio</span>
        </NavLink>
        <div className="my-4 border-t border-border-control/80" />
        <div className="space-y-1">
          {tools.map((tool) => (
            <NavLink
              key={tool.id}
              to={`/${tool.id}`}
              onPointerEnter={() => preloadTool(tool.id)}
              onFocus={() => preloadTool(tool.id)}
              onClick={() => setStoredValue("studio:last-tool", tool.id)}
              className="flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-[#e6d5c1]/35"
            >
              {({ isActive }) => (
                <>
                  <span className={`size-[30px] shrink-0 rounded-[9px] ${isActive ? "bg-[#e6d5c1]/75 ring-1 ring-inset ring-border-control" : "opacity-70 hover:opacity-100"}`}>
                    <ToolIcon tool={tool.id} />
                  </span>
                  <span className={`text-xs ${isActive ? "font-medium text-text-primary" : "text-text-secondary"}`}>{tool.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div className="mt-auto pt-4">
          <div className="border-t border-border-control/80 pt-3">
            {actions}
          </div>
        </div>
      </nav>
      <SavedDesignsPanel open={savedOpen} onOpenChange={setSavedOpen} />
    </>
  )
}
