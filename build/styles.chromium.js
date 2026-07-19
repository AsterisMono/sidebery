// Chromium fork of build/styles.js; compiles staged styles without proxy or sync pages.
/* eslint no-console: off */
import fs from 'node:fs'
import path from 'node:path'
import stylus from 'stylus'
import esbuild from 'esbuild'
import { IS_DEV, getTime, watch, log, logOk, logErr } from './utils.js'

const SRC_DIR = path.resolve('.staging-chromium/src')
const OUTPUT_DIR = path.resolve('addon-chromium/styles')
const ENTRIES = [
  'styles/sidebar/sidebar.styl',
  'styles/page.url/url.styl',
  'styles/page.group/group.styl',
  'styles/page.setup/setup.styl',
  'styles/popup.panel-config/panel-config.styl',
]

function getEntries() {
  return ENTRIES.map(relativePath => {
    const srcPath = path.join(SRC_DIR, relativePath)
    return {
      srcPath,
      outputPath: path.join(OUTPUT_DIR, `${path.basename(srcPath, '.styl')}.css`),
    }
  })
}

async function compile(entry) {
  const srcContent = await fs.promises.readFile(entry.srcPath, 'utf8')
  let css = await new Promise((resolve, reject) => {
    stylus(srcContent)
      .set('paths', [path.dirname(entry.srcPath)])
      .render((err, output) => (err ? reject(err) : resolve(output)))
  })
  if (!IS_DEV) css = (await esbuild.transform(css, { minify: true, loader: 'css' })).code
  await fs.promises.mkdir(OUTPUT_DIR, { recursive: true })
  await fs.promises.writeFile(entry.outputPath, css)
}

async function build() {
  for (const entry of getEntries()) await compile(entry)
}

async function buildAndWatch() {
  const entries = getEntries()
  for (const entry of entries) await compile(entry)
  const tasks = await Promise.all(
    entries.map(async entry => {
      const srcContent = await fs.promises.readFile(entry.srcPath, 'utf8')
      const dependencies = stylus(srcContent)
        .set('paths', [path.dirname(entry.srcPath)])
        .deps()
      return { ...entry, files: [entry.srcPath, ...dependencies] }
    })
  )
  watch(
    tasks,
    async changed => {
      for (const task of changed) {
        log(`Chromium styles: Changed source: ${task.srcPath}`)
        await compile(task)
      }
    },
    (task, file) => log(`Chromium styles: File ${file} was renamed, restart this script`)
  )
}

async function main() {
  log('Chromium styles: Building')
  try {
    if (IS_DEV) {
      await buildAndWatch()
      logOk('Chromium styles: Watching')
    } else {
      await build()
      logOk('Chromium styles: Done')
    }
  } catch (err) {
    logErr(`Chromium styles failed at ${getTime()}: ${err.stack ?? err}`)
    process.exitCode = 1
  }
}

main()
