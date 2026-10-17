import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // GOOGLE_PHOTOS_KEY lives in .env.local (gitignored); it stays on this server and never reaches the browser
  const photosKey = loadEnv(mode, import.meta.dirname, '').GOOGLE_PHOTOS_KEY
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
    // maplibre 6 finds its worker next to its own module, so it must not be pre-bundled in dev
    optimizeDeps: { exclude: ['maplibre-gl'] },
    server: {
      proxy: {
        // /gphoto/places/<id>/photos/<ref>?maxWidthPx=480 -> Google Places photo media (a redirect to the image)
        '/gphoto': {
          target: 'https://places.googleapis.com',
          changeOrigin: true,
          rewrite: (p) => {
            const [route, query = ''] = p.replace('/gphoto', '/v1').split('?')
            return `${route}/media?${query}`
          },
          configure: (proxy) => {
            proxy.on('proxyReq', (req) => req.setHeader('X-Goog-Api-Key', photosKey ?? ''))
            // let the browser keep each photo for a day so scrolling back never re-requests it
            proxy.on('proxyRes', (res) => {
              res.headers['cache-control'] = 'public, max-age=86400'
            })
          },
        },
        // /gsv?pano=..&heading=.. -> Street View Static image (this API wants the key as a query parameter)
        '/gsv': {
          target: 'https://maps.googleapis.com',
          changeOrigin: true,
          rewrite: (p) => `${p.replace('/gsv', '/maps/api/streetview')}&key=${photosKey ?? ''}`,
          configure: (proxy) => {
            proxy.on('proxyRes', (res) => {
              res.headers['cache-control'] = 'public, max-age=86400'
            })
          },
        },
      },
    },
  }
})
