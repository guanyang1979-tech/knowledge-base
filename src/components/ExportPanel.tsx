import { useState, useEffect } from 'react'
import { useAppStore } from '../stores/appStore'

interface ExportPanelProps {
  onClose: () => void
}

export default function ExportPanel({ onClose }: ExportPanelProps) {
  const { notes, currentNote, config } = useAppStore()
  const [exportFormat, setExportFormat] = useState<'md' | 'html' | 'txt'>('md')
  const [exportMode, setExportMode] = useState<'single' | 'batch'>('single')
  const [selectedNotes, setSelectedNotes] = useState<string[]>([])
  const [exporting, setExporting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  // 切换笔记选择
  const toggleNoteSelection = (notePath: string) => {
    setSelectedNotes(prev =>
      prev.includes(notePath)
        ? prev.filter(p => p !== notePath)
        : [...prev, notePath]
    )
  }

  // 全选
  const selectAll = () => {
    setSelectedNotes(notes.map(n => n.path))
  }

  // 取消全选
  const selectNone = () => {
    setSelectedNotes([])
  }

  // 导出
  const handleExport = async () => {
    setExporting(true)
    setResult(null)

    try {
      if (exportMode === 'single') {
        if (!currentNote) {
          alert('请先选择一篇笔记')
          setExporting(false)
          return
        }

        const res = await window.electronAPI.exportNote(currentNote.path, exportFormat)
        if (res.success) {
          setResult({ success: true, message: `已导出到: ${res.path}` })
        } else {
          setResult({ success: false, message: res.error || '导出失败' })
        }
      } else {
        // 批量导出
        if (selectedNotes.length === 0) {
          alert('请选择要导出的笔记')
          setExporting(false)
          return
        }

        const res = await window.electronAPI.exportNotesBatch(selectedNotes, exportFormat, config.notesDir)
        if (res.success) {
          setResult({
            success: true,
            message: `成功导出 ${res.successCount}/${res.total} 篇笔记到:\n${res.exportDir}`
          })
        } else {
          setResult({ success: false, message: res.error || '批量导出失败' })
        }
      }
    } catch (error: any) {
      setResult({ success: false, message: error.message })
    } finally {
      setExporting(false)
    }
  }

  // ESC 键关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !exporting) onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose, exporting])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">导出笔记</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-400 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* 导出模式 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              导出方式
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="exportMode"
                  checked={exportMode === 'single'}
                  onChange={() => setExportMode('single')}
                  className="text-primary-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">导出当前笔记</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="exportMode"
                  checked={exportMode === 'batch'}
                  onChange={() => setExportMode('batch')}
                  className="text-primary-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">批量导出</span>
              </label>
            </div>
          </div>

          {/* 批量选择 */}
          {exportMode === 'batch' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  选择笔记 ({selectedNotes.length}/{notes.length})
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    全选
                  </button>
                  <button
                    onClick={selectNone}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    取消
                  </button>
                </div>
              </div>
              <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-2 space-y-1">
                {notes.map(note => (
                  <label
                    key={note.path}
                    className="flex items-center gap-2 p-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedNotes.includes(note.path)}
                      onChange={() => toggleNoteSelection(note.path)}
                      className="text-primary-600 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {note.title}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 导出格式 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              导出格式
            </label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'md' | 'html' | 'txt')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:outline-none bg-gray-50 dark:bg-gray-700"
            >
              <option value="md">Markdown (.md)</option>
              <option value="html">网页 (.html)</option>
              <option value="txt">纯文本 (.txt)</option>
            </select>
          </div>

          {/* 导出按钮 */}
          <button
            onClick={handleExport}
            disabled={exporting || (exportMode === 'batch' && selectedNotes.length === 0)}
            className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {exporting ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                导出中...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {exportMode === 'single' ? '导出当前笔记' : `导出 ${selectedNotes.length} 篇笔记`}
              </>
            )}
          </button>

          {/* 结果提示 */}
          {result && (
            <div className={`p-3 rounded-lg ${result.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
              <p className={`text-sm ${result.success ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                {result.message}
              </p>
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            disabled={exporting}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}