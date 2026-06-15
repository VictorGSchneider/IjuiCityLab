import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// SSR completo: o Astro serve o site, o painel, o portal, a administração
// e toda a API (substitui o backend Express).
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  server: { port: Number(process.env.PORT) || 3000, host: true },
  vite: {
    // better-sqlite3 é um módulo nativo: deve ficar externo ao bundle SSR.
    ssr: { external: ['better-sqlite3'] },
  },
});
