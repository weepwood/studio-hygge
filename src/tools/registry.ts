import { lazy } from "react"
import type { ToolDefinition } from "@/types/tools"

export const tools: ToolDefinition[] = [
  {
    id: "topo",
    name: "Topo",
    icon: "topo",
    component: lazy(() => import("@/tools/topo")),
  },
  {
    id: "blocks",
    name: "Blocks",
    icon: "blocks",
    component: lazy(() => import("@/tools/blocks")),
  },
  {
    id: "marble",
    name: "Marble",
    icon: "marble",
    component: lazy(() => import("@/tools/marble")),
  },
]
