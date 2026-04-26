import path from 'path'
import fs from 'fs'
import { watch } from 'chokidar'
import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from 'electron'

// 文档解析模块（仅在主进程使用）
let mammoth: any = null
let xlsx: any = null
let pdfParse: any = null

// 动态导入文档解析库
async function initDocumentParsers() {
  try {
    mammoth = await import('mammoth')
    xlsx = await import('xlsx')
    pdfParse = (await import('pdf-parse')).default
  } catch (error) {
    console.error('Failed to load document parsers:', error)
  }
}

// 配置文件路径
let configPath: string

// 默认配置
const defaultConfig = {
  provider: 'openai',
  apiKey: '',
  baseUrl: '',
  model: '',
  maxTokens: 4096,
  syncDir: '',
  theme: 'light',
  notesDir: '',
  obsidianVaultPath: '',
  obsidianAutoSync: false,
  obsidianExcludeFolders: ['.obsidian', 'node_modules', '.git'],
  hiddenCategories: ['Obsidian同步']
}

// 加载配置
function loadConfig(): any {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8')
      return { ...defaultConfig, ...JSON.parse(data) }
    }
  } catch (error) {
    console.error('Failed to load config:', error)
  }
  return { ...defaultConfig }
}

// 保存配置
function saveConfig(config: any) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
    return true
  } catch (error) {
    console.error('Failed to save config:', error)
    return false
  }
}

let config = loadConfig()
let mainWindow: BrowserWindow | null = null
let fileWatcher: ReturnType<typeof watch> | null = null

// 日志缓冲区
let logBuffer: string[] = []
let logFlushTimer: ReturnType<typeof setInterval> | null = null
const LOG_FLUSH_INTERVAL = 5000 // 5秒刷新一次日志

// 日志函数
function log(level: string, message: string, data?: any) {
  // 生产环境减少日志输出
  if (process.env.NODE_ENV === 'production' && level === 'DEBUG') {
    return
  }

  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] [${level}] ${message}${data ? ' ' + JSON.stringify(data) : ''}`
  console.log(logMessage)

  // 添加到缓冲区
  logBuffer.push(logMessage)

  // 如果还没有启动定时器，启动一个
  if (!logFlushTimer) {
    logFlushTimer = setInterval(flushLogBuffer, LOG_FLUSH_INTERVAL)
  }
}

// 刷新日志缓冲区到文件
function flushLogBuffer() {
  if (logBuffer.length === 0) return

  const logDir = app.getPath('userData')
  const logFile = path.join(logDir, 'app.log')
  try {
    fs.appendFileSync(logFile, logBuffer.join('\n') + '\n')
    logBuffer = []
  } catch {}
}

// 应用退出时刷新日志
function cleanupLog() {
  if (logFlushTimer) {
    clearInterval(logFlushTimer)
    logFlushTimer = null
  }
  flushLogBuffer()
}

function createWindow() {
  log('INFO', 'Creating main window')

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false,
    backgroundColor: '#ffffff'
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow!.show()
    log('INFO', 'Main window shown')
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        { label: '新建笔记', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('menu-new-note') },
        { label: '保存', accelerator: 'CmdOrCtrl+S', click: () => mainWindow?.webContents.send('menu-save') },
        { type: 'separator' },
        { label: '导出当前笔记', accelerator: 'CmdOrCtrl+E', click: () => mainWindow?.webContents.send('menu-export-note') },
        { type: 'separator' },
        { label: '设置', accelerator: 'CmdOrCtrl+,', click: () => mainWindow?.webContents.send('menu-open-settings') },
        { type: 'separator' },
        { label: '退出', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '重做', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '刷新', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: '强制刷新', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { type: 'separator' },
        { label: '搜索笔记', accelerator: 'CmdOrCtrl+F', click: () => mainWindow?.webContents.send('menu-focus-search') },
        { label: '全局搜索', accelerator: 'CmdOrCtrl+Shift+F', click: () => mainWindow?.webContents.send('menu-global-search') },
        { type: 'separator' },
        { label: '切换侧边栏', accelerator: 'CmdOrCtrl+Shift+D', click: () => mainWindow?.webContents.send('menu-toggle-sidebar') },
        { type: 'separator' },
        { label: '实际大小', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: '切换全屏', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: async () => {
            mainWindow?.webContents.send('menu-show-about')
          }
        },
        { type: 'separator' },
        { label: '开发者工具', accelerator: 'F12', click: () => mainWindow?.webContents.toggleDevTools() }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function getNotesDir(): string {
  if (config.notesDir && fs.existsSync(config.notesDir)) {
    return config.notesDir
  }
  const defaultDir = path.join(app.getPath('documents'), 'KnowledgeBase')
  if (!fs.existsSync(defaultDir)) {
    fs.mkdirSync(defaultDir, { recursive: true })
  }
  config.notesDir = defaultDir
  saveConfig(config)
  return defaultDir
}

function createDefaultDirs() {
  const notesDir = getNotesDir()
  const defaultCategories = ['技术文档', '读书笔记', '工作日志', '模板']
  defaultCategories.forEach(category => {
    const categoryPath = path.join(notesDir, category)
    if (!fs.existsSync(categoryPath)) {
      fs.mkdirSync(categoryPath, { recursive: true })
    }
  })
}

function setupIpcHandlers() {
  ipcMain.handle('get-config', () => config)
  ipcMain.handle('save-config', (_, newConfig) => {
    config = { ...config, ...newConfig }
    saveConfig(config)
    return true
  })
  ipcMain.handle('get-notes-dir', () => getNotesDir())
  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, { properties: ['openDirectory'] })
    return !result.canceled && result.filePaths.length > 0 ? result.filePaths[0] : null
  })

  // 笔记相关
  ipcMain.handle('get-notes', async () => {
    const notesDir = getNotesDir()
    const notes: any[] = []

    function scanDir(dir: string) {
      try {
        fs.readdirSync(dir).forEach(file => {
          const filePath = path.join(dir, file)
          try {
            const stat = fs.statSync(filePath)
            if (stat.isDirectory()) {
              scanDir(filePath)
            } else if (file.endsWith('.md')) {
              const relativePath = path.relative(notesDir, filePath)
              const pathParts = relativePath.split(path.sep)
              const category = pathParts.length > 1 ? pathParts[0] : '根目录'

              let tags: string[] = []
              let title = file.replace('.md', '')
              let preview = ''

              // 只读取前 500 字节用于提取元数据，不读取完整内容
              const fd = fs.openSync(filePath, 'r')
              const buffer = Buffer.alloc(500)
              const bytesRead = fs.readSync(fd, buffer, 0, 500, 0)
              fs.closeSync(fd)
              const headContent = buffer.toString('utf-8', 0, bytesRead)

              const frontmatterMatch = headContent.match(/^---\n([\s\S]*?)\n---/)
              if (frontmatterMatch) {
                const frontmatter = frontmatterMatch[1]
                const titleMatch = frontmatter.match(/title:\s*(.+)/)
                const tagsMatch = frontmatter.match(/tags:\s*\[([^\]]*)\]/)
                if (titleMatch) title = titleMatch[1].trim()
                if (tagsMatch) tags = tagsMatch[1].split(',').map((t: string) => t.trim()).filter((t: string) => t)
              }

              // 提取预览内容（移除 frontmatter 和标题）
              const withoutFM = headContent.replace(/^---[\s\S]*?---\n/, '')
              const withoutTitle = withoutFM.replace(/^#\s+.+$/m, '')
              preview = withoutTitle.substring(0, 100).replace(/\n/g, ' ').trim()

              notes.push({ id: relativePath, path: filePath, title, category, tags, preview, updatedAt: stat.mtime.toISOString() })
            }
          } catch {}
        })
      } catch {}
    }

    scanDir(notesDir)
    return notes
  })

  ipcMain.handle('read-note', async (_, notePath: string) => {
    try {
      return { success: true, content: fs.readFileSync(notePath, 'utf-8') }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('save-note', async (_, notePath: string, content: string) => {
    try {
      const dir = path.dirname(notePath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(notePath, content, 'utf-8')
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('create-note', async (_, category: string, title: string) => {
    const notesDir = getNotesDir()
    const categoryPath = path.join(notesDir, category)
    if (!fs.existsSync(categoryPath)) fs.mkdirSync(categoryPath, { recursive: true })

    let fileName = title + '.md'
    let filePath = path.join(categoryPath, fileName)
    let counter = 1
    while (fs.existsSync(filePath)) {
      fileName = `${title}_${counter}.md`
      filePath = path.join(categoryPath, fileName)
      counter++
    }

    const content = `---
title: ${title}
tags: []
created: ${new Date().toISOString()}
---

# ${title}

`
    fs.writeFileSync(filePath, content, 'utf-8')
    return { success: true, path: filePath, fileName }
  })

  ipcMain.handle('delete-note', async (_, notePath: string) => {
    try {
      fs.unlinkSync(notePath)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // 分类相关
  ipcMain.handle('get-categories', () => {
    const notesDir = getNotesDir()
    const config = loadConfig()
    const hidden = config.hiddenCategories || []
    const categories: string[] = []
    if (fs.existsSync(notesDir)) {
      try {
        fs.readdirSync(notesDir).forEach(file => {
          const filePath = path.join(notesDir, file)
          try {
            if (fs.statSync(filePath).isDirectory() && !hidden.includes(file)) {
              categories.push(file)
            }
          } catch {}
        })
      } catch {}
    }
    return categories
  })

  // 获取所有分类（包括隐藏的）
  ipcMain.handle('get-all-categories', () => {
    const notesDir = getNotesDir()
    const categories: string[] = []
    if (fs.existsSync(notesDir)) {
      try {
        fs.readdirSync(notesDir).forEach(file => {
          const filePath = path.join(notesDir, file)
          try {
            if (fs.statSync(filePath).isDirectory()) categories.push(file)
          } catch {}
        })
      } catch {}
    }
    return categories
  })

  // 重命名分类
  ipcMain.handle('rename-category', (_, oldName: string, newName: string) => {
    const notesDir = getNotesDir()
    const oldPath = path.join(notesDir, oldName)
    const newPath = path.join(notesDir, newName)
    try {
      if (!fs.existsSync(oldPath)) {
        return { success: false, error: `分类 "${oldName}" 不存在` }
      }
      if (fs.existsSync(newPath)) {
        return { success: false, error: `分类 "${newName}" 已存在` }
      }
      fs.renameSync(oldPath, newPath)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // 切换分类隐藏状态
  ipcMain.handle('toggle-category-hidden', (_, categoryName: string) => {
    const config = loadConfig()
    if (!config.hiddenCategories) config.hiddenCategories = []
    const idx = config.hiddenCategories.indexOf(categoryName)
    if (idx >= 0) {
      config.hiddenCategories.splice(idx, 1)
    } else {
      config.hiddenCategories.push(categoryName)
    }
    saveConfig(config)
    return { success: true, hidden: config.hiddenCategories.includes(categoryName) }
  })

  // 获取隐藏分类列表
  ipcMain.handle('get-hidden-categories', () => {
    const config = loadConfig()
    return config.hiddenCategories || []
  })

  // 检查分类目录是否存在
  ipcMain.handle('check-category-exists', (_, categoryName: string) => {
    const notesDir = getNotesDir()
    const dirPath = path.join(notesDir, categoryName)
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()
  })

  // 模板相关
  ipcMain.handle('get-templates', () => {
    const notesDir = getNotesDir()
    const templatesDir = path.join(notesDir, '模板')
    const templates: any[] = []
    if (fs.existsSync(templatesDir)) {
      try {
        fs.readdirSync(templatesDir).forEach(file => {
          if (file.endsWith('.md')) {
            const filePath = path.join(templatesDir, file)
            try {
              const content = fs.readFileSync(filePath, 'utf-8')
              templates.push({ name: file.replace('.md', ''), path: filePath, content })
            } catch {}
          }
        })
      } catch {}
    }
    return templates
  })

  ipcMain.handle('create-template', async (_, name: string, content: string) => {
    const notesDir = getNotesDir()
    const templatesDir = path.join(notesDir, '模板')
    if (!fs.existsSync(templatesDir)) fs.mkdirSync(templatesDir, { recursive: true })
    fs.writeFileSync(path.join(templatesDir, `${name}.md`), content, 'utf-8')
    return { success: true }
  })

  ipcMain.handle('open-external', (_, url: string) => {
    if (url === 'open-readme') {
      const appPath = app.isPackaged
        ? path.dirname(app.getPath('exe'))
        : path.join(__dirname, '..', '..')
      const readmePath = path.join(appPath, 'README.md')
      if (fs.existsSync(readmePath)) {
        shell.openPath(readmePath)
      } else {
        const fallbackPath = path.join(process.cwd(), 'README.md')
        if (fs.existsSync(fallbackPath)) {
          shell.openPath(fallbackPath)
        }
      }
    } else {
      shell.openExternal(url)
    }
  })

  // 文件监视
  ipcMain.handle('start-watch', () => {
    const syncDir = config.syncDir
    if (fileWatcher) fileWatcher.close()
    if (syncDir && fs.existsSync(syncDir)) {
      fileWatcher = watch(syncDir, { ignored: /^\./, persistent: true, depth: 5 })
      fileWatcher.on('change', (fp) => { if (fp.endsWith('.md')) mainWindow?.webContents.send('file-changed', fp) })
      fileWatcher.on('add', (fp) => { if (fp.endsWith('.md')) mainWindow?.webContents.send('file-added', fp) })
      fileWatcher.on('unlink', (fp) => { if (fp.endsWith('.md')) mainWindow?.webContents.send('file-removed', fp) })
      return { success: true }
    }
    return { success: false, error: '同步目录未设置或不存在' }
  })

  ipcMain.handle('stop-watch', () => {
    if (fileWatcher) { fileWatcher.close(); fileWatcher = null }
    return { success: true }
  })

  // Obsidian 相关
  ipcMain.handle('validate-obsidian-vault', async (_, vaultPath: string) => {
    try {
      if (!vaultPath || !fs.existsSync(vaultPath)) return { valid: false, error: '路径不存在' }
      return fs.existsSync(path.join(vaultPath, '.obsidian'))
        ? { valid: true, error: null }
        : { valid: false, error: '不是有效的 Obsidian vault' }
    } catch (error: any) { return { valid: false, error: error.message } }
  })

  ipcMain.handle('get-obsidian-structure', async (_, vaultPath: string, excludeFolders: string[] = []) => {
    try {
      const folders: any[] = []
      function scan(dir: string, depth = 0) {
        if (depth > 5) return
        try {
          fs.readdirSync(dir).forEach(file => {
            if (excludeFolders.includes(file) || file.startsWith('.')) return
            const filePath = path.join(dir, file)
            if (fs.statSync(filePath).isDirectory()) {
              folders.push({ name: file, path: filePath, hasChildren: fs.readdirSync(filePath).some(f => fs.statSync(path.join(filePath, f)).isDirectory()) })
              scan(filePath, depth + 1)
            }
          })
        } catch {}
      }
      if (!vaultPath || !fs.existsSync(vaultPath)) return { success: false, error: '路径不存在' }
      scan(vaultPath)
      return { success: true, folders }
    } catch (error: any) { return { success: false, error: error.message } }
  })

  ipcMain.handle('sync-obsidian-notes', async (_, vaultPath: string, targetDir: string, excludeFolders: string[] = []) => {
    try {
      let syncedCount = 0
      function syncDir(sourceDir: string, targetSubDir: string, depth = 0) {
        if (depth > 10) return
        try {
          fs.readdirSync(sourceDir).forEach(file => {
            if (excludeFolders.includes(file) || file.startsWith('.')) return
            const sourcePath = path.join(sourceDir, file)
            const stat = fs.statSync(sourcePath)
            if (stat.isDirectory()) {
              const targetPath = path.join(targetDir, targetSubDir, file)
              if (!fs.existsSync(targetPath)) fs.mkdirSync(targetPath, { recursive: true })
              syncDir(sourcePath, path.join(targetSubDir, file), depth + 1)
            } else if (['.md', '.txt'].includes(path.extname(file).toLowerCase())) {
              const targetPath = path.join(targetDir, targetSubDir, file)
              const shouldSync = !fs.existsSync(targetPath) || fs.statSync(targetPath).mtime < stat.mtime
              if (shouldSync) {
                const content = fs.readFileSync(sourcePath, 'utf-8')
                if (!content.startsWith('---')) {
                  const relativePath = path.relative(vaultPath, sourcePath)
                  fs.writeFileSync(targetPath, `---\nsource: obsidian\nsource_path: ${relativePath.replace(/\\/g, '/')}\nsynced_at: ${new Date().toISOString()}\n---\n\n${content}`, 'utf-8')
                } else {
                  fs.writeFileSync(targetPath, content, 'utf-8')
                }
                syncedCount++
              }
            }
          })
        } catch {}
      }
      if (!vaultPath || !fs.existsSync(vaultPath)) return { success: false, error: 'Obsidian 路径不存在', syncedCount: 0 }
      if (!targetDir || !fs.existsSync(targetDir)) return { success: false, error: '目标目录不存在', syncedCount: 0 }
      const obsidianSyncDir = path.join(targetDir, 'Obsidian同步')
      if (!fs.existsSync(obsidianSyncDir)) fs.mkdirSync(obsidianSyncDir, { recursive: true })
      syncDir(vaultPath, '')
      return { success: true, syncedCount, error: null }
    } catch (error: any) { return { success: false, error: error.message, syncedCount: 0 } }
  })

  ipcMain.handle('get-obsidian-notes', async (_, vaultPath: string, excludeFolders: string[] = []) => {
    const notes: any[] = []
    function scan(dir: string) {
      try {
        fs.readdirSync(dir).forEach(file => {
          if (excludeFolders.includes(file) || file.startsWith('.')) return
          const filePath = path.join(dir, file)
          const stat = fs.statSync(filePath)
          if (stat.isDirectory()) { scan(filePath) }
          else if (file.endsWith('.md')) {
            try {
              const content = fs.readFileSync(filePath, 'utf-8')
              const relativePath = path.relative(vaultPath, filePath)
              const pathParts = relativePath.split(path.sep)
              const category = pathParts.length > 1 ? pathParts[0] : '根目录'
              let tags: string[] = []
              let title = file.replace('.md', '')
              const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
              if (frontmatterMatch) {
                const frontmatter = frontmatterMatch[1]
                const titleMatch = frontmatter.match(/title:\s*(.+)/)
                const tagsMatch = frontmatter.match(/tags:\s*\[([^\]]*)\]/)
                if (titleMatch) title = titleMatch[1].trim()
                if (tagsMatch) tags = tagsMatch[1].split(',').map((t: string) => t.trim()).filter((t: string) => t)
              }
              notes.push({ id: relativePath, path: filePath, title, category, tags, updatedAt: stat.mtime.toISOString() })
            } catch {}
          }
        })
      } catch {}
    }
    if (!vaultPath || !fs.existsSync(vaultPath)) return { success: false, error: '路径不存在', notes: [] }
    scan(vaultPath)
    return { success: true, notes }
  })

  // 文档导入
  ipcMain.handle('select-files', async (_, options?: any) => {
    try {
      const result = await dialog.showOpenDialog(mainWindow!, {
        properties: ['openFile', 'multiSelections'],
        filters: options?.filters || [{ name: '支持的文档', extensions: ['md', 'txt', 'docx', 'xlsx', 'xls', 'pdf'] }, { name: '所有文件', extensions: ['*'] }]
      })
      return result.canceled ? { success: true, filePaths: [] } : { success: true, filePaths: result.filePaths }
    } catch (error: any) { return { success: false, error: error.message, filePaths: [] } }
  })

  ipcMain.handle('import-document', async (_, filePath: string, targetDir: string, category: string) => {
    try {
      await initDocumentParsers()
      const ext = path.extname(filePath).toLowerCase()
      const baseName = path.basename(filePath, ext)
      const targetCategoryDir = path.join(targetDir, category || '文档库')
      if (!fs.existsSync(targetCategoryDir)) fs.mkdirSync(targetCategoryDir, { recursive: true })

      let content = ''
      let title = baseName
      const metadata: any = { source_file: path.basename(filePath), imported_at: new Date().toISOString() }

      switch (ext) {
        case '.md': case '.txt':
          content = fs.readFileSync(filePath, 'utf-8')
          const titleMatch = content.match(/^#\s+(.+)$/m)
          if (titleMatch) title = titleMatch[1]
          break
        case '.docx':
          if (mammoth) { content = (await mammoth.extractRawText({ path: filePath })).value; const fl = content.split('\n')[0]?.trim(); if (fl && fl.length < 100) title = fl }
          break
        case '.xlsx': case '.xls':
          if (xlsx) {
            const workbook = xlsx.readFile(filePath)
            const sheets: string[] = []
            workbook.SheetNames.forEach((sn: string) => {
              const sheet = workbook.Sheets[sn]
              const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][]
              if (rawData.length === 0) return

              // 转换为 Markdown 表格
              const headers = rawData[0].map((h: any) => String(h ?? ''))
              const rows = rawData.slice(1)

              let table = `| ${headers.join(' | ')} |\n`
              table += `| ${headers.map(() => '---').join(' | ')} |\n`
              for (const row of rows) {
                const cells = row.map((c: any) => String(c ?? ''))
                // 补齐列数
                while (cells.length < headers.length) cells.push('')
                table += `| ${cells.join(' | ')} |\n`
              }

              const rowCount = rows.length
              sheets.push(`## ${sn}\n\n共 ${rowCount} 行数据\n\n${table}`)
            })
            content = sheets.join('\n\n---\n\n')
          }
          break
        case '.pdf':
          if (pdfParse) { const pdfData = fs.readFileSync(filePath); const pdfContent = await pdfParse(pdfData); content = pdfContent.text; metadata.pages = String(pdfContent.numpages) }
          break
        default:
          try { content = fs.readFileSync(filePath, 'utf-8') } catch { return { success: false, error: `不支持的文件格式: ${ext}` } }
      }

      let finalFileName = `${title}.md`
      let targetPath = path.join(targetCategoryDir, finalFileName)
      let counter = 1
      while (fs.existsSync(targetPath)) { finalFileName = `${title}_${counter}.md`; targetPath = path.join(targetCategoryDir, finalFileName); counter++ }

      const metadataStr = Object.entries(metadata).map(([k, v]) => `${k}: ${v}`).join('\n')
      fs.writeFileSync(targetPath, `---\ntitle: ${title}\n${metadataStr}\n---\n\n# ${title}\n\n${content}`, 'utf-8')
      return { success: true, path: targetPath }
    } catch (error: any) { return { success: false, error: error.message } }
  })

  ipcMain.handle('import-documents-batch', async (_, filePaths: string[], targetDir: string, category: string) => {
    const results: any[] = []
    for (const fp of filePaths) {
      try {
        await initDocumentParsers()
        const ext = path.extname(fp).toLowerCase()
        const baseName = path.basename(fp, ext)
        const targetCategoryDir = path.join(targetDir, category || '文档库')
        if (!fs.existsSync(targetCategoryDir)) fs.mkdirSync(targetCategoryDir, { recursive: true })

        let content = ''
        let title = baseName
        const metadata: any = { source_file: path.basename(fp), imported_at: new Date().toISOString() }

        switch (ext) {
          case '.md': case '.txt':
            content = fs.readFileSync(fp, 'utf-8')
            const titleMatch = content.match(/^#\s+(.+)$/m)
            if (titleMatch) title = titleMatch[1]
            break
          case '.docx':
            if (mammoth) { content = (await mammoth.extractRawText({ path: fp })).value; const fl = content.split('\n')[0]?.trim(); if (fl && fl.length < 100) title = fl }
            break
          case '.xlsx': case '.xls':
            if (xlsx) {
              const workbook = xlsx.readFile(fp)
              const data: any = {}
              workbook.SheetNames.forEach((sn: string) => { const sheet = workbook.Sheets[sn]; data[sn] = (xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][]).map(row => row.join(' | ')).join('\n') })
              content = Object.entries(data).map(([sn, sd]) => `## ${sn}\n\n${sd}`).join('\n\n---\n\n')
            }
            break
          case '.pdf':
            if (pdfParse) { const pdfData = fs.readFileSync(fp); const pdfContent = await pdfParse(pdfData); content = pdfContent.text; metadata.pages = String(pdfContent.numpages) }
            break
          default:
            try { content = fs.readFileSync(fp, 'utf-8') } catch { results.push({ filePath: fp, success: false, error: `不支持的文件格式: ${ext}` }); continue }
        }

        let finalFileName = `${title}.md`
        let targetPath = path.join(targetCategoryDir, finalFileName)
        let counter = 1
        while (fs.existsSync(targetPath)) { finalFileName = `${title}_${counter}.md`; targetPath = path.join(targetCategoryDir, finalFileName); counter++ }

        const metadataStr = Object.entries(metadata).map(([k, v]) => `${k}: ${v}`).join('\n')
        fs.writeFileSync(targetPath, `---\ntitle: ${title}\n${metadataStr}\n---\n\n# ${title}\n\n${content}`, 'utf-8')
        results.push({ filePath: fp, success: true, path: targetPath })
      } catch (error: any) { results.push({ filePath: fp, success: false, error: error.message }) }
    }
    return results
  })

  // 回收站
  ipcMain.handle('move-to-trash', async (_, notePath: string, notesDir: string) => {
    try {
      const trashDir = path.join(notesDir, '.trash')
      if (!fs.existsSync(trashDir)) fs.mkdirSync(trashDir, { recursive: true })
      const fileName = path.basename(notePath)
      const targetPath = path.join(trashDir, fileName)
      fs.renameSync(notePath, targetPath)
      return { success: true, path: targetPath }
    } catch (error: any) { return { success: false, error: error.message } }
  })

  ipcMain.handle('get-trash-notes', async (_, notesDir: string) => {
    const trashDir = path.join(notesDir, '.trash')
    const notes: any[] = []
    if (fs.existsSync(trashDir)) {
      try {
        fs.readdirSync(trashDir).forEach(file => {
          if (file.endsWith('.md')) {
            const filePath = path.join(trashDir, file)
            try { const stat = fs.statSync(filePath); notes.push({ id: file, path: filePath, title: file.replace('.md', ''), deletedAt: stat.mtime.toISOString() }) } catch {}
          }
        })
      } catch {}
    }
    return { success: true, notes }
  })

  ipcMain.handle('restore-from-trash', async (_, trashPath: string, notesDir: string) => {
    try {
      fs.renameSync(trashPath, path.join(notesDir, path.basename(trashPath)))
      return { success: true }
    } catch (error: any) { return { success: false, error: error.message } }
  })

  ipcMain.handle('permanent-delete', async (_, trashPath: string) => {
    try { fs.unlinkSync(trashPath); return { success: true } } catch (error: any) { return { success: false, error: error.message } }
  })

  ipcMain.handle('empty-trash', async (_, notesDir: string) => {
    const trashDir = path.join(notesDir, '.trash')
    try {
      if (fs.existsSync(trashDir)) fs.readdirSync(trashDir).forEach(f => fs.unlinkSync(path.join(trashDir, f)))
      return { success: true }
    } catch (error: any) { return { success: false, error: error.message } }
  })

  // 导出
  ipcMain.handle('export-note', async (_, notePath: string, format: string) => {
    try {
      const content = fs.readFileSync(notePath, 'utf-8')
      const baseName = path.basename(notePath, '.md')

      let exportContent: string
      if (format === 'txt') {
        exportContent = content.replace(/^---[\s\S]*?---\n/, '')
      } else if (format === 'html') {
        const withoutFM = content.replace(/^---[\s\S]*?---\n/, '')
        // 简单的 Markdown 转 HTML（标题、段落、列表、代码块、粗体/斜体、链接）
        let html = withoutFM
          // 代码块
          .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
          // 标题
          .replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
          .replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
          .replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
          .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
          .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
          .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
          // 粗体和斜体
          .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          // 行内代码
          .replace(/`([^`]+)`/g, '<code>$1</code>')
          // 链接和图片
          .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
          // 无序列表
          .replace(/^[\s]*[-*+]\s+(.+)$/gm, '<li>$1</li>')
          // 有序列表
          .replace(/^[\s]*\d+\.\s+(.+)$/gm, '<li>$1</li>')
          // 水平线
          .replace(/^---$/gm, '<hr>')
          .replace(/^\*\*\*$/gm, '<hr>')
          // 段落（换行）
          .replace(/\n\n/g, '</p><p>')
          .replace(/\n/g, '<br>')

        exportContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${baseName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #333; }
    h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; }
    pre { background: #f5f5f5; padding: 16px; border-radius: 6px; overflow-x: auto; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid #ddd; padding-left: 16px; color: #666; margin: 1em 0; }
    img { max-width: 100%; }
    a { color: #0369a1; }
    hr { border: none; border-top: 1px solid #ddd; margin: 2em 0; }
  </style>
</head>
<body>
${html}
</body>
</html>`
      } else {
        exportContent = content
      }

      const result = await dialog.showSaveDialog(mainWindow!, {
        defaultPath: `${baseName}.${format}`,
        filters: [{ name: format.toUpperCase(), extensions: [format] }]
      })
      if (result.canceled || !result.filePath) return { success: false, error: 'Cancelled' }
      fs.writeFileSync(result.filePath, exportContent, 'utf-8')
      shell.showItemInFolder(result.filePath)
      return { success: true, path: result.filePath }
    } catch (error: any) { return { success: false, error: error.message } }
  })

  ipcMain.handle('export-notes-batch', async (_, notePaths: string[], format: string, targetDir: string) => {
    try {
      const exportDir = path.join(targetDir, '导出文件')
      if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true })
      const results: any[] = []
      for (const np of notePaths) {
        try {
          const content = fs.readFileSync(np, 'utf-8')
          let exportContent: string
          if (format === 'txt') {
            exportContent = content.replace(/^---[\s\S]*?---\n/, '')
          } else if (format === 'html') {
            const withoutFM = content.replace(/^---[\s\S]*?---\n/, '')
            let html = withoutFM
              .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
              .replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
              .replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
              .replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
              .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
              .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
              .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
              .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
              .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
              .replace(/\*(.+?)\*/g, '<em>$1</em>')
              .replace(/`([^`]+)`/g, '<code>$1</code>')
              .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
              .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
              .replace(/^[\s]*[-*+]\s+(.+)$/gm, '<li>$1</li>')
              .replace(/^[\s]*\d+\.\s+(.+)$/gm, '<li>$1</li>')
              .replace(/^---$/gm, '<hr>')
              .replace(/^\*\*\*$/gm, '<hr>')
              .replace(/\n\n/g, '</p><p>')
              .replace(/\n/g, '<br>')
            const title = path.basename(np, '.md')
            exportContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #333; }
    h1, h2, h3 { margin-top: 1.5em; margin-bottom: 0.5em; }
    pre { background: #f5f5f5; padding: 16px; border-radius: 6px; overflow-x: auto; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
    pre code { background: none; padding: 0; }
  </style>
</head>
<body>
${html}
</body>
</html>`
          } else {
            exportContent = content
          }
          fs.writeFileSync(path.join(exportDir, `${path.basename(np, '.md')}.${format}`), exportContent, 'utf-8')
          results.push({ filePath: np, success: true })
        } catch (error: any) { results.push({ filePath: np, success: false, error: error.message }) }
      }
      shell.openPath(exportDir)
      return { success: true, total: notePaths.length, successCount: results.filter(r => r.success).length, exportDir, results }
    } catch (error: any) { return { success: false, error: error.message } }
  })
}

app.whenReady().then(async () => {
  configPath = path.join(app.getPath('userData'), 'config.json')
  config = loadConfig()
  await initDocumentParsers()
  log('INFO', 'Application starting')
  createDefaultDirs()
  setupIpcHandlers()
  createWindow()
  createMenu()

  // 监听菜单事件
  mainWindow?.on('ready-to-show', () => {
    // 搜索相关
    ipcMain.on('menu-focus-search', () => mainWindow?.webContents.send('menu-focus-search'))
    ipcMain.on('menu-global-search', () => mainWindow?.webContents.send('menu-global-search'))

    // 视图相关
    ipcMain.on('menu-toggle-sidebar', () => mainWindow?.webContents.send('menu-toggle-sidebar'))

    // 文件相关
    ipcMain.on('menu-export-note', () => mainWindow?.webContents.send('menu-export-note'))
  })
})

app.on('window-all-closed', () => {
  log('INFO', 'All windows closed')
  if (fileWatcher) fileWatcher.close()
  cleanupLog()
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

process.on('uncaughtException', (error) => { log('ERROR', 'Uncaught exception', { message: error.message, stack: error.stack }) })
process.on('unhandledRejection', (reason) => { log('ERROR', 'Unhandled rejection', { reason }) })
