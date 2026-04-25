import { useState } from 'react'
import { useAppStore } from '../stores/appStore'

export default function Sidebar() {
  const {
    categories,
    selectedCategory,
    setSelectedCategory,
    templates,
    refreshNotes
  } = useAppStore()

  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [activeTab, setActiveTab] = useState<'categories' | 'templates'>('categories')

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return

    const notesDir = await window.electronAPI.getNotesDir()
    // 通过创建笔记来创建分类
    await window.electronAPI.createNote(newCategoryName.trim(), 'init')
    await refreshNotes()
    setNewCategoryName('')
    setShowNewCategory(false)
  }

  const defaultCategories = ['技术文档', '读书笔记', '工作日志', '模板']

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* Tab 切换 */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            activeTab === 'categories'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-300'
          }`}
        >
          分类
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            activeTab === 'templates'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-300'
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
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
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
          </>
        ) : (
          <>
            {/* 模板列表 */}
            {templates.length === 0 ? (
              <div className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                暂无模板
              </div>
            ) : (
              templates.map(template => (
                <button
                  key={template.name}
                  onClick={() => {
                    // 使用模板创建新笔记
                    useAppStore.getState().setCurrentNote({
                      id: 'new',
                      path: '',
                      title: template.name,
                      category: '未分类',
                      tags: [],
                      content: template.content,
                      updatedAt: new Date().toISOString()
                    })
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {template.name}
                </button>
              ))
            )}

            {/* 创建模板说明 */}
            <div className="px-4 py-2 mt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                在「模板」分类下创建的笔记将作为模板显示
              </p>
            </div>
          </>
        )}
      </div>

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