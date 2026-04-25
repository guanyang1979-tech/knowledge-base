import { useState, useEffect, useCallback } from 'react'
import MDEditor from '@uiw/react-md-editor'
import { useAppStore } from '../stores/appStore'
import { suggestTags } from '../services/aiService'

export default function NoteEditor() {
  const { currentNote, setCurrentNote, refreshNotes, config } = useAppStore()
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showAI, setShowAI] = useState(false)

  // 当 currentNote 变化时更新 content
  useEffect(() => {
    if (currentNote) {
      setContent(currentNote.content)
    } else {
      setContent('')
    }
  }, [currentNote?.path])

  // 自动保存
  const handleSave = useCallback(async () => {
    if (!currentNote || !currentNote.path || saving) return

    setSaving(true)
    const result = await window.electronAPI.saveNote(currentNote.path, content)

    if (result.success) {
      setLastSaved(new Date())
      // 更新笔记列表
      await refreshNotes()
    }

    setSaving(false)
  }, [currentNote, content, saving, refreshNotes])

  // 内容变化时自动保存（防抖）
  useEffect(() => {
    if (!currentNote || !currentNote.path) return

    const timer = setTimeout(() => {
      if (content !== currentNote.content) {
        handleSave()
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [content, currentNote])

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave])

  // 建议标签
  const handleSuggestTags = async () => {
    if (!config.apiKey) {
      alert('请先在设置中配置 Claude API Key')
      return
    }

    const result = await suggestTags(content)
    if (result.success && result.tags) {
      // 解析现有标签
      const existingTagsMatch = content.match(/tags:\s*\[([^\]]*)\]/)
      let existingTags: string[] = []
      if (existingTagsMatch) {
        existingTags = existingTagsMatch[1].split(',').map(t => t.trim()).filter(t => t)
      }

      // 合并新标签
      const newTags = [...new Set([...existingTags, ...result.tags])]

      // 更新 content
      if (existingTagsMatch) {
        const newContent = content.replace(
          /tags:\s*\[([^\]]*)\]/,
          `tags: [${newTags.join(', ')}]`
        )
        setContent(newContent)
      } else {
        // 在 frontmatter 中添加 tags
        const fmEnd = content.indexOf('---', 3)
        if (fmEnd !== -1) {
          const newContent = content.slice(0, fmEnd + 3) +
            `\ntags: [${newTags.join(', ')}]` +
            content.slice(fmEnd + 3)
          setContent(newContent)
        }
      }
    }
  }

  // 提取标题
  const getTitleFromContent = (content: string): string => {
    const match = content.match(/^#\s+(.+)$/m)
    return match ? match[1].trim() : '无标题'
  }

  if (!currentNote) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500">选择一篇笔记开始编辑</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">或创建一个新的笔记</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col" data-color-mode={config.theme}>
      {/* 工具栏 */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <h2 className="font-medium text-gray-800 dark:text-gray-200">
            {currentNote.title || '新笔记'}
          </h2>
          {saving && (
            <span className="text-xs text-gray-400 dark:text-gray-500">保存中...</span>
          )}
          {lastSaved && !saving && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              已保存 {lastSaved.toLocaleTimeString('zh-CN')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* AI 功能按钮 */}
          <button
            onClick={handleSuggestTags}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-1"
            title="AI 建议标签"
            disabled={!config.apiKey}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            标签
          </button>

          <button
            onClick={() => setShowAI(!showAI)}
            className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 ${
              showAI
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="AI 助手"
            disabled={!config.apiKey}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            AI
          </button>

          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            保存
          </button>
        </div>
      </div>

      {/* Markdown 编辑器 */}
      <div className="flex-1 overflow-hidden">
        <MDEditor
          value={content}
          onChange={(val) => setContent(val || '')}
          height="100%"
          preview="edit"
          enableScroll={true}
          textareaProps={{
            placeholder: '开始编写你的笔记...'
          }}
        />
      </div>
    </div>
  )
}