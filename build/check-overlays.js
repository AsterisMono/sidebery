/* eslint no-console: off */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const root = process.cwd()
const lockPath = path.join(root, 'build/overlays.lock.json')
const update = process.argv.includes('--update')

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(target) : [target]
  })
}

const tracked = new Set()
for (const overlay of walk(path.join(root, 'src.chromium'))) {
  const rel = path.relative(path.join(root, 'src.chromium'), overlay)
  const upstream = path.join(root, 'src', rel)
  if (fs.existsSync(upstream)) tracked.add(path.relative(root, upstream))
}
for (const patch of walk(path.join(root, 'patches')).filter(file => file.endsWith('.patch'))) {
  for (const line of fs.readFileSync(patch, 'utf8').split('\n')) {
    const match = /^--- a\/(src\/[^\t ]+)/.exec(line)
    if (match && fs.existsSync(path.join(root, match[1]))) tracked.add(match[1])
  }
}
for (const fork of walk(path.join(root, 'build')).filter(file => /\.chromium\.(js|mjs|ts)$/.test(file))) {
  const rel = path.relative(root, fork)
  const upstream = rel.replace('.chromium.', '.')
  if (fs.existsSync(path.join(root, upstream))) tracked.add(upstream)
}

const current = Object.fromEntries(
  [...tracked].sort().map(file => [
    file,
    execFileSync('git', ['hash-object', file], { cwd: root, encoding: 'utf8' }).trim(),
  ])
)

if (update) {
  fs.writeFileSync(lockPath, JSON.stringify(current, null, 2) + '\n')
  console.log(`Updated ${path.relative(root, lockPath)} (${tracked.size} upstream files)`)
} else {
  const locked = JSON.parse(fs.readFileSync(lockPath, 'utf8'))
  const changed = Object.keys({ ...locked, ...current }).filter(file => locked[file] !== current[file])
  if (changed.length) {
    console.error('Re-review these Chromium overlays/patches:')
    for (const file of changed) console.error(`  ${file}`)
    process.exitCode = 1
  } else console.log(`Chromium overlay baseline is current (${tracked.size} files)`)
}
