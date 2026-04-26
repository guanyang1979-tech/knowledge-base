import { useState, useEffect } from 'react'
import { useAppStore } from '../stores/appStore'

interface ImportPanelProps {
  onClose: () => void
}

export default function ImportPanel({ onClose }: ImportPanelProps) {
  const { config, refreshNotes } = useAppStore()
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<{
    total: number
    successCount: number
    failedCount: number
    results: { filePath: string; success: boolean; title?: string; error?: string }[]
  } | null>(null)
  const [category, setCategory] = useState('文档库')
  const [allCategories, setAllCategories] = useState<string[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [useNewCategory, setUseNewCategory] = useState(false)

  // 加载所有分类（包括隐藏的）
  useEffect(() => {
    window.electronAPI.getAllCategories().then(cats => {
      setAllCategories(cats)
      if (cats.length > 0 && !cats.includes(category)) {
        setCategory(cats[0])
      }
    })
  }, [])

  const effectiveCategory = useNewCategory ? newCategoryName.trim() : category

  // 导入文档
  const handleImport = async () => {
    if (!effectiveCategory) {
      alert('请选择或输入分类名称')
      return
    }

    // 选择文件
    const fileResult = await window.electronAPI.selectFiles({
      filters: [
        { name: '支持的文档', extensions: ['md', 'txt', 'docx', 'xlsx', 'xls', 'pdf'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    })

    if (!fileResult.success || fileResult.filePaths.length === 0) {
      return
    }

    // 获取笔记目录
    const notesDir = await window.electronAPI.getNotesDir()
    if (!notesDir) {
      alert('请先在设置中配置笔记目录')
      return
    }

    // 检查分类目录是否已存在
    const dirExists = await window.electronAPI.checkCategoryExists(effectiveCategory)

    if (dirExists) {
      // 目录已存在，提示用户选择
      const action = confirm(
        `分类 "${effectiveCategory}" 已存在。\n\n` +
        `点击"确定"将文件导入到已有分类中（合并），\n` +
        `点击"取消"可修改分类名称。`
      )
      if (!action) {
        return
      }
    }

    setImporting(true)
    setResults(null)

    try {
      const importResult = await window.electronAPI.importDocumentsBatch(
        fileResult.filePaths,
        notesDir,
        effectiveCategory
      )

      setResults(importResult)

      if (importResult.successCount > 0) {
        await refreshNotes()
        // 刷新分类列表
        const cats = await window.electronAPI.getAllCategories()
        setAllCategories(cats)
      }
    } catch (error: any) {
      alert('导入失败: ' + error.message)
    } finally {
      setImporting(false)
    }
  }

  // ESC 键关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !importing) onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose, importing])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">导入文档</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* 分类选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              导入到分类
            </label>

            {!useNewCategory ? (
              <div className="space-y-2">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:outline-none bg-gray-50 dark:bg-gray-700"
                >
                  {allCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <button
                  onClick={() => setUseNewCategory(true)}
                  className="text-xs text-primary-600 hover:text-primary-700"
                >
                  + 新建分类
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="输入新分类名称"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:outline-none bg-gray-50 dark:bg-gray-700"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setUseNewCategory(false)
                    setNewCategoryName('')
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  选择已有分类
                </button>
              </div>
            )}
          </div>

          {/* 支持的格式说明 */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">支持的格式</h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
              <div>• Markdown (.md)</div>
              <div>• Word (.docx)</div>
              <div>• Excel (.xlsx, .xls)</div>
              <div>• PDF (.pdf)</div>
              <div>• 纯文本 (.txt)</div>
            </div>
          </div>

          {/* 导入按钮 */}
          <button
            onClick={handleImport}
            disabled={importing || !effectiveCategory}
            className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {importing ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                导入中...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                选择文件导入
              </>
            )}
          </button>

          {/* 导入结果 */}
          {results && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">导入结果</h3>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p>总计: {results.total} 个文件</p>
                <p className="text-green-600">成功: {results.successCount} 个</p>
                {results.failedCount > 0 && (
                  <p className="text-red-600">失败: {results.failedCount} 个</p>
                )}
              </div>

              {results.results.filter(r => !r.success).length > 0 && (
                <div className="mt-3 max-h-32 overflow-y-auto">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">失败文件:</p>
                  {results.results
                    .filter(r => !r.success)
                    .map((r, i) => (
                      <p key={i} className="text-xs text-red-500">
                        {r.filePath}: {r.error}
                      </p>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            disabled={importing}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
