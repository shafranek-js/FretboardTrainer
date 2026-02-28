import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const basePath = env.VITE_BASE_PATH || '/';
  return {
    base: basePath,
    build: {
      // alphaTab is loaded only on demand for GP import and already ships as a dedicated lazy chunk.
      // Its minified bundle is legitimately larger than Vite's default 500 kB warning threshold.
      // Raise the threshold just above the expected alphaTab chunk size so real regressions still surface.
      chunkSizeWarningLimit: 1300,
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        manifest: {
          name: 'FretFlow - Fretboard Trainer',
          short_name: 'FretFlow',
          description: 'Interactive guitar and ukulele fretboard training app.',
          theme_color: '#1e293b',
          background_color: '#0f172a',
          display: 'standalone',
          start_url: basePath,
          icons: [
            {
              src: `${basePath}pwa-icon.svg`,
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          runtimeCaching: [
            {
              // Instrument samples fetched by soundfont-player
              urlPattern:
                /^https:\/\/gleitz\.github\.io\/midi-js-soundfonts\/.*\.(js|mp3|ogg|wav)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'soundfont-samples',
                cacheableResponse: {
                  statuses: [0, 200],
                },
                expiration: {
                  maxEntries: 300,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
          ],
        },
      }),
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
