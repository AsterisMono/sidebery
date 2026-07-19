// Chromium fork of build/html.js; reads the staged tree and skips removed MV2 pages.
/* eslint no-console: off */
import fs from 'node:fs'
import path from 'node:path'
import {
  IS_DEV,
  getTime,
  treeToList,
  watch,
  colorize,
  log,
  logOk,
  logErr,
} from './utils.js'

const SRC_DIR = path.resolve('.staging-chromium/src')
const OUTPUT_DIR = path.resolve('addon-chromium')
const SVG_RE = /<inject>svg:\/\/(.+?)(#(.+))?<\/inject>/g
const SVG_ID_RE = /<svg([^<]*?)id="([^<]*?)"/
const SVG_TAG_RE = /<svg /
const STATIC_PAGES = new Set(['group.html', 'url.html'])
const SKIPPED_DIRS = new Set(['bg', 'popup.proxy', 'popup.sync'])

async function getEntries() {
  return (await treeToList(SRC_DIR)).filter(
    entry =>
      entry.file &&
      entry.file.endsWith('.html') &&
      !SKIPPED_DIRS.has(path.relative(SRC_DIR, entry.dir).split(path.sep)[0])
  )
}

async function build() {
  for (const entry of await getEntries()) await processFile(entry)
}

async function buildAndWatch() {
  const entries = await getEntries()
  for (const entry of entries) await processFile(entry)
  const tasks = entries.map(entry => ({ ...entry, files: [path.join(entry.dir, entry.file)] }))
  watch(
    tasks,
    async changed => {
      for (const task of changed) {
        console.log(`${getTime()} Chromium HTML: Changed source:`, task.file)
        await processFile(task)
      }
    },
    (task, file) => log(`Chromium HTML: File ${file} was renamed, restart this script`)
  )
}

function stagedAssetPath(svgPath) {
  const normalized = svgPath.split('/').join(path.sep)
  if (normalized === 'src') return SRC_DIR
  if (normalized.startsWith(`src${path.sep}`)) return path.join(SRC_DIR, normalized.slice(4))
  return svgPath
}

async function processFile(info) {
  const relativeDir = path.relative(SRC_DIR, info.dir)
  const outputDir = STATIC_PAGES.has(info.file)
    ? path.join(OUTPUT_DIR, 'sidebery')
    : path.join(OUTPUT_DIR, relativeDir)
  const srcData = await fs.promises.readFile(path.join(info.dir, info.file), 'utf8')
  const svgs = {}

  let match
  while ((match = SVG_RE.exec(srcData))) {
    if (!match[1]) {
      logErr(colorize(`${getTime()} |r>Chromium HTML: Wrong svg inject in |_>${info.file}|x|`))
      return
    }
    svgs[match[1]] = { path: match[1], id: match[3] }
  }

  for (const svg of Object.values(svgs)) {
    if (!svg.id) continue
    const content = await fs.promises.readFile(stagedAssetPath(svg.path), 'utf8')
    if (SVG_ID_RE.test(content)) {
      svg.content = content.replace(SVG_ID_RE, (whole, attrs) => `<svg${attrs}id="${svg.id}"`)
    } else {
      svg.content = content.replace(SVG_TAG_RE, `<svg id="${svg.id}" `)
    }
  }

  const outData = srcData.replace(SVG_RE, (whole, svgPath) => svgs[svgPath].content ?? whole)
  await fs.promises.mkdir(outputDir, { recursive: true })
  await fs.promises.writeFile(path.join(outputDir, info.file), outData)
}

async function main() {
  log('Chromium HTML: Building')
  if (IS_DEV) {
    await buildAndWatch()
    logOk('Chromium HTML: Watching')
  } else {
    await build()
    logOk('Chromium HTML: Done')
  }
}

main().catch(err => {
  logErr(`Chromium HTML failed: ${err.stack ?? err}`)
  process.exitCode = 1
})
