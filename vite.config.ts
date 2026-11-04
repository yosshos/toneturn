import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string };
const commit = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'dev';
  }
})();
const buildTime = new Date().toISOString();

/** Emit sw.js with the version and the exact list of built files to precache. */
function serviceWorker(): Plugin {
  let base = '/';
  return {
    name: 'toneturn-sw',
    apply: 'build',
    configResolved(c) {
      base = c.base;
    },
    generateBundle(_opts, bundle) {
      const files = Object.keys(bundle).map((f) => `${base}${f}`);
      const precache = [base, `${base}index.html`, `${base}icon.svg`, `${base}manifest.webmanifest`, ...files.filter((f) => /\.(js|css|woff2)$/.test(f))];
      const tpl = readFileSync(new URL('./src/sw-template.js', import.meta.url), 'utf-8');
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: tpl
          .replaceAll('__BASE__', base)
          .replaceAll('__VERSION__', pkg.version)
          .replaceAll('__BUILD__', `${commit}-${buildTime.replace(/[^0-9]/g, '').slice(0, 12)}`)
          .replace('__PRECACHE__', JSON.stringify(precache)),
      });
    },
  };
}

// `--mode https` adds a self-signed certificate so phones on the LAN get a
// secure context (required for microphone + speech recognition).
export default defineConfig(({ mode }) => ({
  // GitHub Pages serves the app under /toneturn/; local dev and preview use /.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), serviceWorker(), ...(mode === 'https' ? [basicSsl()] : [])],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_COMMIT__: JSON.stringify(commit),
    __APP_BUILT__: JSON.stringify(buildTime),
  },
  server: { port: 5173 },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
}));
