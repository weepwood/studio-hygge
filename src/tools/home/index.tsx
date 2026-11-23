import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowUpRight, Sparkles } from "lucide-react"
import { tools } from "@/tools/registry"
import { useFavicon } from "@/hooks/use-favicon"
import { useI18n } from "@/lib/i18n"
import { LanguageToggle } from "@/components/language-toggle"

const previews: Record<string, { image: string; note: string; number: string }> = {
  topo: { image: `${import.meta.env.BASE_URL}topo.jpg`, note: "Contours & quiet landscapes", number: "01" },
  blocks: { image: `${import.meta.env.BASE_URL}blocks.jpg`, note: "A little order, a little chance", number: "02" },
  marble: { image: `${import.meta.env.BASE_URL}marble.jpg`, note: "Fluid color, softly layered", number: "03" },
}

export default function Home() {
  const navigate = useNavigate()
  const { t, isChinese } = useI18n()
  useFavicon("home")

  useEffect(() => {
    document.title = isChinese ? "Studio — 慢慢创作生成艺术" : "Studio — Generative art, at an unhurried pace"
  }, [isChinese])

  return (
    <main className="warm-stage flex min-h-svh flex-1 items-center justify-center overflow-y-auto px-5 py-12 md:px-10">
      <LanguageToggle />
      <div className="relative z-10 w-full max-w-6xl">
        <header className="mx-auto mb-12 max-w-2xl text-center md:mb-16">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border-control bg-surface-elevated/70 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[.16em] text-hygge-rust">
            <Sparkles className="size-3.5" strokeWidth={1.6} />
            {t("A small creative nook")}
          </div>
          <h1 className="font-serif text-5xl font-normal tracking-[-.04em] text-text-primary sm:text-6xl md:text-7xl">
            Studio<span className="italic text-hygge-rust">.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-text-secondary sm:text-base">
            {t("Generative art for slower moments. Choose a starting point, find a rhythm, and make something that feels like yours.")}
          </p>
        </header>

        <section aria-label={t("Choose an effect")} className="grid gap-5 md:grid-cols-3 md:gap-6">
          {tools.map((tool) => {
            const preview = previews[tool.id]
            if (!preview) return null

            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => {
                  localStorage.setItem("studio:last-tool", tool.id)
                  navigate(`/${tool.id}`)
                }}
                className="warm-card group overflow-hidden rounded-[1.35rem] border border-border-control/80 bg-surface-elevated text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
              >
                <div className="relative aspect-[1.28/1] overflow-hidden bg-hygge-oat">
                  <img
                    src={preview.image}
                    alt={isChinese ? `${tool.name} 效果预览` : `${tool.name} generative art preview`}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.035]"
                    draggable={false}
                  />
                  <span className="absolute left-4 top-4 rounded-full bg-[#faf7f2]/85 px-2.5 py-1 text-[10px] tracking-[.14em] text-text-secondary backdrop-blur-sm">
                    {preview.number}
                  </span>
                  <span className="absolute bottom-4 right-4 flex size-9 items-center justify-center rounded-full border border-white/60 bg-[#faf7f2]/80 text-hygge-rust opacity-0 shadow-sm transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100">
                    <ArrowUpRight className="size-4" />
                  </span>
                </div>
                <div className="flex items-end justify-between gap-4 px-5 py-4 md:px-6 md:py-5">
                  <div>
                    <h2 className="font-serif text-2xl font-normal tracking-[-.02em] text-text-primary">{tool.name}</h2>
                    <p className="mt-1.5 text-xs leading-5 text-text-tertiary">{t(preview.note)}</p>
                  </div>
                  <span className="mb-1 text-[10px] uppercase tracking-[.16em] text-hygge-sage">{t("Explore")}</span>
                </div>
              </button>
            )
          })}
        </section>

        <footer className="mt-10 flex items-center justify-center gap-2 text-[11px] tracking-wide text-text-tertiary md:mt-14">
          <span className="h-px w-7 bg-border-control" />
          {t("Made for making, at your own pace")}
          <span className="h-px w-7 bg-border-control" />
        </footer>
      </div>
    </main>
  )
}
