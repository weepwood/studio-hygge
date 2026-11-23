import { useI18n } from "@/lib/i18n"

export type RenderStatus = "loading" | "ready" | "error"

export function CanvasRenderFeedback({ status = "loading" }: { status?: RenderStatus }) {
  const { t } = useI18n()
  if (status === "ready") return null
  const loading = status === "loading"
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#f6efe5]/90" role="status" aria-live="polite" aria-busy={loading}>
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border-control/70 bg-surface-elevated/90 px-7 py-5 shadow-sm">
        {loading ? (
          <span className="size-6 animate-spin rounded-full border-2 border-hygge-oat border-t-hygge-rust" aria-hidden="true" />
        ) : (
          <span className="flex size-6 items-center justify-center rounded-full border border-hygge-rust text-xs text-hygge-rust" aria-hidden="true">!</span>
        )}
        <span className="text-xs text-text-secondary">{t(loading ? "Rendering preview" : "Preview unavailable")}</span>
        {loading && <span className="text-[10px] text-text-muted">{t("You can adjust settings while it renders")}</span>}
      </div>
    </div>
  )
}
