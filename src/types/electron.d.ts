// Electron preload 脚本暴露的全局 API
export interface ElectronAPI {
  // 配置
  getConfig: () => Promise<any>
  saveConfig: (config: any) => Promise<boolean>
  getNotesDir: () => Promise<string>
  selectDirectory: () => Promise<string | null>

  // 笔记操作
  getNotes: () => Promise<any[]>
  readNote: (notePath: string) => Promise<{ success: boolean; content?: string; error?: string }>
  saveNote: (notePath: string, content: string) => Promise<{ success: boolean; error?: string }>
  createNote: (category: string, title: string) => Promise<{ success: boolean; path: string; fileName: string }>
  deleteNote: (notePath: string) => Promise<{ success: boolean; error?: string }>

  // 分类
  getCategories: () => Promise<string[]>

  // 模板
  getTemplates: () => Promise<any[]>
  createTemplate: (name: string, content: string) => Promise<{ success: boolean }>

  // 系统
  openExternal: (url: string) => Promise<void>

  // 文件监控
  startWatch: () => Promise<{ success: boolean; error?: string }>
  stopWatch: () => Promise<{ success: boolean }>

  // Obsidian 同步
  validateObsidianVault: (vaultPath: string) => Promise<{ valid: boolean; error: string | null }>
  getObsidianStructure: (vaultPath: string, excludeFolders?: string[]) => Promise<any>
  syncObsidianNotes: (vaultPath: string, targetDir: string, excludeFolders?: string[]) => Promise<any>
  getObsidianNotes: (vaultPath: string, excludeFolders?: string[]) => Promise<any>

  // 文档导入
  selectFiles: (options?: any) => Promise<{ success: boolean; filePaths?: string[]; error?: string }>
  importDocument: (filePath: string, targetDir: string, category: string) => Promise<any>
  importDocumentsBatch: (filePaths: string[], targetDir: string, category: string) => Promise<any[]>

  // 回收站
  moveToTrash: (notePath: string, notesDir: string) => Promise<any>
  getTrashNotes: (notesDir: string) => Promise<any[]>
  restoreFromTrash: (trashPath: string, notesDir: string) => Promise<any>
  permanentDelete: (trashPath: string) => Promise<any>
  emptyTrash: (notesDir: string) => Promise<any>

  // 导出
  exportNote: (notePath: string, format: 'md' | 'html' | 'txt') => Promise<any>
  exportNotesBatch: (notePaths: string[], format: 'md' | 'html' | 'txt', targetDir: string) => Promise<any>

  // 事件监听
  onFileChanged: (callback: (path: string) => void) => void
  onFileAdded: (callback: (path: string) => void) => void
  onFileRemoved: (callback: (path: string) => void) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
