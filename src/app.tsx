import { Suspense, lazy } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import { AppShell } from "@/components/app-shell"
import { tools } from "@/tools/registry"
import { Sidebar } from "@/components/sidebar"
import { CanvasArea } from "@/components/canvas-area"
import { CanvasRenderFeedback } from "@/components/canvas-render-feedback"

const Home = lazy(() => import("@/tools/home"))

function ToolLoading() {
  return (
    <>
      <Sidebar>
        <div className="mb-6 h-6 w-28 animate-pulse rounded-lg bg-hygge-oat/80" />
        <div className="space-y-5" aria-hidden="true">
          <div className="h-24 animate-pulse rounded-xl bg-hygge-oat/45" />
          <div className="h-32 animate-pulse rounded-xl bg-hygge-oat/45" />
          <div className="h-24 animate-pulse rounded-xl bg-hygge-oat/45" />
        </div>
      </Sidebar>
      <CanvasArea><CanvasRenderFeedback /></CanvasArea>
    </>
  )
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Suspense fallback={<ToolLoading />}>
            <Home />
          </Suspense>
        }
      />
      <Route element={<AppShell />}>
        {tools.map((tool) => (
          <Route
            key={tool.id}
            path={tool.id}
            element={
              <Suspense fallback={<ToolLoading />}>
                <tool.component />
              </Suspense>
            }
          />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
