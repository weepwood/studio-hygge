import { useEffect } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { ToolSwitcher } from "@/components/tool-switcher"
import { useFavicon } from "@/hooks/use-favicon"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { useMobile } from "@/hooks/use-mobile"
import { tools } from "@/tools/registry"
import { useI18n } from "@/lib/i18n"

export function AppShell() {
  const toolId = useLocation().pathname.slice(1)
  useFavicon(toolId)
  useKeyboardShortcuts()
  const isMobile = useMobile()
  const { t } = useI18n()

  useEffect(() => {
    const tool = tools.find((t) => t.id === toolId)
    document.title = tool ? `${tool.name} — ${t("Studio")}` : t("Studio")
  }, [toolId, t])

  return (
    <div className={`flex h-svh overflow-hidden ${isMobile ? 'flex-col' : ''}`}>
      <ToolSwitcher />
      <Outlet />
    </div>
  )
}
