import { useMemo, useState } from 'react'
import { useAppStore } from '../stores/appStore'

export default function NoteList() {
  const {
    notes,
    currentNote,
    setCurrentNote,
    selectedCategory,
    searchQuery,
    refreshNotes,
    config
  } = useAppStore()

  const [showNewNote, setShowNewNote] = useState(false)
  const [newNoteTitle, setNewNoteTitle] = useState('')
  const [newNoteCategory, setNewNoteCategory] = useState('')

  // 过滤笔记
  const filteredNotes = useMemo(() => {
    let result = notes

    // 按分类过滤
    if (selectedCategory) {
      result = result.filter(note => note.category === selectedCategory)
    }

    // 按搜索关键词过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(note =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query) ||
        note.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // 按更新时间排序
    return result.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }, [notes, selectedCategory, searchQuery])

  // 创建新笔记
  const handleCreateNote = async () => {
    if (!newNoteTitle.trim()) return

    const category = newNoteCategory || selectedCategory || '技术文档'
    const result = await window.electronAPI.createNote(category, newNoteTitle.trim())

    if (result.success) {
      await refreshNotes()

      // 加载新创建的笔记
      const noteResult = await window.electronAPI.readNote(result.path)
      if (noteResult.success) {
        setCurrentNote({
          id: result.path,
          path: result.path,
          title: newNoteTitle.trim(),
          category,
          tags: [],
          content: noteResult.content,
          updatedAt: new Date().toISOString()
        })
      }
    }

    setNewNoteTitle('')
    setShowNewNote(false)
  }

  // 删除笔记（移到回收站）
  const handleDeleteNote = async (e: React.MouseEvent, notePath: string) => {
    e.stopPropagation()

    if (confirm('确定要把这篇笔记移到回收站吗？')) {
      const result = await window.electronAPI.moveToTrash(notePath, config.notesDir)
      if (result.success) {
        await refreshNotes()

        // 如果删除的是当前笔记，清空当前笔记
        if (currentNote?.path === notePath) {
          setCurrentNote(null)
        }
      }
    }
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return '今天'
    } else if (days === 1) {
      return '昨天'
    } else if (days < 7) {
      return `${days}天前`
    } else {
      return date.toLocaleDateString('zh-CN')
    }
  }

  // 预览内容
  const getPreview = (content: string) => {
    // 移除 frontmatter
    const withoutFM = content.replace(/^---[\s\S]*?---\n/, '')
    // 移除 markdown 标题
    const withoutTitle = withoutFM.replace(/^#\s+.+$/m, '')
    // 获取前 50 个字符
    return withoutTitle.substring(0, 50).replace(/\n/g, ' ').trim()
  }

  return (
    <div className="flex flex-col h-full">
      {/* 标题栏 */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="font-medium text-gray-800">
          {selectedCategory || '全部笔记'}
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">({filteredNotes.length})</span>
        </h2>
        <button
          onClick={() => {
            setNewNoteCategory(selectedCategory || '')
            setShowNewNote(true)
          }}
          className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
          title="新建笔记"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* 新建笔记表单 */}
      {showNewNote && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <input
            type="text"
            value={newNoteTitle}
            onChange={(e) => setNewNoteTitle(e.target.value)}
            placeholder="笔记标题"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none mb-2"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreateNote()}
          />
          <select
            value={newNoteCategory || selectedCategory || ''}
            onChange={(e) => setNewNoteCategory(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none mb-2"
          >
            <option value="">选择分类</option>
            {useAppStore.getState().categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleCreateNote}
              className="flex-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              创建
            </button>
            <button
              onClick={() => {
                setShowNewNote(false)
                setNewNoteTitle('')
              }}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 rounded-lg"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 笔记列表 */}
      <div className="flex-1 overflow-y-auto">
        {filteredNotes.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">暂无笔记</p>
            <button
              onClick={() => setShowNewNote(true)}
              className="mt-2 text-sm text-primary-600 hover:text-primary-700"
            >
              创建第一篇笔记
            </button>
          </div>
        ) : (
          filteredNotes.map(note => (
            <div
              key={note.id}
              onClick={async () => {
                const result = await window.electronAPI.readNote(note.path)
                if (result.success) {
                  setCurrentNote({
                    ...note,
                    content: result.content
                  })
                }
              }}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                currentNote?.path === note.path ? 'bg-primary-50' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <h3 className="font-medium text-gray-800 truncate flex-1">
                  {note.title}
                </h3>
                <button
                  onClick={(e) => handleDeleteNote(e, note.path)}
                  className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="删除"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                {getPreview(note.content)}
              </p>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400">
                  {formatDate(note.updatedAt)}
                </span>
                {note.tags.length > 0 && (
                  <div className="flex gap-1">
                    {note.tags.slice(0, 2).map(tag => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 dark:text-gray-400 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {note.tags.length > 2 && (
                      <span className="text-xs text-gray-400">
                        +{note.tags.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}