/* eslint no-console: off */
import fs from 'node:fs'
import path from 'node:path'
import { Resvg } from '@resvg/resvg-js'

const SOURCE = path.resolve('src/assets/logo.svg')
const OUTPUT_DIR = path.resolve('addon-chromium/assets')
const SIZES = [16, 32, 48, 128]

async function main() {
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

main().catch(err => {
  console.error(`Chromium icons failed: ${err.stack ?? err}`)
  process.exitCode = 1
})
