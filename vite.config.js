import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // VITE_BASE_URL is injected by the GitHub Actions workflow as '/repo-name/'.
  // Falls back to '/' for local dev and Docker.
  base: process.env.VITE_BASE_URL || '/',
})
