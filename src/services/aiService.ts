import type { AIRequest, AIResponse, Config, Message } from '../types'

// ============================================================
// 全局配置
// ============================================================

let currentConfig: Config | null = null

export function initAIConfig(config: Config) {
  currentConfig = config
}

export function isAIInitialized(): boolean {
  return currentConfig !== null && currentConfig.apiKey !== ''
}

// ============================================================
// 统一 IPC 流式调用
// ============================================================

let requestIdCounter = 0

async function streamViaIPC(
  messages: { role: string; content: string }[],
  onToken: (token: string) => void,
  signal?: AbortSignal
): Promise<string> {
  if (!currentConfig?.apiKey) throw new Error('请先在设置中配置 AI 模型')

  // 客户端生成唯一 requestId，在发起调用前就确定，避免事件竞态
  const requestId = `req-${Date.now()}-${++requestIdCounter}`

  let acc = ''
  let done = false
  let resolvePromise!: (value: string) => void
  let rejectPromise!: (reason: any) => void

  const removeToken = window.electronAPI.onAiStreamToken((data) => {
    if (data.requestId === requestId) {
      acc += data.token
      onToken(data.token)
    }
  })

  const removeDone = window.electronAPI.onAiStreamDone((data) => {
    if (data.requestId === requestId) {
      done = true
      cleanup()
      resolvePromise(acc)
    }
  })

  const removeError = window.electronAPI.onAiStreamError((data) => {
    if (data.requestId === requestId) {
      done = true
      cleanup()
      rejectPromise(new Error(data.error))
    }
  })

  function cleanup() {
    removeToken()
    removeDone()
    removeError()
  }

  signal?.addEventListener('abort', () => {
    if (!done) {
      cleanup()
      rejectPromise(new DOMException('Aborted', 'AbortError'))
    }
  })

  const promise = new Promise<string>((resolve, reject) => {
    resolvePromise = resolve
    rejectPromise = reject
  })

  // 发起 IPC 调用，传入客户端生成的 requestId
  window.electronAPI.aiChat({
    provider: currentConfig.provider,
    baseUrl: currentConfig.baseUrl,
    apiKey: currentConfig.apiKey,
    model: currentConfig.model,
    messages,
    requestId,
  })

  return promise
}

// 非流式：收集完整结果
async function chatViaIPC(
  messages: { role: string; content: string }[]
): Promise<string> {
  return streamViaIPC(messages, () => {})
}

// ============================================================
// Prompt 模板
// ============================================================

function getSystemPrompt(type: AIRequest['type']): string {
  switch (type) {
    case 'ask':
      return '你是一个知识库助手，请基于用户提供的笔记内容回答问题。如果笔记中没有相关信息，请如实告知用户。'
    case 'summarize':
      return '你是一个文本摘要助手，请简洁地总结用户提供的笔记内容，提取关键要点。'
    case 'polish':
      return '你是一个写作助手，请帮助用户改进和润色笔记内容，提升写作质量。保持原意，但使表达更加清晰、专业。'
    case 'tag':
      return '你是一个标签建议助手，请根据笔记内容建议合适的标签。只需要返回标签列表，用逗号分隔，不需要其他内容。'
    default:
      return '你是一个知识库助手。'
  }
}

function buildUserMessage(request: AIRequest): string {
  switch (request.type) {
    case 'ask':
      return `笔记内容:\n${request.noteContent}\n\n问题: ${request.question}`
    case 'summarize':
    case 'polish':
      return `笔记内容:\n${request.content}`
    case 'tag':
      return `请为以下笔记内容建议标签:\n${request.content}`
    default:
      return request.content || ''
  }
}

// ============================================================
// 非流式快捷函数
// ============================================================

export async function callAI(request: AIRequest): Promise<AIResponse> {
  if (!currentConfig?.apiKey) {
    return { success: false, error: '请先在设置中配置 AI 模型' }
  }

  try {
    const systemPrompt = getSystemPrompt(request.type)
    const userMessage = buildUserMessage(request)

    const content = await chatViaIPC([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ])

    if (request.type === 'tag') {
      const tags = content.split(',').map(t => t.trim()).filter(t => t)
      return { success: true, tags }
    }
    return { success: true, content }
  } catch (error: any) {
    console.error('AI request failed:', error)
    return { success: false, error: error.message || 'AI 请求失败' }
  }
}

export async function askQuestion(noteContent: string, question: string): Promise<AIResponse> {
  return callAI({ type: 'ask', noteContent, question })
}

export async function summarizeContent(content: string): Promise<AIResponse> {
  return callAI({ type: 'summarize', content })
}

export async function polishContent(content: string): Promise<AIResponse> {
  return callAI({ type: 'polish', content })
}

export async function suggestTags(content: string): Promise<AIResponse> {
  return callAI({ type: 'tag', content })
}

// ============================================================
// 对话（非流式）
// ============================================================

export async function chatWithAI(messages: Message[], userInput: string, noteContent?: string): Promise<AIResponse> {
  if (!currentConfig?.apiKey) {
    return { success: false, error: '请先在设置中配置 AI 模型' }
  }

  try {
    let context = ''
    if (noteContent) {
      context = `参考笔记内容:\n${noteContent}\n\n`
    }

    const conversationHistory = messages.map(m => ({
      role: m.role,
      content: m.content,
    }))

    const content = await chatViaIPC([
      { role: 'system', content: '你是一个知识库助手。请根据笔记内容和对话历史回答用户问题。' },
      ...conversationHistory,
      { role: 'user', content: context + userInput },
    ])

    return { success: true, content }
  } catch (error: any) {
    console.error('AI chat failed:', error)
    return { success: false, error: error.message || '对话失败' }
  }
}

// ============================================================
// 流式接口（供 AIChatPanel 使用）
// ============================================================

export interface StreamChatOptions {
  messages: Message[]
  userInput: string
  noteContent?: string
  ragContext?: string
  signal?: AbortSignal
  onToken: (token: string) => void
}

export async function streamChatWithAI(options: StreamChatOptions): Promise<void> {
  if (!currentConfig?.apiKey) {
    throw new Error('请先在设置中配置 AI 模型')
  }

  let context = ''
  if (options.ragContext) {
    context += `以下是从知识库中检索到的相关笔记，仅供参考：\n${options.ragContext}\n\n`
  }
  if (options.noteContent) {
    context += `参考笔记内容:\n${options.noteContent}\n\n`
  }

  const conversationHistory = options.messages.map(m => ({
    role: m.role,
    content: m.content,
  }))

  await streamViaIPC([
    { role: 'system', content: '你是一个知识库助手。请根据笔记内容和对话历史回答用户问题。如果知识库中有相关笔记，请参考回答。' },
    ...conversationHistory,
    { role: 'user', content: context + options.userInput },
  ], options.onToken, options.signal)
}

export async function streamCallAI(
  request: AIRequest,
  onToken: (token: string) => void,
  signal?: AbortSignal
): Promise<void> {
  if (!currentConfig?.apiKey) {
    throw new Error('请先在设置中配置 AI 模型')
  }

  const systemPrompt = getSystemPrompt(request.type)
  const userMessage = buildUserMessage(request)

  await streamViaIPC([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ], onToken, signal)
}
