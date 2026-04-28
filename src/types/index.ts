// 笔记类型
export interface Note {
  id: string
  path: string
  title: string
  category: string
  tags: string[]
  content?: string
  preview?: string
  updatedAt: string
}

// 模板类型
export interface Template {
  name: string
  path: string
  content: string
}

// 配置类型
export interface Config {
  // AI 模型配置
  provider: 'anthropic' | 'openai'
  apiKey: string
  baseUrl: string
  model: string
  maxTokens: number

  syncDir: string
  theme: 'light' | 'dark'
  notesDir: string
  // Obsidian 配置
  obsidianVaultPath: string
  obsidianAutoSync: boolean
  obsidianExcludeFolders: string[]
}

// 分类类型
export interface Category {
  name: string
  count: number
}

// AI 请求类型
export interface AIRequest {
  type: 'ask' | 'summarize' | 'polish' | 'tag'
  content?: string
  question?: string
  noteContent?: string
}

// AI 响应类型
export interface AIResponse {
  success: boolean
  content?: string
  error?: string
  tags?: string[]
}

// 消息类型（用于 AI 对话）
export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}