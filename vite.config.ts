import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  base: process.env.GITHUB_PAGES ? "/cv-builder/" : "/",
  plugins: [react()],
  server: { port: 5173 },
})
