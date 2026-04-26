import Anthropic from '@anthropic-ai/sdk'
import type { AIRequest, AIResponse, Config, Message } from '../types'

// ============================================================
// Provider 抽象
// ============================================================

interface ChatParams {
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[]
  model: string
  temperature: number
  maxTokens: number
  signal?: AbortSignal
}

// 全局配置（由 initAIConfig 设置）
let currentConfig: Config | null = null

// ============================================================
// Anthropic Provider（Claude）
// ============================================================

let anthropicClient: Anthropic | null = null

function initAnthropicProvider(apiKey: string) {
  anthropicClient = new Anthropic({ apiKey, maxRetries: 2 })
}

async function anthropicChat(params: ChatParams): Promise<string> {
  if (!anthropicClient) throw new Error('Anthropic 未初始化')
  const systemMsg = params.messages.find(m => m.role === 'system')
  const otherMsgs = params.messages.filter(m => m.role !== 'system')

  const message = await anthropicClient.messages.create({
    model: params.model,
    max_tokens: params.maxTokens,
    temperature: params.temperature,
    system: systemMsg?.content,
    messages: otherMsgs.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  })

  return message.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('\n')
}

async function* anthropicStream(params: ChatParams): AsyncGenerator<string> {
  if (!anthropicClient) throw new Error('Anthropic 未初始化')
  const systemMsg = params.messages.find(m => m.role === 'system')
  const otherMsgs = params.messages.filter(m => m.role !== 'system')

  const stream = anthropicClient.messages.stream({
    model: params.model,
    max_tokens: params.maxTokens,
    temperature: params.temperature,
    system: systemMsg?.content,
    messages: otherMsgs.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  })

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && (event as any).delta?.text) {
      yield (event as any).delta.text
    }
  }
}

// ============================================================
// OpenAI 兼容 Provider（DeepSeek / MiMo / Qwen / Kimi 等）
// ============================================================

async function openaiChat(params: ChatParams, baseUrl: string, apiKey: string): Promise<string> {
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`
  const body = {
    model: params.model,
    messages: params.messages,
    temperature: params.temperature,
    max_tokens: params.maxTokens,
    stream: false,
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: params.signal,
  })

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`API 请求失败 (${resp.status}): ${err}`)
  }

  const data = await resp.json()
  return data.choices?.[0]?.message?.content || ''
}

async function* openaiStream(params: ChatParams, baseUrl: string, apiKey: string): AsyncGenerator<string> {
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`
  const body = {
    model: params.model,
    messages: params.messages,
    temperature: params.temperature,
    max_tokens: params.maxTokens,
    stream: true,
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: params.signal,
  })

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`API 请求失败 (${resp.status}): ${err}`)
  }

  const reader = resp.body?.getReader()
  if (!reader) throw new Error('无法获取响应流')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (data === '[DONE]') return

      try {
        const parsed = JSON.parse(data)
        const content = parsed.choices?.[0]?.delta?.content
        if (content) yield content
      } catch {
        // 忽略解析错误
      }
    }
  }
}

// ============================================================
// 统一接口
// ============================================================

function isAnthropic(config: Config): boolean {
  return config.provider === 'anthropic'
}

async function chat(params: ChatParams): Promise<string> {
  if (!currentConfig) throw new Error('AI 未配置')
  if (isAnthropic(currentConfig)) {
    return anthropicChat(params)
  }
  return openaiChat(params, currentConfig.baseUrl, currentConfig.apiKey)
}

async function* streamChat(params: ChatParams): AsyncGenerator<string> {
  if (!currentConfig) throw new Error('AI 未配置')
  if (isAnthropic(currentConfig)) {
    yield* anthropicStream(params)
  } else {
    yield* openaiStream(params, currentConfig.baseUrl, currentConfig.apiKey)
  }
}

// 收集流式结果
async function collectStream(gen: AsyncGenerator<string>): Promise<string> {
  let result = ''
  for await (const token of gen) {
    result += token
  }
  return result
}

// ============================================================
// 初始化
// ============================================================

export function initAIConfig(config: Config) {
  currentConfig = config
  if (config.provider === 'anthropic' && config.apiKey) {
    initAnthropicProvider(config.apiKey)
  }
}

export function isAIInitialized(): boolean {
  return currentConfig !== null && currentConfig.apiKey !== ''
}

// 测试连接
export async function testConnection(config: Config): Promise<{ success: boolean; error?: string }> {
  try {
    if (config.provider === 'anthropic') {
      const client = new Anthropic({ apiKey: config.apiKey, maxRetries: 1 })
      await client.messages.create({
        model: config.model || 'claude-sonnet-4-20250514',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      })
    } else {
      await openaiChat(
        { messages: [{ role: 'user', content: 'Hi' }], model: config.model, temperature: 0, maxTokens: 10 },
        config.baseUrl,
        config.apiKey
      )
    }
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || '连接失败' }
  }
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
// 快捷函数（非流式）
// ============================================================

export async function callAI(request: AIRequest): Promise<AIResponse> {
  if (!currentConfig?.apiKey) {
    return { success: false, error: '请先在设置中配置 AI 模型' }
  }

  try {
    const systemPrompt = getSystemPrompt(request.type)
    const userMessage = buildUserMessage(request)

    const content = await chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      model: currentConfig.model,
      temperature: currentConfig.temperature,
      maxTokens: currentConfig.maxTokens,
    })

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
// 对话（非流式，保留兼容）
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

    const content = await chat({
      messages: [
        { role: 'system', content: '你是一个知识库助手。请根据笔记内容和对话历史回答用户问题。' },
        ...conversationHistory,
        { role: 'user', content: context + userInput },
      ],
      model: currentConfig.model,
      temperature: currentConfig.temperature,
      maxTokens: currentConfig.maxTokens,
    })

    return { success: true, content }
  } catch (error: any) {
    console.error('AI chat failed:', error)
    return { success: false, error: error.message || '对话失败' }
  }
}

// ============================================================
// 流式对话（新接口，供 AIChatPanel 使用）
// ============================================================

export interface StreamChatOptions {
  messages: Message[]
  userInput: string
  noteContent?: string
  ragContext?: string
  signal?: AbortSignal
}

export async function* streamChatWithAI(options: StreamChatOptions): AsyncGenerator<string> {
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
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  yield* streamChat({
    messages: [
      { role: 'system', content: '你是一个知识库助手。请根据笔记内容和对话历史回答用户问题。如果知识库中有相关笔记，请参考回答。' },
      ...conversationHistory,
      { role: 'user', content: context + options.userInput },
    ],
    model: currentConfig.model,
    temperature: currentConfig.temperature,
    maxTokens: currentConfig.maxTokens,
    signal: options.signal,
  })
}

// 流式快捷函数（摘要/润色/问答）
export async function* streamCallAI(request: AIRequest): AsyncGenerator<string> {
  if (!currentConfig?.apiKey) {
    throw new Error('请先在设置中配置 AI 模型')
  }

  const systemPrompt = getSystemPrompt(request.type)
  const userMessage = buildUserMessage(request)

  yield* streamChat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    model: currentConfig.model,
    temperature: currentConfig.temperature,
    maxTokens: currentConfig.maxTokens,
  })
}
