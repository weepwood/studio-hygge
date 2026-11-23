# Studio

A quiet little generative art studio with three tools: Topo, Blocks, and Marble. Built for personal use with a warm, Scandinavian inspired interface.

## Tools

- **Topo** — Generate topographic contour maps from seeded terrain, with palette, grain, and stroke controls. Export SVG or PNG.
- **Blocks** — Make abstract geometric compositions with recursive layouts, palettes, and optional print textures. Export SVG or PNG.
- **Marble** — Create fluid, watercolor-like marbled textures with adjustable color, veins, grain, and animation. Export PNG or record MP4.

Each tool saves its settings locally. Use the bookmark in the left rail to save and revisit designs.
Use the language button in the upper-right corner to switch between English and Simplified Chinese.

## Run locally

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Vite opens the app at `http://localhost:5173`.

## Deploy to GitHub Pages

Push to the `master` branch to build and publish the site with GitHub Actions. The workflow enables GitHub Pages, builds the app with the repository subpath, and publishes the `dist` directory. Once the first deployment completes, the site is available at `https://weepwood.github.io/studio-hygge/`.

## Stack

- Vite, React 19, TypeScript
- Tailwind CSS v4
- p5.js for Topo and Blocks
- WebGL2 shaders for Marble
