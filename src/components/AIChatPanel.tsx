import { useState, useRef, useEffect, useCallback } from 'react'
import { useAppStore } from '../stores/appStore'
import { streamChatWithAI, streamCallAI } from '../services/aiService'
import { buildRAGContext } from '../services/ragService'
import type { AIRequest } from '../types'

const MAX_MESSAGES = 50

export default function AIChatPanel() {
  const {
    currentNote,
    notes,
    messages,
    addMessage,
    clearMessages,
    aiLoading,
    setAiLoading,
    config
  } = useAppStore()

  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'chat' | 'ask' | 'summarize' | 'polish'>('chat')
  const [ragEnabled, setRagEnabled] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const streamingRef = useRef(false)

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 取消请求
  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    streamingRef.current = false
    setAiLoading(false)
  }, [setAiLoading])

  // 流式发送
  const handleSend = async () => {
    if (!input.trim() || aiLoading || !config.apiKey) return

    const userMessage = input.trim()
    setInput('')
    setAiLoading(true)
    streamingRef.current = true

    if (messages.length >= MAX_MESSAGES) {
      addMessage({
        role: 'assistant',
        content: `对话已达到 ${MAX_MESSAGES} 条消息上限，请开始新对话。`,
        timestamp: Date.now()
      })
      setAiLoading(false)
      return
    }

    addMessage({
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    })

    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    // 添加占位的 assistant 消息（流式填充）
    const assistantTimestamp = Date.now()
    addMessage({
      role: 'assistant',
      content: '',
      timestamp: assistantTimestamp
    })

    try {
      if ((mode === 'ask' || mode === 'summarize' || mode === 'polish') && currentNote) {
        // 非对话模式：流式调用
        const request: AIRequest = {
          type: mode as AIRequest['type'],
          content: currentNote.content || '',
          question: mode === 'ask' ? userMessage : undefined,
          noteContent: mode === 'ask' ? currentNote.content : undefined,
        }

        let acc = ''
        for await (const token of streamCallAI(request)) {
          if (!streamingRef.current) break
          acc += token
          // 更新最后一条 assistant 消息
          const store = useAppStore.getState()
          const lastMsg = store.messages[store.messages.length - 1]
          if (lastMsg && lastMsg.role === 'assistant' && lastMsg.timestamp === assistantTimestamp) {
            useAppStore.setState({
              messages: [...store.messages.slice(0, -1), { ...lastMsg, content: acc }]
            })
          }
        }
      } else {
        // 对话模式：流式 + RAG
        let ragContext = ''
        if (ragEnabled && notes.length > 0) {
          ragContext = buildRAGContext(userMessage, notes, 3)
        }

        let acc = ''
        for await (const token of streamChatWithAI({
          messages,
          userInput: userMessage,
          noteContent: currentNote?.content,
          ragContext: ragContext || undefined,
          signal,
        })) {
          if (!streamingRef.current) break
          acc += token
          const store = useAppStore.getState()
          const lastMsg = store.messages[store.messages.length - 1]
          if (lastMsg && lastMsg.role === 'assistant' && lastMsg.timestamp === assistantTimestamp) {
            useAppStore.setState({
              messages: [...store.messages.slice(0, -1), { ...lastMsg, content: acc }]
            })
          }
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        const store = useAppStore.getState()
        const lastMsg = store.messages[store.messages.length - 1]
        if (lastMsg && lastMsg.role === 'assistant' && lastMsg.timestamp === assistantTimestamp) {
          useAppStore.setState({
            messages: [...store.messages.slice(0, -1), { ...lastMsg, content: `错误: ${error.message}` }]
          })
        }
      }
    } finally {
      abortControllerRef.current = null
      streamingRef.current = false
      setAiLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleModeChange = (newMode: typeof mode) => {
    setMode(newMode)
    clearMessages()

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

  if (!config.apiKey) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-white/[0.06]">
          <h2 className="font-medium text-gray-800 dark:text-white/70">AI 助手</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-gray-500 dark:text-white/30">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-white/15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className="text-sm mb-2">请先在设置中配置 AI 模型</p>
            <p className="text-xs text-gray-400 dark:text-white/20">点击右上角齿轮图标打开设置</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* 头部 */}
      <div className="p-3 border-b border-gray-200 dark:border-white/[0.06]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-medium text-sm text-gray-800 dark:text-white/70">AI 助手</h2>
          {/* RAG 开关（仅对话模式显示） */}
          {mode === 'chat' && (
            <label className="flex items-center gap-1.5 cursor-pointer">
              <span className="text-[10px] text-gray-500 dark:text-white/30">知识库检索</span>
              <button
                onClick={() => setRagEnabled(!ragEnabled)}
                className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                  ragEnabled ? 'bg-primary-500' : 'bg-gray-300 dark:bg-white/10'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    ragEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>
          )}
        </div>

        {/* 模式选择 */}
        <div className="flex gap-1">
          {(['chat', 'ask', 'summarize', 'polish'] as const).map(m => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                mode === m
                  ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 dark:text-white/30 hover:bg-gray-100 dark:hover:bg-white/[0.06]'
              }`}
              disabled={m !== 'chat' && !currentNote}
              title={m !== 'chat' && !currentNote ? '请先选择笔记' : undefined}
            >
              {m === 'chat' ? '对话' : m === 'ask' ? '问答' : m === 'summarize' ? '摘要' : '润色'}
            </button>
          ))}
        </div>

        {currentNote && (
          <p className="mt-1.5 text-[10px] text-gray-400 dark:text-white/20 truncate">
            {currentNote.title}
          </p>
        )}
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((message) => (
          <div key={message.timestamp} className={`${message.role === 'user' ? 'ml-6' : 'mr-3'}`}>
            <div
              className={`p-2.5 rounded-lg text-sm ${
                message.role === 'user'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-white/[0.04] text-gray-800 dark:text-white/60'
              }`}
            >
              <div className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">
                {message.content || (
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div className="p-3 border-t border-gray-200 dark:border-white/[0.06]">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === 'summarize' || mode === 'polish'
                ? '点击发送生成摘要/润色...'
                : '输入消息...'
            }
            className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-white/[0.08] rounded-lg resize-none focus:border-primary-500 focus:outline-none bg-white dark:bg-white/[0.02] text-gray-800 dark:text-white/60 placeholder-gray-400 dark:placeholder-white/20"
            rows={2}
            disabled={aiLoading}
          />
          {aiLoading ? (
            <button
              onClick={handleCancel}
              className="px-3 py-2 bg-red-500/80 text-white rounded-lg hover:bg-red-500 self-end"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() && mode !== 'summarize' && mode !== 'polish'}
              className="px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-30 disabled:cursor-not-allowed self-end"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
