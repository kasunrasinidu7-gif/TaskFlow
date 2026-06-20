import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // Socket.io requires its own proxy entry so WebSocket upgrades work
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,   // Enable WebSocket proxying
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
