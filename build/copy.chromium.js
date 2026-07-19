// Chromium fork of build/copy.js; copies only MV3 build assets from the staged tree.
/* eslint no-console: off */
import fs from 'node:fs'
import path from 'node:path'
import * as Utils from './utils.js'

const SRC_DIR = path.resolve('.staging-chromium/src')
const OUTPUT_DIR = path.resolve('addon-chromium')
const asset = name => path.join(SRC_DIR, 'assets', name)
const COPY = [
  { src: path.join(SRC_DIR, 'manifest.json'), dst: path.join(OUTPUT_DIR, 'manifest.json') },
  {
    src: [
      path.join(SRC_DIR, '_locales/dict.browser.json'),
      path.join(SRC_DIR, '_locales/dict.chromium.json'),
    ],
    dst: path.join(OUTPUT_DIR, '_locales'),
    handler: handleLocales,
  },
  ...[
    'logo-native-dark.svg',
    'logo-native-light.svg',
    'logo-native.svg',
    'logo.svg',
    'group-page-favicon.svg',
    'snapshot-native.svg',
    'window-native.svg',
  ].map(name => ({ src: asset(name), dst: path.join(OUTPUT_DIR, 'assets', name) })),
]

async function copyEntry(entry) {
  await fs.promises.mkdir(path.dirname(entry.dst), { recursive: true })
  if (entry.handler) await entry.handler(entry.src, entry.dst)
  else await fs.promises.copyFile(entry.src, entry.dst)
}

async function build() {
  await Promise.all(COPY.map(copyEntry))
}

async function buildAndWatch() {
  await build()
  const tasks = COPY.map(entry => ({
    ...entry,
    files: Array.isArray(entry.src) ? entry.src : [entry.src],
  }))
  Utils.watch(
    tasks,
    async changed => {
      for (const entry of changed) {
        Utils.log(`Chromium copy: Changed source: ${entry.src}`)
        await copyEntry(entry)
      }
    },
    (task, file) => Utils.log(`Chromium copy: File ${file} was renamed, restart this script`)
  )
}

async function handleLocales(srcPaths, dstDir) {
  const jsonData = {}
  for (const srcPath of srcPaths) {
    Object.assign(jsonData, JSON.parse(await fs.promises.readFile(srcPath, 'utf8')))
  }
  const languages = {}
  for (const [key, dictionary] of Object.entries(jsonData)) {
    if (!dictionary || typeof dictionary !== 'object') {
      throw new Error(`Chromium copy: No locale dictionary for ${key}`)
    }
    for (const [language, message] of Object.entries(dictionary)) {
      languages[language] ??= {}
      languages[language][key] = { message }
    }
  }
  await Promise.all(
    Object.entries(languages).map(async ([language, dictionary]) => {
      const languageDir = path.join(dstDir, language)
      await fs.promises.mkdir(languageDir, { recursive: true })
      await fs.promises.writeFile(
        path.join(languageDir, 'messages.json'),
        JSON.stringify(dictionary)
      )
    })
  )
}

async function main() {
  Utils.log('Chromium copy: Copying')
  if (Utils.IS_DEV) {
    await buildAndWatch()
    Utils.logOk('Chromium copy: Watching')
  } else {
    await build()
    Utils.logOk('Chromium copy: Done')
  }
}

main().catch(err => {
  Utils.logErr(`Chromium copy failed: ${err.stack ?? err}`)
  process.exitCode = 1
})
