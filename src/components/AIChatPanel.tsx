import { useState, useRef, useEffect, useCallback } from 'react'
import { useAppStore } from '../stores/appStore'
import { chatWithAI, askQuestion, summarizeContent, polishContent } from '../services/aiService'

const MAX_MESSAGES = 50

export default function AIChatPanel() {
  const {
    currentNote,
    messages,
    addMessage,
    clearMessages,
    aiLoading,
    setAiLoading,
    config
  } = useAppStore()

  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'chat' | 'ask' | 'summarize' | 'polish'>('chat')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 取消请求
  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setAiLoading(false)
    }
  }, [setAiLoading])

  // 发送消息
  const handleSend = async () => {
    if (!input.trim() || aiLoading || !config.apiKey) return

    const userMessage = input.trim()
    setInput('')
    setAiLoading(true)

    // 检查消息数量限制
    if (messages.length >= MAX_MESSAGES) {
      addMessage({
        role: 'assistant',
        content: `提示：对话已达到 ${MAX_MESSAGES} 条消息上限，请开始新对话。`,
        timestamp: Date.now()
      })
      setAiLoading(false)
      return
    }

    // 添加用户消息
    addMessage({
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    })

    // 创建新的 AbortController
    abortControllerRef.current = new AbortController()

    try {
      let response: { success: boolean; content?: string; error?: string }

      if (mode === 'ask' && currentNote) {
        // 知识问答模式
        response = await askQuestion(currentNote.content || '', userMessage)
      } else if (mode === 'summarize' && currentNote) {
        // 摘要模式
        response = await summarizeContent(currentNote.content || '')
      } else if (mode === 'polish' && currentNote) {
        // 润色模式
        response = await polishContent(currentNote.content || '')
      } else {
        // 对话模式
        response = await chatWithAI(messages, userMessage, currentNote?.content)
      }

      if (response.success && response.content) {
        addMessage({
          role: 'assistant',
          content: response.content,
          timestamp: Date.now()
        })
      } else {
        addMessage({
          role: 'assistant',
          content: `错误: ${response.error || '未知错误'}`,
          timestamp: Date.now()
        })
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        addMessage({
          role: 'assistant',
          content: `错误: ${error.message}`,
          timestamp: Date.now()
        })
      }
    } finally {
      abortControllerRef.current = null
      setAiLoading(false)
    }
  }

  // 键盘提交
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 切换模式
  const handleModeChange = (newMode: typeof mode) => {
    setMode(newMode)
    clearMessages()

    // 添加系统提示
    let systemPrompt = ''
    switch (newMode) {
      case 'ask':
        systemPrompt = '已进入问答模式。请基于当前笔记内容回答问题。'
        break
      case 'summarize':
        systemPrompt = '已进入摘要模式。点击发送将生成当前笔记的摘要。'
        break
      case 'polish':
        systemPrompt = '已进入润色模式。点击发送将改进当前笔记的写作质量。'
        break
      default:
        systemPrompt = '已进入对话模式。可以自由对话，我会结合笔记内容回答。'
    }

    addMessage({
      role: 'assistant',
      content: systemPrompt,
      timestamp: Date.now()
    })
  }

  // 没有配置 API Key
  if (!config.apiKey) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-medium text-gray-800 dark:text-gray-200">AI 助手</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className="text-sm mb-2">请先在设置中配置 Claude API Key</p>
            <p className="text-xs text-gray-400">点击右上角齿轮图标打开设置</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* 头部 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="font-medium text-gray-800 dark:text-gray-200 mb-3">AI 助手</h2>

        {/* 模式选择 */}
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => handleModeChange('chat')}
            className={`px-2 py-1 text-xs rounded ${
              mode === 'chat'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
            }`}
          >
            对话
          </button>
          <button
            onClick={() => handleModeChange('ask')}
            className={`px-2 py-1 text-xs rounded ${
              mode === 'ask'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
            }`}
            disabled={!currentNote}
            title={!currentNote ? '请先选择一篇笔记' : '基于笔记内容问答'}
          >
            问答
          </button>
          <button
            onClick={() => handleModeChange('summarize')}
            className={`px-2 py-1 text-xs rounded ${
              mode === 'summarize'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
            }`}
            disabled={!currentNote}
            title={!currentNote ? '请先选择一篇笔记' : '生成笔记摘要'}
          >
            摘要
          </button>
          <button
            onClick={() => handleModeChange('polish')}
            className={`px-2 py-1 text-xs rounded ${
              mode === 'polish'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
            }`}
            disabled={!currentNote}
            title={!currentNote ? '请先选择一篇笔记' : '润色笔记内容'}
          >
            润色
          </button>
        </div>

        {currentNote && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 truncate">
            当前笔记: {currentNote.title}
          </p>
        )}
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.timestamp}
            className={`${
              message.role === 'user' ? 'ml-8' : 'mr-4'
            }`}
          >
            <div
              className={`p-3 rounded-lg text-sm ${
                message.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
            </div>
          </div>
        ))}

        {aiLoading && (
          <div className="mr-4">
            <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === 'summarize' || mode === 'polish'
                ? '点击发送生成摘要/润色'
                : '输入消息...'
            }
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:border-primary-500 focus:outline-none"
            rows={2}
            disabled={aiLoading}
          />
          {aiLoading ? (
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() && mode !== 'summarize' && mode !== 'polish'}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}