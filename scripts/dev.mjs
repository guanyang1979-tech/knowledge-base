/**
 * 开发模式启动脚本
 * - 构建 Electron 主进程文件
 * - 启动 Vite 开发服务器
 * - 启动 Electron 加载渲染页面
 */
import { spawn } from 'child_process'

// 使用 tsc 构建 Electron 主进程
const tscMain = spawn('npx', ['tsc', 'electron/main.ts', '--outDir', 'dist-electron', '--module', 'commonjs', '--target', 'es2020', '--moduleResolution', 'node', '--esModuleInterop', '--allowSyntheticDefaultImports', '--skipLibCheck'], {
  stdio: ['inherit', 'inherit', 'inherit'],
  shell: true
})

await new Promise((resolve) => tscMain.on('exit', resolve))
console.log('[dev] Built main.js')

// 使用 tsc 构建 preload
const tscPreload = spawn('npx', ['tsc', 'electron/preload.ts', '--outDir', 'dist-electron', '--module', 'commonjs', '--target', 'es2020', '--moduleResolution', 'node', '--esModuleInterop', '--allowSyntheticDefaultImports', '--skipLibCheck'], {
  stdio: ['inherit', 'inherit', 'inherit'],
  shell: true
})

await new Promise((resolve) => tscPreload.on('exit', resolve))
console.log('[dev] Built preload.js')

// 启动 Vite 开发服务器
const vite = spawn('npx', ['vite'], {
  stdio: ['inherit', 'pipe', 'inherit'],
  shell: true
})

let electronStarted = false

vite.stdout.on('data', (data) => {
  const output = data.toString()
  process.stdout.write(output)

  // 当 Vite 就绪后启动 Electron
  // 移除 ANSI 颜色代码后检查
  const cleanOutput = output.replace(/\x1B\[[0-9;]*[mK]/g, '')
  if (!electronStarted && /Local:.*localhost:\d+/.test(cleanOutput)) {
    electronStarted = true

    // 等待一小段时间确保 Vite 完全就绪
    setTimeout(() => {
      // 提取端口号
      const portMatch = cleanOutput.match(/localhost:(\d+)/)
      const port = portMatch ? portMatch[1] : '5173'
      const url = `http://localhost:${port}`

      console.log(`[dev] Starting Electron with ${url}...`)

      // 清除 ELECTRON_RUN_AS_NODE，确保 Electron 以完整应用模式运行
      const electronEnv = { ...process.env, VITE_DEV_SERVER_URL: url }
      delete electronEnv.ELECTRON_RUN_AS_NODE

      const electron = spawn('npx', ['electron', '.', '--no-sandbox'], {
        stdio: ['inherit', 'inherit', 'inherit'],
        shell: true,
        env: electronEnv
      })

      console.log(`[dev] Electron PID: ${electron.pid}`)

      electron.on('error', (err) => {
        console.error('[dev] Electron error:', err)
      })

      electron.on('exit', (code, signal) => {
        console.log(`[dev] Electron exited: code=${code} signal=${signal}`)
        vite.kill()
        process.exit(0)
      })
    }, 2000)
  }
})

vite.on('exit', () => process.exit(0))
