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

  const tasks = Object.values(scripts).map(script => ({ script, child: start(script, true) }))
  await new Promise((resolve, reject) => {
    let remaining = tasks.length
    let shutdownSignal
    let failure

    const stop = signal => {
      for (const task of tasks) {
        if (task.child.exitCode === null && task.child.signalCode === null) task.child.kill(signal)
      }
    }
    const finish = () => {
      if (--remaining !== 0) return
      process.removeListener('SIGINT', onSigint)
      process.removeListener('SIGTERM', onSigterm)
      if (failure) reject(failure)
      else resolve()
    }
    const shutdown = signal => {
      shutdownSignal ??= signal
      stop(signal)
    }
    const onSigint = () => shutdown('SIGINT')
    const onSigterm = () => shutdown('SIGTERM')
    process.once('SIGINT', onSigint)
    process.once('SIGTERM', onSigterm)

    for (const { script, child } of tasks) {
      child.once('error', err => {
        if (!failure) failure = new Error(`${script} failed to start: ${err.message}`)
        stop('SIGTERM')
      })
      child.once('close', (code, signal) => {
        if (!shutdownSignal && !failure) {
          failure = new Error(
            `${script} exited unexpectedly${signal ? ` (${signal})` : ` with exit code ${code}`}`
          )
          stop('SIGTERM')
        }
        finish()
      })
    }
  })
}

;(IS_DEV ? runDev() : runBuild()).catch(err => {
  console.error(`Chromium build failed: ${err.stack ?? err}`)
  process.exitCode = 1
})
