import { defineConfig } from 'astro/config';

// Astro check/sync also use Vite's "serve" command, but must not share the
// dependency optimizer files owned by a running Astro dev server.
const astroCommand = process.argv.find(arg => ['dev', 'check', 'sync', 'build', 'preview'].includes(arg));

export default defineConfig({
  output: 'static',
  site: process.env.SITE_URL || undefined,
  base: process.env.BASE_PATH || '/',
  trailingSlash: 'always',
  vite: {
    plugins: [{
      name: 'separate-vite-caches',
      config: (_config, { command }) => ({
        cacheDir: `node_modules/.vite-${astroCommand || command}`,
      }),
    }],
  },
});
