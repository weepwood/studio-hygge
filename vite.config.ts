import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1]
const isGitHubPagesBuild = process.env.GITHUB_ACTIONS === "true" && repositoryName

export default defineConfig({
  base: isGitHubPagesBuild ? `/${repositoryName}/` : "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
