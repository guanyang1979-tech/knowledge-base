import { create } from 'zustand'
import type { Note, Config, Category, Template, Message } from '../types'

interface AppState {
  // 笔记
  notes: Note[]
  currentNote: Note | null
  categories: string[]

  // 模板
  templates: Template[]

  // 配置
  config: Config

  // UI 状态
  sidebarOpen: boolean
  searchQuery: string
  selectedCategory: string | null

  // 面板宽度
  sidebarWidth: number
  noteListWidth: number
  aiPanelWidth: number

  // 排序
  sortField: 'updatedAt' | 'title' | 'category'
  sortOrder: 'asc' | 'desc'

  // AI 对话
  messages: Message[]
  aiLoading: boolean

  // 设置面板
  settingsOpen: boolean

  // 导入面板
  importOpen: boolean

  // 统计面板
  statisticsOpen: boolean

  // 回收站面板
  trashOpen: boolean

  // 导出面板
  exportOpen: boolean

  // 关于面板
  aboutOpen: boolean

  // Actions
  setNotes: (notes: Note[]) => void
  setCurrentNote: (note: Note | null) => void
  setCategories: (categories: string[]) => void
  setTemplates: (templates: Template[]) => void
  setConfig: (config: Config) => void
  updateConfig: (key: keyof Config, value: string) => void
  setSidebarOpen: (open: boolean) => void
  setSearchQuery: (query: string) => void
  setSelectedCategory: (category: string | null) => void
  setSidebarWidth: (w: number) => void
  setNoteListWidth: (w: number) => void
  setAiPanelWidth: (w: number) => void
  setSortField: (f: 'updatedAt' | 'title' | 'category') => void
  toggleSortOrder: () => void
  addMessage: (message: Message) => void
  clearMessages: () => void
  setAiLoading: (loading: boolean) => void
  setSettingsOpen: (open: boolean) => void
  setImportOpen: (open: boolean) => void
  setStatisticsOpen: (open: boolean) => void
  setTrashOpen: (open: boolean) => void
  setExportOpen: (open: boolean) => void
  setAboutOpen: (open: boolean) => void

  // 刷新笔记
  refreshNotes: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  // 初始状态
  notes: [],
  currentNote: null,
  categories: [],
  templates: [],
  config: {
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
    obsidianExcludeFolders: ['.obsidian', 'node_modules', '.git']
  },
  sidebarOpen: true,
  searchQuery: '',
  selectedCategory: null,
  sidebarWidth: 224,
  noteListWidth: 300,
  aiPanelWidth: 288,
  sortField: 'updatedAt',
  sortOrder: 'desc',
  messages: [],
  aiLoading: false,
  settingsOpen: false,
  importOpen: false,
  statisticsOpen: false,
  trashOpen: false,
  exportOpen: false,
  aboutOpen: false,

  // Actions
  setNotes: (notes) => set({ notes }),
  setCurrentNote: (note) => set({ currentNote: note }),
  setCategories: (categories) => set({ categories }),
  setTemplates: (templates) => set({ templates }),
  setConfig: (config) => set({ config }),
  updateConfig: (key, value) => set((state) => ({
    config: { ...state.config, [key]: value }
  })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setSidebarWidth: (w) => set({ sidebarWidth: w }),
  setNoteListWidth: (w) => set({ noteListWidth: w }),
  setAiPanelWidth: (w) => set({ aiPanelWidth: w }),
  setSortField: (f) => set((state) => ({
    sortField: f,
    sortOrder: state.sortField === f ? (state.sortOrder === 'asc' ? 'desc' : 'asc') : 'desc'
  })),
  toggleSortOrder: () => set((state) => ({ sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc' })),
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  clearMessages: () => set({ messages: [] }),
  setAiLoading: (loading) => set({ aiLoading: loading }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setImportOpen: (open) => set({ importOpen: open }),
  setStatisticsOpen: (open) => set({ statisticsOpen: open }),
  setTrashOpen: (open) => set({ trashOpen: open }),
  setExportOpen: (open) => set({ exportOpen: open }),
  setAboutOpen: (open) => set({ aboutOpen: open }),

  // 刷新笔记
  refreshNotes: async () => {
    try {
      const notes = await window.electronAPI.getNotes()
      const categories = await window.electronAPI.getCategories()
      set({ notes, categories })
    } catch (error) {
      console.error('Failed to refresh notes:', error)
    }
  }
}))