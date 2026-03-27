import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ── Riesgo País (estadisticasbcra.com) ──────────────────────────
// 1. Registrarse gratis en https://estadisticasbcra.com
// 2. Crear archivo .env.local en la raíz del proyecto con:
//    ESTADISTICAS_BCRA_TOKEN=tu_jwt_token_aqui
// ─────────────────────────────────────────────────────────────────

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // BYMA Open Data — acciones y Merval (20 min delay)
      '/api/byma': {
        target: 'https://open.bymadata.com.ar',
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/api\/byma/, '/vanoms-be-core/rest/api/bymadata/free'),
        headers: { 'Accept': 'application/json' },
      },

      // BCRA API v3.0 — reservas, tasa, principales variables
      '/api/bcra': {
        target: 'https://api.bcra.gob.ar',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/bcra/, ''),
        secure: false,
      },

      // estadisticasbcra.com — riesgo país EMBI+ (requiere token JWT)
      '/api/estadisticas': {
        target: 'https://api.estadisticasbcra.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/estadisticas/, ''),
        headers: {
          Authorization: `Bearer ${process.env.ESTADISTICAS_BCRA_TOKEN ?? ''}`,
        },
      },

      // datos.gob.ar — series INDEC (inflación IPC)
      '/api/datos': {
        target: 'https://apis.datos.gob.ar',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/datos/, ''),
      },

      // Ambito Financiero — riesgo país EMBI+ (público, sin auth)
      '/api/ambito': {
        target: 'https://mercados.ambito.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ambito/, ''),
        headers: { 'Accept': 'application/json' },
      },
    },
  },
})
