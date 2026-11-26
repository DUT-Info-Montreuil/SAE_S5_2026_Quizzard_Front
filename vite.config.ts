/// <reference types="vitest/config" />
import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'

// Polices standard de PDF.js, servies sous pdfjs/standard_fonts/ avec leurs noms d'origine : PDF.js construit
// lui-même l'adresse de chaque fichier (`standardFontDataUrl` + nom), d'où une copie et non un import haché.
const DOSSIER_POLICES_PDF = 'pdfjs/standard_fonts/'
const sourcePolicesPdf = join(dirname(createRequire(import.meta.url).resolve('pdfjs-dist/package.json')), 'standard_fonts')
const fichiersPolicesPdf = readdirSync(sourcePolicesPdf)

function policesPdf(): Plugin {
  return {
    name: 'polices-pdfjs',
    configureServer(serveur) {
      serveur.middlewares.use(`/${DOSSIER_POLICES_PDF}`, (requete, reponse, suite) => {
        const nom = decodeURIComponent((requete.url ?? '').slice(1).split('?')[0])
        if (!fichiersPolicesPdf.includes(nom)) return suite()
        reponse.end(readFileSync(join(sourcePolicesPdf, nom)))
      })
    },
    generateBundle() {
      for (const nom of fichiersPolicesPdf) {
        this.emitFile({ type: 'asset', fileName: DOSSIER_POLICES_PDF + nom, source: readFileSync(join(sourcePolicesPdf, nom)) })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), policesPdf()],
  test: {
    environment: 'jsdom',
    env: { VITE_API_URL: 'http://localhost:8080' },
    setupFiles: ['./src/test/preparation.ts'],
  },
})
