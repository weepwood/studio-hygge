import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { TooltipProvider } from "@/components/ui/tooltip"
import App from "@/app"
import { I18nProvider } from "@/lib/i18n-provider"
import "@/index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <TooltipProvider>
        <I18nProvider>
          <App />
        </I18nProvider>
      </TooltipProvider>
    </BrowserRouter>
  </StrictMode>
)
