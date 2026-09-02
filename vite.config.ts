import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Both /api (routes/mt5_status.py, routes/system_status.py) and /core
      // (api/core_router.py) are mounted by mat-strategy-engine itself, on its
      // own port 8010 — NOT MAT-AI-OS (port 8000), which has no /core routes at
      // all. Both prefixes pointed at 8000 before, so every fetchOutput /
      // fetchAvailableSymbols / /api/mt5/symbols / /api/system-status call was
      // hitting the wrong backend and 404ing.
      '/api': {
        target: 'http://localhost:8010',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '/core': {
        target: 'http://localhost:8010',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      // no alias needed for three in 2D mode
    },
    // @mat/chart-core, @mat/chart-surface, @mat/trading-terminal-surface are
    // consumed via file: links to a sibling repo (MAT-ai-trading-terminal),
    // not this project's own node_modules — without dedupe, their compiled
    // dist code resolves react/react-dom relative to THEIR location (through
    // the symlink), loading a second React instance alongside this app's own
    // and breaking hooks/rendering ("Invalid hook call" / "multiple copies of
    // react"). This forces every resolution to this project's single copy.
    dedupe: ['react', 'react-dom'],
  },
})
