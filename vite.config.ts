import { defineConfig } from 'vite'
import path from 'path'
import fs from 'fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

const CHANGE_LOG_FILE = path.resolve(__dirname, 'public/change-log/data.json')

// Lets the change-log page save comments into its JSON file while the dev server is running.
// A static build has no server, so there the page falls back to saving in the browser.
function changeLogApi() {
  return {
    name: 'change-log-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/change-log') {
          res.statusCode = 302
          res.setHeader('Location', '/change-log/')
          return res.end()
        }
        if (req.url !== '/api/change-log' || req.method !== 'POST') return next()
        let body = ''
        req.on('data', (chunk) => { body += chunk })
        req.on('end', () => {
          try {
            const { id, comment } = JSON.parse(body)
            if (typeof id !== 'string' || typeof comment !== 'string' || comment.length > 5000) throw new Error('bad request')
            // Read, change one comment, write: two people editing different rows don't overwrite each other.
            const data = JSON.parse(fs.readFileSync(CHANGE_LOG_FILE, 'utf8'))
            const item = data.items.find((i) => i.id === id)
            if (!item) throw new Error('unknown row')
            item.comment = comment
            data.updatedAt = new Date().toISOString()
            fs.writeFileSync(CHANGE_LOG_FILE, JSON.stringify(data, null, 2) + '\n')
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, updatedAt: data.updatedAt }))
          } catch (err) {
            res.statusCode = 400
            res.end(JSON.stringify({ ok: false, error: String(err.message ?? err) }))
          }
        })
      })
    },
  }
}

export default defineConfig({
  // Relative asset paths, so the build works from any sub-path (GitHub Pages serves it under /<repo>/)
  base: './',
  plugins: [
    figmaAssetResolver(),
    changeLogApi(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      // Two pages: the prototype, and the change log at /change-log/
      input: {
        main: path.resolve(__dirname, 'index.html'),
        changeLog: path.resolve(__dirname, 'change-log/index.html'),
      },
    },
  },
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
})
