// Chromium fork of build/vite.ts; keep its build structure in sync with upstream.
import path from 'node:path'
import { build, defineConfig, mergeConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import type { RolldownWatcher } from 'rolldown'
import { IS_DEV, log, logOk } from './utils.js'

const SRC_PATH = path.resolve('.staging-chromium/src')
const ADDON_PATH = path.resolve('addon-chromium')
const source = (relativePath: string) => path.join(SRC_PATH, relativePath)

const base = defineConfig({
  appType: 'custom',
  mode: 'production',
  define: { IS_CHROMIUM: true },
  resolve: { alias: { src: SRC_PATH } },
  clearScreen: false,
  cacheDir: process.env.SIDEBERY_CHROMIUM_CACHE_DIR || 'node_modules/.vite-chromium',
  logLevel: 'warn',
  build: {
    modulePreload: false,
    watch: IS_DEV ? { buildDelay: 32 } : null,
    minify: !IS_DEV,
    assetsDir: '',
    target: 'esnext',
    outDir: ADDON_PATH,
    emptyOutDir: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000,
    sourcemap: IS_DEV ? 'inline' : false,
    rolldownOptions: {
      preserveEntrySignatures: false,
      treeshake: true,
      input: {},
      output: {
        strict: true,
        entryFileNames: '[name].js',
        chunkFileNames: 'chunk-[hash].js',
      },
    },
  },
})

async function main() {
  log('Chromium scripts: Building')
  let firstBuild = true
  const buildTasks = []

  const splittedScripts = defineConfig({
    build: {
      rollupOptions: {
        input: {
          'bg/background': source('bg/background.ts'),
          'sidebar/sidebar': source('sidebar/sidebar.ts'),
          'page.setup/setup': source('page.setup/setup.ts'),
          'popup.panel-config/panel-config': source('popup.panel-config/panel-config.ts'),
          'popup.search/search': source('popup.search/search.ts'),
          'popup.editing/editing': source('popup.editing/editing.ts'),
          '_locales/dict.common': source('_locales/dict.common.ts'),
          '_locales/dict.sidebar': source('_locales/dict.sidebar.ts'),
          '_locales/dict.setup-page': source('_locales/dict.setup-page.ts'),
        },
      },
    },
    plugins: [vue()],
  })
  buildTasks.push(build(mergeConfig(base, splittedScripts, true)))

  const mediaInjections = defineConfig({
    build: {
      rolldownOptions: {
        input: {
          'injections/play-media': source('injections/play-media.ts'),
          'injections/pause-media': source('injections/pause-media.ts'),
          'injections/check-paused-media': source('injections/check-paused-media.ts'),
        },
      },
    },
  })
  buildTasks.push(build(mergeConfig(base, mediaInjections, true)))

  const groupInjection = defineConfig({
    build: {
      rolldownOptions: {
        input: { 'page.group/group': source('page.group/group.ts') },
        output: {
          codeSplitting: false,
          dir: path.join(ADDON_PATH, 'sidebery'),
          entryFileNames: 'group.js',
        },
      },
    },
  })
  buildTasks.push(build(mergeConfig(base, groupInjection, true)))

  const urlInjection = defineConfig({
    build: {
      rolldownOptions: {
        input: { 'page.url/url': source('page.url/url.ts') },
        output: {
          codeSplitting: false,
          dir: path.join(ADDON_PATH, 'sidebery'),
          entryFileNames: 'url.js',
        },
      },
    },
  })
  buildTasks.push(build(mergeConfig(base, urlInjection, true)))

  const buildResults = await Promise.all(buildTasks)

  if (!IS_DEV) logOk('Chromium scripts: Done')
  else {
    let building = 0
    for (const result of buildResults as RolldownWatcher[]) {
      result.on('event', event => {
        if (event.code === 'START' && building++ === 0 && !firstBuild) {
          log('Chromium scripts: Building')
        }
        if (event.code === 'END' && --building === 0) logOk('Chromium scripts: Watching')
        if (firstBuild) firstBuild = false
      })
    }
  }
}

main()
