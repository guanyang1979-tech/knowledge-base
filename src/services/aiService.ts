import Anthropic from '@anthropic-ai/sdk'
import type { AIRequest, AIResponse, Message } from '../types'

let anthropic: Anthropic | null = null

// 初始化 Anthropic 客户端
export function initAnthropic(apiKey: string) {
  if (!apiKey) {
    anthropic = null
    return false
  }

  anthropic = new Anthropic({
    apiKey,
    maxRetries: 3
  })
  return true
}

// 检查是否已初始化
export function isAnthropicInitialized(): boolean {
  return anthropic !== null
}

// 构建系统提示词
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

// 构建用户消息
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

// 调用 AI
export async function callAI(request: AIRequest): Promise<AIResponse> {
  if (!anthropic) {
    return {
      success: false,
      error: '请先在设置中配置 Claude API Key'
    }
  }

  try {
    const systemPrompt = getSystemPrompt(request.type)
    const userMessage = buildUserMessage(request)

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage
        }
      ]
    })

    // 处理响应
    const content = message.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as any).text)
      .join('\n')

    // 标签类型特殊处理
    if (request.type === 'tag') {
      const tags = content.split(',').map(t => t.trim()).filter(t => t)
      return {
        success: true,
        tags
      }
    }

    return {
      success: true,
      content
    }
  } catch (error: any) {
    console.error('AI request failed:', error)
    return {
      success: false,
      error: error.message || 'AI 请求失败，请稍后重试'
    }
  }
}

// 知识问答
export async function askQuestion(noteContent: string, question: string): Promise<AIResponse> {
  return callAI({
    type: 'ask',
    noteContent,
    question
  })
}

// 内容摘要
export async function summarizeContent(content: string): Promise<AIResponse> {
  return callAI({
    type: 'summarize',
    content
  })
}

// 写作润色
export async function polishContent(content: string): Promise<AIResponse> {
  return callAI({
    type: 'polish',
    content
  })
}

// 自动标签
export async function suggestTags(content: string): Promise<AIResponse> {
  return callAI({
    type: 'tag',
    content
  })
}

// 对话功能
export async function chatWithAI(messages: Message[], userInput: string, noteContent?: string): Promise<AIResponse> {
  if (!anthropic) {
    return {
      success: false,
      error: '请先在设置中配置 Claude API Key'
    }
  }

  try {
    // 构建上下文
    let context = ''
    if (noteContent) {
      context = `参考笔记内容:\n${noteContent}\n\n`
    }

    const conversationHistory = messages.map(m => ({
      role: m.role,
      content: m.content
    }))

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: '你是一个知识库助手。请根据笔记内容和对话历史回答用户问题。如果笔记中没有相关信息，请结合你的知识回答。',
      messages: [
        ...conversationHistory,
        {
          role: 'user',
          content: context + userInput
        }
      ]
    })

    const content = message.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as any).text)
      .join('\n')

    return {
      success: true,
      content
    }
  } catch (error: any) {
    console.error('AI chat failed:', error)
    return {
      success: false,
      error: error.message || '对话失败，请稍后重试'
    }
  }
}