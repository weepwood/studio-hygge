import { Languages } from "lucide-react"
import { useI18n } from "@/lib/i18n"

export function LanguageToggle({ variant = "floating" }: { variant?: "floating" | "inline" }) {
  const { language, setLanguage } = useI18n()
  const nextLanguage = language === "zh" ? "en" : "zh"

  return (
    <button
      type="button"
      onClick={() => setLanguage(nextLanguage)}
      aria-label={language === "zh" ? "切换为英文" : "Switch to Chinese"}
      title={language === "zh" ? "切换为英文" : "Switch to Chinese"}
      className={variant === "inline"
        ? "inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-border-control bg-surface-elevated/70 px-3 text-[11px] font-medium tracking-wide text-text-secondary transition-colors hover:border-border-hover hover:text-hygge-rust"
        : "fixed right-4 top-4 z-50 inline-flex h-9 items-center gap-2 rounded-full border border-border-control bg-surface-elevated/90 px-3 text-[11px] font-medium tracking-wide text-text-secondary shadow-sm backdrop-blur-sm transition-colors hover:border-border-hover hover:text-hygge-rust md:right-6 md:top-5"}
    >
      <Languages className="size-3.5" strokeWidth={1.7} />
      {language === "zh" ? "EN" : "中文"}
    </button>
  )
}
