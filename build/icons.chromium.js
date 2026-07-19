/* eslint no-console: off */
import fs from 'node:fs'
import path from 'node:path'
import { Resvg } from '@resvg/resvg-js'

const SOURCE = path.resolve('src/assets/logo.svg')
const OUTPUT_DIR = path.resolve('addon-chromium/assets')
const SIZES = [16, 32, 48, 128]
const IS_DEV = process.argv.includes('--dev')

async function build() {
  const svg = await fs.promises.readFile(SOURCE)
  await fs.promises.mkdir(OUTPUT_DIR, { recursive: true })

  await Promise.all(
    SIZES.map(size => {
      const image = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render()
      return fs.promises.writeFile(path.join(OUTPUT_DIR, `logo-${size}.png`), image.asPng())
    })
  )
  console.log('Chromium icons: Done')
}

async function main() {
  await build()
  if (!IS_DEV) return

  let timer
  fs.watch(SOURCE, () => {
    clearTimeout(timer)
    timer = setTimeout(() => build().catch(reportError), 40)
  })
  console.log('Chromium icons: Watching')
}

function reportError(err) {
  console.error(`Chromium icons failed: ${err.stack ?? err}`)
  process.exitCode = 1
}

main().catch(reportError)
