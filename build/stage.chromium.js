/* eslint no-console: off */
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const ROOT = process.cwd()
const SRC_DIR = path.join(ROOT, 'src')
const OVERLAY_DIR = path.join(ROOT, 'src.chromium')
const PATCHES_DIR = path.join(ROOT, 'patches')
const STAGING_DIR = path.join(ROOT, '.staging-chromium')
const STAGED_SRC_DIR = path.join(STAGING_DIR, 'src')
const IS_DEV = process.argv.includes('--dev')
const DROPPED_CHROMIUM_COMMANDS = new Set(['_execute_sidebar_action', 'open_sync_popup'])
const ADDED_CHROMIUM_COMMANDS = new Set(['_execute_action'])

async function listFiles(root) {
  const files = []
  async function visit(dir) {
    for (const entry of await fs.promises.readdir(dir, { withFileTypes: true })) {
      const entryPath = path.join(dir, entry.name)
      if (entry.isDirectory()) await visit(entryPath)
      else if (entry.isFile()) files.push(entryPath)
    }
  }
  await visit(root)
  return files
}

async function copyFile(src, dst, force = false) {
  if (!force) {
    try {
      const [srcStat, dstStat] = await Promise.all([
        fs.promises.stat(src),
        fs.promises.stat(dst),
      ])
      if (dstStat.mtimeMs >= srcStat.mtimeMs) return
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
    }
  }

  await fs.promises.mkdir(path.dirname(dst), { recursive: true })
  await fs.promises.copyFile(src, dst)
}

async function copyTree(srcRoot, dstRoot, { exclude, force = false } = {}) {
  for (const src of await listFiles(srcRoot)) {
    const relativePath = path.relative(srcRoot, src)
    if (exclude?.(relativePath)) continue
    await copyFile(src, path.join(dstRoot, relativePath), force)
  }
}

async function removeStaleFiles() {
  for (const stagedFile of await listFiles(STAGED_SRC_DIR)) {
    const relativePath = path.relative(STAGED_SRC_DIR, stagedFile)
    const upstreamFile = path.join(SRC_DIR, relativePath)
    const overlayFile = path.join(OVERLAY_DIR, relativePath)
    const exists = await Promise.all([upstreamFile, overlayFile].map(fileExists))
    if (!exists.some(Boolean)) await fs.promises.rm(stagedFile)
  }

  await removeEmptyDirectories(STAGED_SRC_DIR)
}

async function fileExists(file) {
  try {
    return (await fs.promises.stat(file)).isFile()
  } catch (err) {
    if (err.code === 'ENOENT') return false
    throw err
  }
}

async function removeEmptyDirectories(root) {
  const entries = await fs.promises.readdir(root, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const dir = path.join(root, entry.name)
    await removeEmptyDirectories(dir)
    if ((await fs.promises.readdir(dir)).length === 0) await fs.promises.rmdir(dir)
  }
}

async function applyPatches() {
  const patches = (await fs.promises.readdir(PATCHES_DIR))
    .filter(file => file.endsWith('.patch'))
    .sort()

  for (const patch of patches) {
    const patchPath = path.join(PATCHES_DIR, patch)
    if (await gitApply(['--reverse', '--check', '--directory=.staging-chromium', patchPath], true)) {
      continue
    }
    await gitApply(['--directory=.staging-chromium', patchPath])
  }
}

function gitApply(args, checkOnly = false) {
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['apply', ...args], {
      cwd: ROOT,
      stdio: checkOnly ? 'ignore' : 'inherit',
    })
    child.on('error', reject)
    child.on('exit', (code, signal) => {
      if (checkOnly) return resolve(code === 0)
      if (code === 0) resolve(true)
      else reject(new Error(`git apply failed${signal ? ` (${signal})` : ` with exit code ${code}`}`))
    })
  })
}

async function checkManifestDrift() {
  const [firefoxSource, chromiumSource] = await Promise.all([
    fs.promises.readFile(path.join(SRC_DIR, 'manifest.json'), 'utf8'),
    fs.promises.readFile(path.join(OVERLAY_DIR, 'manifest.json'), 'utf8'),
  ])
  const firefoxManifest = JSON.parse(firefoxSource)
  const chromiumManifest = JSON.parse(chromiumSource)

  if (firefoxManifest.version !== chromiumManifest.version) {
    throw new Error(
      `Chromium manifest drift: version ${chromiumManifest.version} does not match ` +
        `Firefox version ${firefoxManifest.version}`
    )
  }

  const expected = new Set(Object.keys(firefoxManifest.commands ?? {}))
  for (const command of DROPPED_CHROMIUM_COMMANDS) expected.delete(command)
  for (const command of ADDED_CHROMIUM_COMMANDS) expected.add(command)

  const actual = new Set(Object.keys(chromiumManifest.commands ?? {}))
  const missing = [...expected].filter(command => !actual.has(command)).sort()
  const unexpected = [...actual].filter(command => !expected.has(command)).sort()
  if (missing.length || unexpected.length) {
    const details = []
    if (missing.length) details.push(`missing: ${missing.join(', ')}`)
    if (unexpected.length) details.push(`unexpected: ${unexpected.join(', ')}`)
    throw new Error(`Chromium manifest command drift (${details.join('; ')})`)
  }
}

let staging = false
let stageAgain = false
async function stage() {
  if (staging) {
    stageAgain = true
    return
  }

  staging = true
  try {
    await fs.promises.mkdir(STAGED_SRC_DIR, { recursive: true })
    await copyTree(SRC_DIR, STAGED_SRC_DIR)
    await copyTree(OVERLAY_DIR, STAGED_SRC_DIR, {
      exclude: relativePath => relativePath === 'README.md',
      force: true,
    })
    await removeStaleFiles()
    await applyPatches()
    await checkManifestDrift()
    console.log('Chromium staging complete')
  } finally {
    staging = false
    if (stageAgain) {
      stageAgain = false
      await stage()
    }
  }
}

async function watchTree(root, onChange) {
  const watchers = new Map()

  async function refresh() {
    const dirs = new Set([root])
    async function visit(dir) {
      for (const entry of await fs.promises.readdir(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue
        const child = path.join(dir, entry.name)
        dirs.add(child)
        await visit(child)
      }
    }
    await visit(root)

    for (const dir of dirs) {
      if (watchers.has(dir)) continue
      const watcher = fs.watch(dir, () => onChange(refresh))
      watcher.on('error', err => console.error(`Chromium staging watcher failed: ${err.message}`))
      watchers.set(dir, watcher)
    }
    for (const [dir, watcher] of watchers) {
      if (!dirs.has(dir)) {
        watcher.close()
        watchers.delete(dir)
      }
    }
  }

  await refresh()
}

async function main() {
  await stage()
  if (!IS_DEV) return

  let timer
  const changed = refresh => {
    clearTimeout(timer)
    timer = setTimeout(async () => {
      try {
        await refresh()
        await stage()
      } catch (err) {
        console.error(`Chromium staging failed: ${err.stack ?? err}`)
        process.exitCode = 1
      }
    }, 40)
  }
  await Promise.all([watchTree(SRC_DIR, changed), watchTree(OVERLAY_DIR, changed)])
  console.log('Chromium staging watching for changes')
}

main().catch(err => {
  console.error(`Chromium staging failed: ${err.stack ?? err}`)
  process.exitCode = 1
})
