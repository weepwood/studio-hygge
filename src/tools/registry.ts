import { lazy } from "react"
import type { ToolDefinition } from "@/types/tools"

const loaders = {
  topo: () => import("@/tools/topo"),
  blocks: () => import("@/tools/blocks"),
  marble: () => import("@/tools/marble"),
}

export function preloadTool(id: string) {
  if (id in loaders) {
    void loaders[id as keyof typeof loaders]().catch(() => {
      // React.lazy retries on navigation if speculative loading fails.
    })
  }
}

export const tools: ToolDefinition[] = [
  {
    id: "topo",
    name: "Topo",
    icon: "topo",
    component: lazy(loaders.topo),
  },
  {
    id: "blocks",
    name: "Blocks",
    icon: "blocks",
    component: lazy(loaders.blocks),
  },
  {
    id: "marble",
    name: "Marble",
    icon: "marble",
    component: lazy(loaders.marble),
  },
]
