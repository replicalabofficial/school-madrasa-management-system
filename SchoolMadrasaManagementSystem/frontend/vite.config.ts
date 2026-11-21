import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Demo through a tunnel: the built app (vite preview) forwards /api and /uploads to the local backend,
// so the browser sees ONE https address (no localhost calls from other computers).
const backend = { target: 'https://localhost:7013', changeOrigin: false, secure: false, xfwd: true }

export default defineConfig({
  plugins: [react(), tailwindcss()],
  preview: {
    port: 4173,
    strictPort: true,
    allowedHosts: ['.trycloudflare.com'],
    proxy: { '/api': backend, '/uploads': backend },
  },
})
