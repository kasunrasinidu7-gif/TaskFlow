import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://taskflow100002.onrender.com/',
        changeOrigin: true,
      },
      // Socket.io requires its own proxy entry so WebSocket upgrades work
      '/socket.io': {
        target: 'https://taskflow100002.onrender.com/',
        changeOrigin: true,
        ws: true,   // Enable WebSocket proxying
      },
      '/uploads': {
        target: 'https://taskflow100002.onrender.com/',
        changeOrigin: true,
      },
    },
  },
})
