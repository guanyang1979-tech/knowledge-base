import { useState } from 'react'
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

  // 导入文档
  const handleImport = async () => {
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

    setImporting(true)
    setResults(null)

    try {
      const importResult = await window.electronAPI.importDocumentsBatch(
        fileResult.filePaths,
        notesDir,
        category
      )

      setResults(importResult)

      // 刷新笔记列表
      if (importResult.successCount > 0) {
        await refreshNotes()
      }
    } catch (error: any) {
      alert('导入失败: ' + error.message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
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
        <div className="p-6 space-y-4">
          {/* 分类选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              导入到分类
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:outline-none bg-gray-50 dark:bg-gray-700"
            >
              <option value="文档库">文档库</option>
              <option value="技术文档">技术文档</option>
              <option value="工作日志">工作日志</option>
              <option value="读书笔记">读书笔记</option>
            </select>
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
            disabled={importing}
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

              {/* 失败列表 */}
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
      </div>
    </div>
  )
}