import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { applyPatchStack, reversePatchStack } from '../patch-stack.js'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map(directory => fs.promises.rm(directory, { recursive: true, force: true }))
  )
})

describe('Chromium patch stack', () => {
  test('reverses overlapping patches in stack order before reapplying them', async () => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'sidebery-patch-stack-'))
    temporaryDirectories.push(root)

    const stagedDirectory = path.join(root, 'stage', 'src')
    const patchesDirectory = path.join(root, 'patches')
    await fs.promises.mkdir(stagedDirectory, { recursive: true })
    await fs.promises.mkdir(patchesDirectory)
    await fs.promises.writeFile(path.join(stagedDirectory, 'shared.txt'), 'alpha\nshared\nomega\n')

    const firstPatch = path.join(patchesDirectory, '01-first.patch')
    const secondPatch = path.join(patchesDirectory, '02-second.patch')
    await fs.promises.writeFile(
      firstPatch,
      'diff --git a/src/shared.txt b/src/shared.txt\n' +
        '--- a/src/shared.txt\n' +
        '+++ b/src/shared.txt\n' +
        '@@ -1,3 +1,3 @@\n' +
        ' alpha\n' +
        '-shared\n' +
        '+first\n' +
        ' omega\n'
    )
    await fs.promises.writeFile(
      secondPatch,
      'diff --git a/src/shared.txt b/src/shared.txt\n' +
        '--- a/src/shared.txt\n' +
        '+++ b/src/shared.txt\n' +
        '@@ -1,3 +1,3 @@\n' +
        ' alpha\n' +
        '-first\n' +
        '+second\n' +
        ' omega\n'
    )

    const patchPaths = [firstPatch, secondPatch]
    await applyPatchStack(root, 'stage', patchPaths)
    await expect(
      fs.promises.readFile(path.join(stagedDirectory, 'shared.txt'), 'utf8')
    ).resolves.toBe('alpha\nsecond\nomega\n')

    await expect(reversePatchStack(root, 'stage', patchPaths)).resolves.toBe(true)
    await expect(
      fs.promises.readFile(path.join(stagedDirectory, 'shared.txt'), 'utf8')
    ).resolves.toBe('alpha\nshared\nomega\n')

    await applyPatchStack(root, 'stage', patchPaths)
    await expect(
      fs.promises.readFile(path.join(stagedDirectory, 'shared.txt'), 'utf8')
    ).resolves.toBe('alpha\nsecond\nomega\n')
  })
})
