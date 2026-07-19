import { spawn } from 'node:child_process'

function gitApply(root, args, checkOnly = false) {
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['apply', ...args], {
      cwd: root,
      stdio: checkOnly ? 'ignore' : 'inherit',
    })
    child.on('error', reject)
    child.on('exit', (code, signal) => {
      if (checkOnly) return resolve(code === 0)
      if (code === 0) resolve(true)
      else
        reject(new Error(`git apply failed${signal ? ` (${signal})` : ` with exit code ${code}`}`))
    })
  })
}

export async function applyPatchStack(root, stagingDirectory, patchPaths) {
  for (const patchPath of patchPaths) {
    await gitApply(root, [`--directory=${stagingDirectory}`, patchPath])
  }
}

export async function reversePatchStack(root, stagingDirectory, patchPaths) {
  try {
    for (const patchPath of [...patchPaths].reverse()) {
      const args = ['--reverse', `--directory=${stagingDirectory}`, patchPath]
      if (!(await gitApply(root, ['--check', ...args], true))) return false
      await gitApply(root, args)
    }
    return true
  } catch {
    return false
  }
}
