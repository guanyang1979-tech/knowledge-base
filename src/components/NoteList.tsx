import { useMemo, useState, useEffect } from 'react'
import { useAppStore } from '../stores/appStore'

export default function NoteList() {
  const {
    notes,
    currentNote,
    setCurrentNote,
    selectedCategory,
    searchQuery,
    refreshNotes,
    config,
    categories,
    noteListWidth,
    sortField,
    sortOrder,
    setSortField,
  } = useAppStore()

  const [showNewNote, setShowNewNote] = useState(false)
  const [newNoteTitle, setNewNoteTitle] = useState('')
  const [newNoteCategory, setNewNoteCategory] = useState('')
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set())
  const [showBatchActions, setShowBatchActions] = useState(false)
  const [batchMoveCategory, setBatchMoveCategory] = useState('')

  // 响应式断点
  const isCompact = noteListWidth < 240
  const isUltraCompact = noteListWidth < 200

  // 监听自定义事件，打开新建笔记表单
  useEffect(() => {
    const handleOpenNewNoteForm = () => {
      setNewNoteCategory(selectedCategory || '')
      setShowNewNote(true)
    }
    window.addEventListener('open-new-note-form', handleOpenNewNoteForm)
    return () => window.removeEventListener('open-new-note-form', handleOpenNewNoteForm)
  }, [selectedCategory])

  // 过滤 + 排序笔记
  const filteredNotes = useMemo(() => {
    let result = notes

    if (selectedCategory) {
      result = result.filter(note => note.category === selectedCategory)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(note =>
        note.title.toLowerCase().includes(query) ||
        (note.preview && note.preview.toLowerCase().includes(query)) ||
        note.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    result = [...result].sort((a, b) => {
      let cmp = 0
      if (sortField === 'title') {
        cmp = a.title.localeCompare(b.title, 'zh-CN')
      } else if (sortField === 'category') {
        cmp = a.category.localeCompare(b.category, 'zh-CN')
      } else {
        cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      }
      return sortOrder === 'asc' ? cmp : -cmp
    })

    return result
  }, [notes, selectedCategory, searchQuery, sortField, sortOrder])

  // 创建新笔记
  const handleCreateNote = async () => {
    if (!newNoteTitle.trim()) return
    const category = newNoteCategory || selectedCategory || '技术文档'
    const result = await window.electronAPI.createNote(category, newNoteTitle.trim())
    if (result.success) {
      await refreshNotes()
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
        if (currentNote?.path === notePath) {
          setCurrentNote(null)
        }
      }
    }
  }

  // 选择/取消选择笔记
  const handleSelectNote = (e: React.MouseEvent, notePath: string) => {
    if (e.shiftKey) {
      e.preventDefault()
      setSelectedNotes(prev => {
        const newSet = new Set(prev)
        if (newSet.has(notePath)) {
          newSet.delete(notePath)
        } else {
          newSet.add(notePath)
        }
        setShowBatchActions(newSet.size > 0)
        return newSet
      })
    }
  }

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedNotes.size === filteredNotes.length) {
      setSelectedNotes(new Set())
      setShowBatchActions(false)
    } else {
      setSelectedNotes(new Set(filteredNotes.map(n => n.path)))
      setShowBatchActions(true)
    }
  }

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedNotes.size === 0) return
    if (confirm(`确定要把 ${selectedNotes.size} 篇笔记移到回收站吗？`)) {
      let successCount = 0
      for (const notePath of selectedNotes) {
        const result = await window.electronAPI.moveToTrash(notePath, config.notesDir)
        if (result.success) {
          successCount++
          if (currentNote?.path === notePath) setCurrentNote(null)
        }
      }
      setSelectedNotes(new Set())
      setShowBatchActions(false)
      await refreshNotes()
      alert(`成功移动 ${successCount} 篇笔记到回收站`)
    }
  }

  // 批量移动分类
  const handleBatchMove = async () => {
    if (selectedNotes.size === 0 || !batchMoveCategory) return
    let successCount = 0
    for (const notePath of selectedNotes) {
      try {
        const noteResult = await window.electronAPI.readNote(notePath)
        if (noteResult.success && noteResult.content) {
          const newContent = noteResult.content.replace(/category:\s*.+/, `category: ${batchMoveCategory}`)
          const saveResult = await window.electronAPI.saveNote(notePath, newContent)
          if (saveResult.success) successCount++
        }
      } catch (error) {
        console.error('Failed to move note:', error)
      }
    }
    setSelectedNotes(new Set())
    setShowBatchActions(false)
    setBatchMoveCategory('')
    await refreshNotes()
    alert(`成功移动 ${successCount} 篇笔记到 ${batchMoveCategory}`)
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return '今天'
    if (days === 1) return '昨天'
    if (days < 7) return `${days}天前`
    return date.toLocaleDateString('zh-CN')
  }

  // 预览内容
  const getPreview = (note: any) => {
    if (note.preview) return note.preview
    if (note.content) {
      const withoutFM = note.content.replace(/^---[\s\S]*?---\n/, '')
      const withoutTitle = withoutFM.replace(/^#\s+.+$/m, '')
      return withoutTitle.substring(0, 50).replace(/\n/g, ' ').trim()
    }
    return ''
  }

  // 排序按钮
  const SortButton = ({ field, label }: { field: 'updatedAt' | 'title' | 'category'; label: string }) => {
    const active = sortField === field
    return (
      <button
        onClick={() => setSortField(field)}
        className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
          active
            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
            : 'text-gray-400 dark:text-white/25 hover:text-gray-600 dark:hover:text-white/50'
        }`}
      >
        {label}
        {active && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
      </button>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 标题栏 */}
      <div className="px-3 py-2.5 border-b border-gray-200 dark:border-white/[0.06] flex items-center justify-between flex-shrink-0">
        <h2 className="text-xs font-medium text-gray-700 dark:text-white/60 truncate">
          {searchQuery ? (
            <>搜索: <span className="text-primary-600">"{searchQuery}"</span></>
          ) : (
            selectedCategory || '全部笔记'
          )}
          <span className="ml-1 text-gray-400 dark:text-white/25">({filteredNotes.length})</span>
        </h2>
        <button
          onClick={() => {
            setNewNoteCategory(selectedCategory || '')
            setShowNewNote(true)
          }}
          className="p-1 text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded transition-colors flex-shrink-0"
          title="新建笔记"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* 排序栏 */}
      <div className="px-3 py-1.5 border-b border-gray-100 dark:border-white/[0.04] flex items-center gap-1 flex-shrink-0">
        <span className="text-[10px] text-gray-300 dark:text-white/15 mr-1">排序:</span>
        <SortButton field="updatedAt" label="更新时间" />
        <SortButton field="title" label="标题" />
        <SortButton field="category" label="分类" />
      </div>

      {/* 新建笔记表单 */}
      {showNewNote && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
          <input
            type="text"
            value={newNoteTitle}
            onChange={(e) => setNewNoteTitle(e.target.value)}
            placeholder="笔记标题"
            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none mb-2"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreateNote()}
          />
          <select
            value={newNoteCategory || selectedCategory || ''}
            onChange={(e) => setNewNoteCategory(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none mb-2"
          >
            <option value="">选择分类</option>
            {categories.map(cat => (
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
              onClick={() => { setShowNewNote(false); setNewNoteTitle('') }}
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
            {searchQuery ? (
              <>
                <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-sm">未找到匹配 "<span className="font-medium text-gray-700 dark:text-gray-300">{searchQuery}</span>" 的笔记</p>
                <p className="text-xs text-gray-400 mt-1">试试其他关键词</p>
              </>
            ) : (
              <>
                <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">暂无笔记</p>
                <button
                  onClick={() => setShowNewNote(true)}
                  className="mt-2 text-sm text-primary-600 hover:text-primary-700"
                >
                  创建第一篇笔记
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {/* 批量操作工具栏 */}
            {showBatchActions && (
              <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 dark:bg-gray-800 flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleSelectAll}
                  className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                >
                  {selectedNotes.size === filteredNotes.length ? '取消全选' : '全选'}
                </button>
                <span className="text-xs text-gray-500">{selectedNotes.size} 篇</span>
                <div className="flex-1" />
                <select
                  value={batchMoveCategory}
                  onChange={(e) => setBatchMoveCategory(e.target.value)}
                  className="px-1.5 py-1 text-xs border border-gray-300 rounded focus:outline-none"
                >
                  <option value="">移动到</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <button
                  onClick={handleBatchMove}
                  disabled={!batchMoveCategory}
                  className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                >
                  移动
                </button>
                <button
                  onClick={handleBatchDelete}
                  className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                >
                  删除
                </button>
                <button
                  onClick={() => { setSelectedNotes(new Set()); setShowBatchActions(false) }}
                  className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                >
                  取消
                </button>
              </div>
            )}

            {/* 笔记列表 */}
            {filteredNotes.map(note => (
              <div
                key={note.id}
                onClick={(e) => {
                  if (e.shiftKey || selectedNotes.size > 0) {
                    handleSelectNote(e, note.path)
                  } else {
                    window.electronAPI.readNote(note.path).then(result => {
                      if (result.success) {
                        setCurrentNote({ ...note, content: result.content })
                      }
                    })
                  }
                }}
                className={`group px-3 py-2.5 border-b border-gray-100 dark:border-white/[0.04] cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors ${
                  currentNote?.path === note.path ? 'bg-primary-50 dark:bg-primary-900/10 border-l-2 border-l-primary-500' : ''
                } ${selectedNotes.has(note.path) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
              >
                {/* 标题行 */}
                <div className="flex items-center gap-1.5 mb-1">
                  {showBatchActions && (
                    <input
                      type="checkbox"
                      checked={selectedNotes.has(note.path)}
                      onChange={() => handleSelectNote({ shiftKey: true } as React.MouseEvent, note.path)}
                      className="w-3.5 h-3.5 text-primary-600 border-gray-300 rounded focus:ring-primary-500 flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <svg className="w-3.5 h-3.5 text-gray-300 dark:text-white/15 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-sm font-medium text-gray-800 dark:text-white/70 truncate flex-1">
                    {note.title}
                  </h3>
                  <button
                    onClick={(e) => handleDeleteNote(e, note.path)}
                    className="p-0.5 text-gray-300 dark:text-white/15 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    title="删除"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* 元信息行 */}
                <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-white/20 mb-1 pl-5">
                  <span className="truncate">{note.category}</span>
                  <span>·</span>
                  <span className="flex-shrink-0">{formatDate(note.updatedAt)}</span>
                  {!isUltraCompact && (
                    <>
                      <span>·</span>
                      <span className="flex-shrink-0">{getReadingTime(note)}</span>
                    </>
                  )}
                </div>

                {/* 标签行 */}
                {!isUltraCompact && note.tags.length > 0 && (
                  <div className="flex gap-1 mb-1 pl-5 flex-wrap">
                    {(isCompact ? note.tags.slice(0, 1) : note.tags.slice(0, 3)).map(tag => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 text-[10px] bg-gray-100 dark:bg-white/[0.04] text-gray-500 dark:text-white/25 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {!isCompact && note.tags.length > 3 && (
                      <span className="text-[10px] text-gray-400 dark:text-white/20">+{note.tags.length - 3}</span>
                    )}
                    {isCompact && note.tags.length > 1 && (
                      <span className="text-[10px] text-gray-400 dark:text-white/20">+{note.tags.length - 1}</span>
                    )}
                  </div>
                )}

                {/* 预览行 */}
                {!isCompact && (
                  <p className="text-xs text-gray-400 dark:text-white/20 line-clamp-2 pl-5">
                    {getPreview(note)}
                  </p>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function getReadingTime(note: any) {
  if (!note.preview) return null
  const chineseChars = (note.preview.match(/[一-龥]/g) || []).length
  const englishWords = (note.preview.match(/[a-zA-Z]+/g) || []).length
  const wordCount = chineseChars + englishWords
  if (!wordCount) return null
  const minutes = Math.ceil(wordCount / 300)
  return minutes < 1 ? '<1分钟' : `${minutes}分钟`
}
