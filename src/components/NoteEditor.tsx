import { useState, useEffect, useCallback, useRef } from 'react'
import MDEditor from '@uiw/react-md-editor'
import { useAppStore } from '../stores/appStore'
import { suggestTags } from '../services/aiService'
import RelatedNotes from './RelatedNotes'

export default function NoteEditor() {
  const { currentNote, refreshNotes, config, setCurrentNote } = useAppStore()
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showAI, setShowAI] = useState(false)
  const [previewMode, setPreviewMode] = useState<'edit' | 'live'>('live')
  const [frontmatter, setFrontmatter] = useState<Record<string, string>>({})
  const [showRelated, setShowRelated] = useState(false)
  const [tagSuggestionLoading, setTagSuggestionLoading] = useState(false)
  const contentRef = useRef(content)
  const lastSavedContentRef = useRef('')

  // 更新 contentRef
  useEffect(() => {
    contentRef.current = content
  }, [content])

  // 剥离 frontmatter
  const stripFrontmatter = (text: string) => text.replace(/^---[\s\S]*?---\n?/, '')

  // 解析 frontmatter
  useEffect(() => {
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
    if (fmMatch) {
      const lines = fmMatch[1].split('\n')
      const parsed: Record<string, string> = {}
      for (const line of lines) {
        const idx = line.indexOf(':')
        if (idx > 0) {
          parsed[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
        }
      }
      setFrontmatter(parsed)
    } else {
      setFrontmatter({})
    }
  }, [content])

  // 当 currentNote 变化时更新 content
  useEffect(() => {
    if (currentNote) {
      setContent(currentNote.content || '')
      lastSavedContentRef.current = currentNote.content || ''
    } else {
      setContent('')
      lastSavedContentRef.current = ''
    }
  }, [currentNote?.path])

  // 自动保存
  const handleSave = useCallback(async () => {
    if (!currentNote || !currentNote.path || saving) return

    setSaving(true)
    const result = await window.electronAPI.saveNote(currentNote.path, contentRef.current)

    if (result.success) {
      setLastSaved(new Date())
      lastSavedContentRef.current = contentRef.current
      // 更新笔记列表
      await refreshNotes()
    }

    setSaving(false)
  }, [currentNote, saving, refreshNotes])

  // 内容变化时自动保存（防抖）
  useEffect(() => {
    if (!currentNote || !currentNote.path) return

    const timer = setTimeout(() => {
      if (contentRef.current !== lastSavedContentRef.current) {
        handleSave()
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [content, currentNote, handleSave])

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
  const handleSuggestTags = useCallback(async () => {
    if (!config.apiKey) {
      alert('请先在设置中配置 Claude API Key')
      return
    }

    setTagSuggestionLoading(true)
    try {
      const result = await suggestTags(contentRef.current)
      if (result.success && result.tags) {
        // 解析现有标签
        const existingTagsMatch = contentRef.current.match(/tags:\s*\[([^\]]*)\]/)
        let existingTags: string[] = []
        if (existingTagsMatch) {
          existingTags = existingTagsMatch[1].split(',').map(t => t.trim()).filter(t => t)
        }

        // 合并新标签
        const newTags = [...new Set([...existingTags, ...result.tags])]

        // 更新 content
        if (existingTagsMatch) {
          const newContent = contentRef.current.replace(
            /tags:\s*\[([^\]]*)\]/,
            `tags: [${newTags.join(', ')}]`
          )
          setContent(newContent)
        } else {
          // 在 frontmatter 中添加 tags
          const fmEnd = contentRef.current.indexOf('---', 3)
          if (fmEnd !== -1) {
            const newContent = contentRef.current.slice(0, fmEnd + 3) +
              `\ntags: [${newTags.join(', ')}]` +
              contentRef.current.slice(fmEnd + 3)
            setContent(newContent)
          } else {
            alert('笔记没有 frontmatter，无法添加标签。请先添加 frontmatter（以 --- 开头和结尾）。')
          }
        }
      } else {
        alert(`标签建议失败: ${result.error || '未知错误'}`)
      }
    } catch (error: any) {
      alert(`标签建议失败: ${error.message}`)
    } finally {
      setTagSuggestionLoading(false)
    }
  }, [config.apiKey])

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
      <div className="border-b border-gray-200 dark:border-white/[0.06] bg-white dark:bg-[#0d0d14] flex-shrink-0">
        {/* 第一行：返回 + 标题 + 操作按钮 */}
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setCurrentNote(null)}
              className="p-1 text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded transition-colors flex-shrink-0"
              title="返回"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h2 className="text-sm font-medium text-gray-800 dark:text-white/80 truncate">
              {currentNote.title || '新笔记'}
            </h2>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setPreviewMode(previewMode === 'live' ? 'edit' : 'live')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                previewMode === 'live'
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 dark:text-white/30 hover:bg-gray-100 dark:hover:bg-white/[0.06]'
              }`}
              title={previewMode === 'live' ? '纯编辑模式' : '实时预览模式'}
            >
              {previewMode === 'live' ? '预览' : '编辑'}
            </button>
            <button
              onClick={handleSuggestTags}
              className="px-2 py-1 text-xs text-gray-500 dark:text-white/30 hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded transition-colors"
              title="AI 建议标签"
              disabled={!config.apiKey || tagSuggestionLoading}
            >
              {tagSuggestionLoading ? '...' : '标签'}
            </button>
            <button
              onClick={() => setShowAI(!showAI)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                showAI
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 dark:text-white/30 hover:bg-gray-100 dark:hover:bg-white/[0.06]'
              }`}
              title="AI 助手"
              disabled={!config.apiKey}
            >
              AI
            </button>
            <button
              onClick={() => setShowRelated(!showRelated)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                showRelated
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 dark:text-white/30 hover:bg-gray-100 dark:hover:bg-white/[0.06]'
              }`}
              title="相关笔记"
            >
              关联
            </button>
            <button
              onClick={handleSave}
              className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
            >
              保存
            </button>
          </div>
        </div>
        {/* 第二行：元信息 */}
        {(frontmatter.synced_at || frontmatter.source_path || saving || lastSaved) && (
          <div className="px-3 pb-1.5 flex items-center gap-3 text-[11px] text-gray-400 dark:text-white/20">
            {frontmatter.synced_at && (
              <span>同步于 {new Date(frontmatter.synced_at).toLocaleString('zh-CN')}</span>
            )}
            {frontmatter.source_path && (
              <span className="truncate">来源: {frontmatter.source_path}</span>
            )}
            {saving && <span className="text-primary-500">保存中...</span>}
            {!saving && lastSaved && (
              <span>已保存 {lastSaved.toLocaleTimeString('zh-CN')}</span>
            )}
          </div>
        )}
      </div>

      {/* Markdown 编辑器 */}
      <div className="flex-1 overflow-hidden
        [&_.wmde-markdown]:!bg-transparent
        [&_.wmde-markdown]:!text-gray-700 dark:[&_.wmde-markdown]:!text-white/70
        [&_.wmde-markdown_h1]:!text-gray-900 dark:[&_.wmde-markdown_h1]:!text-white/90
        [&_.wmde-markdown_h2]:!text-gray-900 dark:[&_.wmde-markdown_h2]:!text-white/90
        [&_.wmde-markdown_h3]:!text-gray-900 dark:[&_.wmde-markdown_h3]:!text-white/85
        [&_.wmde-markdown_h4]:!text-gray-900 dark:[&_.wmde-markdown_h4]:!text-white/80
        [&_.wmde-markdown_strong]:!text-gray-900 dark:[&_.wmde-markdown_strong]:!text-white/85
        [&_.wmde-markdown_blockquote]:!text-gray-500 dark:[&_.wmde-markdown_blockquote]:!text-white/40
        [&_.wmde-markdown_code]:!bg-gray-100 dark:[&_.wmde-markdown_code]:!bg-white/[0.06]
        [&_.wmde-markdown_code]:!text-gray-800 dark:[&_.wmde-markdown_code]:!text-white/70
        [&_.w-md-editor-toolbar]:!bg-white dark:[&_.w-md-editor-toolbar]:!bg-[#0d0d14]
        [&_.w-md-editor-toolbar]:!border-b [&_.w-md-editor-toolbar]:!border-gray-200 dark:[&_.w-md-editor-toolbar]:!border-white/[0.06]
        [&_.w-md-editor-toolbar_li_button]:!text-gray-400 dark:[&_.w-md-editor-toolbar_li_button]:!text-white/30
        [&_.w-md-editor-toolbar_li_button:hover]:!text-gray-600 dark:[&_.w-md-editor-toolbar_li_button:hover]:!text-white/60
        [&_.w-md-editor-toolbar_li_button.active]:!text-primary-600 dark:[&_.w-md-editor-toolbar_li_button.active]:!text-primary-400
        [&_.w-md-editor-content]:!bg-white dark:[&_.w-md-editor-content]:!bg-[#0a0a0f]
        [&_.w-md-editor]:!bg-white dark:[&_.w-md-editor]:!bg-[#0d0d14]
        [&_.w-md-editor]:!border-gray-200 dark:[&_.w-md-editor]:!border-white/[0.06]
        [&_.w-md-editor textarea]:!bg-white dark:[&_.w-md-editor textarea]:!bg-[#0a0a0f]
        [&_.w-md-editor textarea]:!text-gray-800 dark:[&_.w-md-editor textarea]:!text-white/70
      ">
        <MDEditor
          value={stripFrontmatter(content)}
          onChange={(val) => {
            // 编辑时保留原始 frontmatter
            const fmMatch = content.match(/^(---[\s\S]*?---\n?)/)
            const fm = fmMatch ? fmMatch[1] : ''
            setContent(fm + (val || ''))
          }}
          height="100%"
          preview={previewMode}
          enableScroll={true}
          textareaProps={{
            placeholder: '开始编写你的笔记...'
          }}
        />
      </div>

      {/* 相关笔记面板 */}
      {showRelated && (
        <div className="border-t border-gray-200 dark:border-white/[0.06] max-h-[200px] overflow-y-auto bg-white dark:bg-[#0d0d14]">
          <RelatedNotes onSelectNote={(path) => {
            window.electronAPI.readNote(path).then(result => {
              if (result.success) {
                const note = useAppStore.getState().notes.find(n => n.path === path)
                if (note) {
                  useAppStore.getState().setCurrentNote({ ...note, content: result.content })
                }
              }
            })
          }} />
        </div>
      )}
    </div>
  )
}