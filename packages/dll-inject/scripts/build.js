const { spawnSync } = require('node:child_process')
const { join } = require('node:path')

if (process.platform !== 'win32') {
  console.log(`Skipping dll-inject native build on ${process.platform}.`)
} else {
  const result = spawnSync(
    process.execPath,
    [require.resolve('node-gyp/bin/node-gyp.js'), 'rebuild'],
    { cwd: join(__dirname, '..'), stdio: 'inherit' },
  )

  if (result.error) {
    console.error(result.error)
  }
  process.exitCode = result.status ?? 1
}
