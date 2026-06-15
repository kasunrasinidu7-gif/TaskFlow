import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> f268618 (frontend initial setup)
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
=======
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
<<<<<<< HEAD
>>>>>>> 6d232fe (frontend initial setup)
=======
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
>>>>>>> b16bc29 (changes in sever due to error)
=======
>>>>>>> 686cf58 (frontend initial setup)
>>>>>>> f268618 (frontend initial setup)
})
