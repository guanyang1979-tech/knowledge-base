import { contextBridge, ipcRenderer } from 'electron'

// 暴露给渲染进程的 API
const electronAPI = {
  // 配置
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config: any) => ipcRenderer.invoke('save-config', config),
  getNotesDir: () => ipcRenderer.invoke('get-notes-dir'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),

  // 笔记操作
  getNotes: () => ipcRenderer.invoke('get-notes'),
  readNote: (notePath: string) => ipcRenderer.invoke('read-note', notePath),
  saveNote: (notePath: string, content: string) => ipcRenderer.invoke('save-note', notePath, content),
  createNote: (category: string, title: string) => ipcRenderer.invoke('create-note', category, title),
  deleteNote: (notePath: string) => ipcRenderer.invoke('delete-note', notePath),

  // 分类
  getCategories: () => ipcRenderer.invoke('get-categories'),
  getAllCategories: () => ipcRenderer.invoke('get-all-categories'),
  renameCategory: (oldName: string, newName: string) => ipcRenderer.invoke('rename-category', oldName, newName),
  toggleCategoryHidden: (categoryName: string) => ipcRenderer.invoke('toggle-category-hidden', categoryName),
  getHiddenCategories: () => ipcRenderer.invoke('get-hidden-categories'),
  checkCategoryExists: (categoryName: string) => ipcRenderer.invoke('check-category-exists', categoryName),

  // 模板
  getTemplates: () => ipcRenderer.invoke('get-templates'),
  createTemplate: (name: string, content: string) => ipcRenderer.invoke('create-template', name, content),

  // 系统
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  testConnection: (config: any) => ipcRenderer.invoke('test-connection', config),

  // 文件监控
  startWatch: () => ipcRenderer.invoke('start-watch'),
  stopWatch: () => ipcRenderer.invoke('stop-watch'),

  // Obsidian 同步
  validateObsidianVault: (vaultPath: string) => ipcRenderer.invoke('validate-obsidian-vault', vaultPath),
  getObsidianStructure: (vaultPath: string, excludeFolders: string[]) => ipcRenderer.invoke('get-obsidian-structure', vaultPath, excludeFolders),
  syncObsidianNotes: (vaultPath: string, targetDir: string, excludeFolders: string[]) => ipcRenderer.invoke('sync-obsidian-notes', vaultPath, targetDir, excludeFolders),
  getObsidianNotes: (vaultPath: string, excludeFolders: string[]) => ipcRenderer.invoke('get-obsidian-notes', vaultPath, excludeFolders),

  // 文档导入
  selectFiles: (options?: { filters?: { name: string; extensions: string[] }[] }) => ipcRenderer.invoke('select-files', options),
  importDocument: (filePath: string, targetDir: string, category: string) => ipcRenderer.invoke('import-document', filePath, targetDir, category),
  importDocumentsBatch: (filePaths: string[], targetDir: string, category: string) => ipcRenderer.invoke('import-documents-batch', filePaths, targetDir, category),

  // 回收站
  moveToTrash: (notePath: string, notesDir: string) => ipcRenderer.invoke('move-to-trash', notePath, notesDir),
  getTrashNotes: (notesDir: string) => ipcRenderer.invoke('get-trash-notes', notesDir),
  restoreFromTrash: (trashPath: string, notesDir: string) => ipcRenderer.invoke('restore-from-trash', trashPath, notesDir),
  permanentDelete: (trashPath: string) => ipcRenderer.invoke('permanent-delete', trashPath),
  emptyTrash: (notesDir: string) => ipcRenderer.invoke('empty-trash', notesDir),

  // 导出
  exportNote: (notePath: string, format: 'md' | 'html' | 'txt') => ipcRenderer.invoke('export-note', notePath, format),
  exportNotesBatch: (notePaths: string[], format: 'md' | 'html' | 'txt', targetDir: string) => ipcRenderer.invoke('export-notes-batch', notePaths, format, targetDir),

  // 事件监听
  onFileChanged: (callback: (path: string) => void) => {
    ipcRenderer.on('file-changed', (_, path) => callback(path))
    return () => { ipcRenderer.removeAllListeners('file-changed') }
  },
  onFileAdded: (callback: (path: string) => void) => {
    ipcRenderer.on('file-added', (_, path) => callback(path))
    return () => { ipcRenderer.removeAllListeners('file-added') }
  },
  onFileRemoved: (callback: (path: string) => void) => {
    ipcRenderer.on('file-removed', (_, path) => callback(path))
    return () => { ipcRenderer.removeAllListeners('file-removed') }
  },
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('file-changed')
    ipcRenderer.removeAllListeners('file-added')
    ipcRenderer.removeAllListeners('file-removed')
  },

  // 菜单事件
  onMenuFocusSearch: (callback: () => void) => {
    ipcRenderer.on('menu-focus-search', () => callback())
    return () => { ipcRenderer.removeAllListeners('menu-focus-search') }
  },
  onMenuToggleSidebar: (callback: () => void) => {
    ipcRenderer.on('menu-toggle-sidebar', () => callback())
    return () => { ipcRenderer.removeAllListeners('menu-toggle-sidebar') }
  },
  onMenuExportNote: (callback: () => void) => {
    ipcRenderer.on('menu-export-note', () => callback())
    return () => { ipcRenderer.removeAllListeners('menu-export-note') }
  },
  onMenuShowAbout: (callback: () => void) => {
    ipcRenderer.on('menu-show-about', () => callback())
    return () => { ipcRenderer.removeAllListeners('menu-show-about') }
  },
  onMenuOpenSettings: (callback: () => void) => {
    ipcRenderer.on('menu-open-settings', () => callback())
    return () => { ipcRenderer.removeAllListeners('menu-open-settings') }
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// 类型声明
declare global {
  interface Window {
    electronAPI: typeof electronAPI
  }
}