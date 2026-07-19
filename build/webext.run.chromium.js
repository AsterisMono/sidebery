// Chromium-targeted counterpart of build/webext.run.js.
import webExt from 'web-ext'
import fs from 'node:fs'
import path from 'node:path'

const browserArg = process.argv.slice(2).find(arg => !arg.startsWith('-'))
const profileName = browserArg ? path.basename(browserArg).split('.')[0] : 'chromium'
const chromiumProfile = path.resolve(`build/profile-${profileName}`)

async function main() {
  await fs.promises.mkdir(chromiumProfile, { recursive: true })
  const options = {
    target: 'chromium',
    sourceDir: path.resolve('addon-chromium'),
    chromiumProfile,
    keepProfileChanges: true,
  }
  if (browserArg) options.chromiumBinary = browserArg
  await webExt.cmd.run(options, { shouldExitProgram: true })
}

main()
