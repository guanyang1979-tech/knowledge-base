/**
 * 开发模式启动脚本
 * - 构建 Electron 主进程文件
 * - 启动 Vite 开发服务器
 * - 启动 Electron 加载渲染页面
 */
import { spawn } from 'child_process'
import { build } from 'esbuild'

// 构建 Electron 主进程
await build({
  entryPoints: ['electron/main.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'dist-electron/main.cjs',
  external: ['electron', 'chokidar'],
  format: 'cjs',
  sourcemap: true
})
console.log('[dev] Built main.cjs')

// 构建 preload
await build({
  entryPoints: ['electron/preload.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'dist-electron/preload.cjs',
  external: ['electron'],
  format: 'cjs',
  sourcemap: true
})
console.log('[dev] Built preload.cjs')

// 启动 Vite 开发服务器
const vite = spawn('npx', ['vite', '--port', '5173'], {
  stdio: ['inherit', 'pipe', 'inherit'],
  shell: true
})

vite.stdout.on('data', (data) => {
  const output = data.toString()
  process.stdout.write(output)

  // 当 Vite 就绪后启动 Electron
  if (output.includes('Local:')) {
    const electron = spawn('npx', ['electron', '.', '--no-sandbox'], {
      stdio: ['inherit', 'inherit', 'inherit'],
      shell: true,
      env: {
        ...process.env,
        VITE_DEV_SERVER_URL: 'http://localhost:5173'
      }
    })

    electron.on('exit', () => {
      vite.kill()
      process.exit(0)
    })
  }
})

vite.on('exit', () => process.exit(0))
