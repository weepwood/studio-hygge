import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, MemoryRouter } from "react-router-dom"
import { TooltipProvider } from "@/components/ui/tooltip"
import App from "@/app"
import { I18nProvider } from "@/lib/i18n-provider"
import "@/index.css"

// UI-Vault uses an opaque-origin iframe sandbox. MemoryRouter keeps tool
// navigation working there without weakening the sandbox or changing direct URLs.
const content = (
  <TooltipProvider>
    <I18nProvider>
      <App />
    </I18nProvider>
  </TooltipProvider>
)

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {window.self !== window.top ? (
      <MemoryRouter>{content}</MemoryRouter>
    ) : (
      <BrowserRouter basename={import.meta.env.BASE_URL}>{content}</BrowserRouter>
    )}
  </StrictMode>,
)
