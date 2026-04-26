import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../stores/appStore'

export default function Sidebar() {
  const {
    categories,
    selectedCategory,
    setSelectedCategory,
    templates,
    refreshNotes,
    setCurrentNote
  } = useAppStore()

  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [activeTab, setActiveTab] = useState<'categories' | 'templates'>('categories')

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; category: string } | null>(null)
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  // 隐藏分类
  const [hiddenCategories, setHiddenCategories] = useState<string[]>([])
  const [showHidden, setShowHidden] = useState(false)

  // 加载隐藏分类
  useEffect(() => {
    window.electronAPI.getHiddenCategories().then(setHiddenCategories)
  }, [])

  // 点击其他地方关闭右键菜单
  useEffect(() => {
    if (contextMenu) {
      const handleClick = () => setContextMenu(null)
      window.addEventListener('click', handleClick)
      return () => window.removeEventListener('click', handleClick)
    }
  }, [contextMenu])

  // 重命名输入框自动聚焦
  useEffect(() => {
    if (renamingCategory) {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    }
  }, [renamingCategory])

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return
    await window.electronAPI.createNote(newCategoryName.trim(), 'README')
    await refreshNotes()
    setNewCategoryName('')
    setShowNewCategory(false)
  }

  const handleUseTemplate = async (template: any) => {
    const result = await window.electronAPI.createNote('未分类', template.name)
    if (result.success) {
      await window.electronAPI.saveNote(result.path, template.content)
      await refreshNotes()
      const notes = useAppStore.getState().notes
      const newNote = notes.find(n => n.path === result.path)
      if (newNote) {
        setCurrentNote({ ...newNote, content: template.content })
      }
    }
  }

  // 右键菜单
  const handleContextMenu = (e: React.MouseEvent, category: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, category })
  }

  // 开始重命名
  const handleStartRename = (category: string) => {
    setRenamingCategory(category)
    setRenameValue(category)
    setContextMenu(null)
  }

  // 确认重命名
  const handleConfirmRename = async () => {
    if (!renamingCategory || !renameValue.trim() || renameValue.trim() === renamingCategory) {
      setRenamingCategory(null)
      return
    }
    const result = await window.electronAPI.renameCategory(renamingCategory, renameValue.trim())
    if (result.success) {
      if (selectedCategory === renamingCategory) {
        setSelectedCategory(renameValue.trim())
      }
      await refreshNotes()
    } else {
      alert(result.error || '重命名失败')
    }
    setRenamingCategory(null)
  }

  // 切换隐藏
  const handleToggleHidden = async (category: string) => {
    const result = await window.electronAPI.toggleCategoryHidden(category)
    if (result.success) {
      setHiddenCategories(prev =>
        result.hidden
          ? [...prev, category]
          : prev.filter(c => c !== category)
      )
      if (result.hidden && selectedCategory === category) {
        setSelectedCategory(null)
      }
      await refreshNotes()
    }
    setContextMenu(null)
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* Tab 切换 */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            activeTab === 'categories'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          分类
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            activeTab === 'templates'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          模板
        </button>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto py-2">
        {activeTab === 'categories' ? (
          <>
            {/* 全部笔记 */}
            <button
              onClick={() => setSelectedCategory(null)}
              className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                selectedCategory === null ? 'bg-primary-50 text-primary-700' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                全部笔记
              </span>
            </button>

            {/* 分类列表 */}
            {categories.map(category => (
              <div key={category}>
                {renamingCategory === category ? (
                  <div className="px-4 py-1.5">
                    <input
                      ref={renameInputRef}
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={handleConfirmRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleConfirmRename()
                        if (e.key === 'Escape') setRenamingCategory(null)
                      }}
                      className="w-full px-2 py-1 text-sm border border-primary-500 rounded focus:outline-none"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedCategory(category)}
                    onContextMenu={(e) => handleContextMenu(e, category)}
                    className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      selectedCategory === category ? 'bg-primary-50 text-primary-700' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      {category}
                    </span>
                  </button>
                )}
              </div>
            ))}

            {/* 新建分类 */}
            {showNewCategory ? (
              <div className="px-4 py-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="分类名称"
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:border-primary-500 focus:outline-none"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
                  />
                  <button
                    onClick={handleCreateCategory}
                    className="px-2 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
                  >
                    添加
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewCategory(true)}
                className="w-full px-4 py-2 text-left text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                新建分类
              </button>
            )}

            {/* 隐藏的分类 */}
            {hiddenCategories.length > 0 && (
              <div className="mt-2 border-t border-gray-200 dark:border-gray-700 pt-2">
                <button
                  onClick={() => setShowHidden(!showHidden)}
                  className="w-full px-4 py-1.5 text-left text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className={`w-3 h-3 transition-transform ${showHidden ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  已隐藏 ({hiddenCategories.length})
                </button>
                {showHidden && hiddenCategories.map(cat => (
                  <div key={cat} className="flex items-center px-4 py-1.5 group">
                    <span className="flex-1 text-sm text-gray-400 dark:text-gray-500 truncate">{cat}</span>
                    <button
                      onClick={() => handleToggleHidden(cat)}
                      className="text-xs text-primary-500 hover:text-primary-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="取消隐藏"
                    >
                      显示
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {templates.length === 0 ? (
              <div className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                暂无模板
              </div>
            ) : (
              templates.map(template => (
                <button
                  key={template.name}
                  onClick={() => handleUseTemplate(template)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {template.name}
                </button>
              ))
            )}
            <div className="px-4 py-2 mt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                在「模板」分类下创建的笔记将作为模板显示
              </p>
            </div>
          </>
        )}
      </div>

      {/* 右键菜单 */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => handleStartRename(contextMenu.category)}
            className="w-full px-3 py-1.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            重命名
          </button>
          <button
            onClick={() => handleToggleHidden(contextMenu.category)}
            className="w-full px-3 py-1.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
            隐藏
          </button>
        </div>
      )}

      {/* 底部信息 */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => useAppStore.getState().setTrashOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          回收站
        </button>
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          <p>存储位置: {useAppStore.getState().config.notesDir || '未设置'}</p>
        </div>
      </div>
    </div>
  )
}
