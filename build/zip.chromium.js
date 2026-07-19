import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const root = process.cwd()
const addonDir = path.join(root, 'addon-chromium')
const distDir = path.join(root, 'dist')

async function main() {
  const pkg = JSON.parse(await fs.promises.readFile(path.join(root, 'package.json'), 'utf8'))
  const output = path.join(distDir, `sidebery-${pkg.version}-chromium.zip`)
  await fs.promises.mkdir(distDir, { recursive: true })
  await fs.promises.rm(output, { force: true })
  await new Promise((resolve, reject) => {
    const zip = spawn('zip', ['-qr', output, '.'], { cwd: addonDir, stdio: 'inherit' })
    zip.on('error', reject)
    zip.on('exit', code =>
      code === 0 ? resolve() : reject(new Error(`zip failed with exit code ${code}`))
    )
  })
  console.log(`Chromium package: ${path.relative(root, output)}`)
}

main().catch(err => {
  console.error(`Chromium packaging failed: ${err.stack ?? err}`)
  process.exitCode = 1
})
