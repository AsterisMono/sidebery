// Chromium fork of build/all.vite.js; runs the staged MV3 pipeline in dependency order.
/* eslint no-console: off */
import fs from 'node:fs'
import { spawn } from 'node:child_process'

const IS_DEV = process.argv.includes('--dev')
const OUTPUT_DIR = 'addon-chromium'
const scripts = {
  stage: 'build/stage.chromium.js',
  icons: 'build/icons.chromium.js',
  styles: 'build/styles.chromium.js',
  html: 'build/html.chromium.js',
  copy: 'build/copy.chromium.js',
  vite: 'build/vite.chromium.ts',
}

function start(script, dev = false) {
  const args = [script]
  if (dev) args.push('--dev')
  return spawn(process.execPath, args, { stdio: 'inherit' })
}

function run(script) {
  return new Promise((resolve, reject) => {
    const child = start(script)
    child.on('error', reject)
    child.on('exit', (code, signal) => {
      if (code === 0) resolve()
      else reject(
        new Error(`${script} failed${signal ? ` (${signal})` : ` with exit code ${code}`}`)
      )
    })
  })
}

async function runBuild() {
  await fs.promises.rm(OUTPUT_DIR, { recursive: true, force: true })
  await run(scripts.stage)
  await run(scripts.icons)
  await run(scripts.styles)
  await run(scripts.html)
  await run(scripts.copy)
  await run(scripts.vite)
}

async function runDev() {
  await fs.promises.rm(OUTPUT_DIR, { recursive: true, force: true })
  await run(scripts.stage)
  await run(scripts.icons)

  const children = Object.values(scripts).map(script => start(script, true))
  const stop = signal => children.forEach(child => child.kill(signal))
  process.once('SIGINT', () => stop('SIGINT'))
  process.once('SIGTERM', () => stop('SIGTERM'))

  await Promise.all(
    children.map(
      child =>
        new Promise((resolve, reject) => {
          child.on('error', reject)
          child.on('exit', (code, signal) => {
            if (code === 0 || signal === 'SIGINT' || signal === 'SIGTERM') resolve()
            else reject(new Error(`Chromium development task exited with code ${code}`))
          })
        })
    )
  )
}

;(IS_DEV ? runDev() : runBuild()).catch(err => {
  console.error(`Chromium build failed: ${err.stack ?? err}`)
  process.exitCode = 1
})
