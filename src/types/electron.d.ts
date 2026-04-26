// Electron preload 脚本暴露的全局 API
export interface ElectronAPI {
  // 配置
  getConfig: () => Promise<Config>
  saveConfig: (config: Partial<Config>) => Promise<boolean>
  getNotesDir: () => Promise<string>
  selectDirectory: () => Promise<string | null>

  // 笔记操作
  getNotes: () => Promise<NoteMetadata[]>
  readNote: (notePath: string) => Promise<{ success: boolean; content?: string; error?: string }>
  saveNote: (notePath: string, content: string) => Promise<{ success: boolean; error?: string }>
  createNote: (category: string, title: string) => Promise<{ success: boolean; path: string; fileName: string }>
  deleteNote: (notePath: string) => Promise<{ success: boolean; error?: string }>

  // 分类
  getCategories: () => Promise<string[]>
  getAllCategories: () => Promise<string[]>
  renameCategory: (oldName: string, newName: string) => Promise<{ success: boolean; error?: string }>
  toggleCategoryHidden: (categoryName: string) => Promise<{ success: boolean; hidden: boolean }>
  getHiddenCategories: () => Promise<string[]>
  checkCategoryExists: (categoryName: string) => Promise<boolean>

  // 模板
  getTemplates: () => Promise<Template[]>
  createTemplate: (name: string, content: string) => Promise<{ success: boolean }>

  // 系统
  openExternal: (url: string) => Promise<void>
  testConnection: (config: any) => Promise<{ success: boolean; error?: string }>
  aiChat: (params: any) => Promise<string>
  onAiStreamToken: (callback: (data: { requestId: string; token: string }) => void) => () => void
  onAiStreamDone: (callback: (data: { requestId: string }) => void) => () => void
  onAiStreamError: (callback: (data: { requestId: string; error: string }) => void) => () => void

  // 文件监控
  startWatch: () => Promise<{ success: boolean; error?: string }>
  stopWatch: () => Promise<{ success: boolean }>

  // Obsidian 同步
  validateObsidianVault: (vaultPath: string) => Promise<{ valid: boolean; error: string | null }>
  getObsidianStructure: (vaultPath: string, excludeFolders?: string[]) => Promise<ObsidianStructure>
  syncObsidianNotes: (vaultPath: string, targetDir: string, excludeFolders?: string[]) => Promise<SyncResult>
  getObsidianNotes: (vaultPath: string, excludeFolders?: string[]) => Promise<NoteMetadata[]>

  // 文档导入
  selectFiles: (options?: FileSelectOptions) => Promise<{ success: boolean; filePaths?: string[]; error?: string }>
  importDocument: (filePath: string, targetDir: string, category: string) => Promise<ImportResult>
  importDocumentsBatch: (filePaths: string[], targetDir: string, category: string) => Promise<{ total: number; successCount: number; failedCount: number; results: ImportResult[] }>

  // 回收站
  moveToTrash: (notePath: string, notesDir: string) => Promise<{ success: boolean; error?: string }>
  getTrashNotes: (notesDir: string) => Promise<{ success: boolean; notes: TrashNote[] }>
  restoreFromTrash: (trashPath: string, notesDir: string) => Promise<{ success: boolean; error?: string }>
  permanentDelete: (trashPath: string) => Promise<{ success: boolean; error?: string }>
  emptyTrash: (notesDir: string) => Promise<{ success: boolean; error?: string }>

  // 导出
  exportNote: (notePath: string, format: 'md' | 'html' | 'txt') => Promise<{ success: boolean; path?: string; error?: string }>
  exportNotesBatch: (notePaths: string[], format: 'md' | 'html' | 'txt', targetDir: string) => Promise<{ success: boolean; successCount?: number; total?: number; exportDir?: string; error?: string }>

  // 事件监听
  onFileChanged: (callback: (path: string) => void) => () => void
  onFileAdded: (callback: (path: string) => void) => () => void
  onFileRemoved: (callback: (path: string) => void) => () => void
  removeAllListeners: () => void

  // 菜单事件
  onMenuFocusSearch: (callback: () => void) => () => void
  onMenuToggleSidebar: (callback: () => void) => () => void
  onMenuExportNote: (callback: () => void) => () => void
  onMenuShowAbout: (callback: () => void) => () => void
  onMenuOpenSettings: (callback: () => void) => () => void
}

// 笔记元数据（不含完整内容）
export interface NoteMetadata {
  id: string
  path: string
  title: string
  category: string
  tags: string[]
  preview?: string
  updatedAt: string
}

// 配置类型
export interface Config {
  provider: 'anthropic' | 'openai'
  apiKey: string
  baseUrl: string
  model: string
  maxTokens: number
  syncDir: string
  theme: 'light' | 'dark'
  notesDir: string
  obsidianVaultPath: string
  obsidianAutoSync: boolean
  obsidianExcludeFolders: string[]
  hiddenCategories: string[]
}

// 模板类型
export interface Template {
  name: string
  path: string
  content: string
}

// Obsidian 结构
export interface ObsidianStructure {
  folders: string[]
  files: { name: string; path: string }[]
}

// 同步结果
export interface SyncResult {
  success: boolean
  syncedCount: number
  error: string | null
}

// 文件选择选项
export interface FileSelectOptions {
  filters?: { name: string; extensions: string[] }[]
}

// 导入结果
export interface ImportResult {
  filePath: string
  success: boolean
  path?: string
  title?: string
  error?: string
}

// 回收站笔记
export interface TrashNote {
  id: string
  path: string
  title: string
  deletedAt: string
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
