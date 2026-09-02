import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Where the .NET API listens during `dotnet run` (http profile in launchSettings.json).
  const apiTarget = env.VITE_API_PROXY ?? 'http://localhost:5023'

  return {
    plugins: [
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      react(),
    ],
    server: {
      port: 5173,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
        '/openapi': { target: apiTarget, changeOrigin: true },
      },
    },
  }
})
