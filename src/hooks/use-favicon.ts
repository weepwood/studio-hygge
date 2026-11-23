import { useEffect } from "react"

const PATTERN = [
  [0, 0, 0, 0, 1, 0, 1, 1, 2],
  [0, 0, 0, 1, 0, 1, 1, 2, 1],
  [0, 0, 1, 0, 1, 1, 2, 1, 2],
  [0, 1, 0, 1, 1, 2, 1, 2, 2],
  [1, 0, 1, 1, 2, 1, 2, 2, 3],
  [0, 1, 1, 2, 1, 2, 2, 3, 2],
  [1, 1, 2, 1, 2, 2, 3, 2, 3],
  [1, 2, 1, 2, 2, 3, 2, 3, 3],
  [2, 1, 2, 2, 3, 2, 3, 3, 3],
]

const palettes: Record<string, [string, string, string, string]> = {
  home:         ["#5b3a29", "#7d5b3a", "#a65e2e", "#d69434"],
  topo:        ["#5b3a29", "#7d5b3a", "#a65e2e", "#d69434"],
  blocks:      ["#6b7f5e", "#7d5b3a", "#a65e2e", "#d69434"],
  organic:     ["#402a1a", "#7a4a2d", "#b57a4a", "#e0ac7a"],
  dither:      ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"],
  plotter:     ["#1a1a33", "#2d2d66", "#5a5a99", "#8b8bcc"],
  marble:      ["#5b3a29", "#7d5b3a", "#a65e2e", "#d69434"],
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, "0")
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function buildRainbowSvg(): string {
  const size = 9
  const rects = PATTERN.flatMap((row, y) =>
    row.map((v, x) => {
      const t = (x + y) / (size * 2 - 2)
      const hueSteps = [145, 50, 30, 0, 280, 220]
      const hue = hueSteps[Math.floor(t * hueSteps.length)]
      const lightness = [0.3, 0.5, 0.6, 0.75][v]
      const color = hslToHex(hue, 1, lightness)
      return `<rect x="${x * 3}" y="${y * 3}" width="3" height="3" fill="${color}"/>`
    })
  ).join("")

  return `<svg xmlns="http://www.w3.org/2000/svg" width="27" height="27" viewBox="0 0 27 27" shape-rendering="crispEdges"><defs><clipPath id="c"><rect width="27" height="27" rx="5"/></clipPath></defs><g clip-path="url(#c)">${rects}</g></svg>`
}

function buildSvg(palette: [string, string, string, string]): string {
  const rects = PATTERN.flatMap((row, y) =>
    row.map((v, x) =>
      `<rect x="${x * 3}" y="${y * 3}" width="3" height="3" fill="${palette[v]}"/>`
    )
  ).join("")

  return `<svg xmlns="http://www.w3.org/2000/svg" width="27" height="27" viewBox="0 0 27 27" shape-rendering="crispEdges"><defs><clipPath id="c"><rect width="27" height="27" rx="5"/></clipPath></defs><g clip-path="url(#c)">${rects}</g></svg>`
}

export function useFavicon(toolId: string) {
  useEffect(() => {
    const palette = palettes[toolId]
    const svg = palette ? buildSvg(palette) : buildRainbowSvg()
    const url = `data:image/svg+xml,${encodeURIComponent(svg)}`

    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) {
      link = document.createElement("link")
      link.rel = "icon"
      document.head.appendChild(link)
    }
    link.type = "image/svg+xml"
    link.href = url
  }, [toolId])
}
