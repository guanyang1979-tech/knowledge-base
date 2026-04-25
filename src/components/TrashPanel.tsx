import { useState, useEffect } from 'react'
import { useAppStore } from '../stores/appStore'

interface TrashNote {
  id: string
  path: string
  title: string
  deletedAt: string
  originalPath?: string
}

interface TrashPanelProps {
  onClose: () => void
  onRestore: () => void
}

export default function TrashPanel({ onClose, onRestore }: TrashPanelProps) {
  const { config, refreshNotes } = useAppStore()
  const [trashNotes, setTrashNotes] = useState<TrashNote[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // 加载回收站笔记
  useEffect(() => {
    loadTrashNotes()
  }, [config.notesDir])

  const loadTrashNotes = async () => {
    if (!config.notesDir) return

    setLoading(true)
    try {
      const result = await window.electronAPI.getTrashNotes(config.notesDir)
      if (result.success) {
        setTrashNotes(result.notes)
      }
    } catch (error) {
      console.error('Failed to load trash notes:', error)
    } finally {
      setLoading(false)
    }
  }

  // 恢复笔记
  const handleRestore = async (trashPath: string) => {
    if (!config.notesDir) return

    setActionLoading(trashPath)
    try {
      const result = await window.electronAPI.restoreFromTrash(trashPath, config.notesDir)
      if (result.success) {
        await loadTrashNotes()
        onRestore()
      } else {
        alert('恢复失败: ' + result.error)
      }
    } catch (error: any) {
      alert('恢复失败: ' + error.message)
    } finally {
      setActionLoading(null)
    }
  }

  // 永久删除
  const handlePermanentDelete = async (trashPath: string) => {
    if (!confirm('确定要永久删除这条笔记吗？此操作不可恢复！')) return

    setActionLoading(trashPath)
    try {
      const result = await window.electronAPI.permanentDelete(trashPath)
      if (result.success) {
        await loadTrashNotes()
      } else {
        alert('删除失败: ' + result.error)
      }
    } catch (error: any) {
      alert('删除失败: ' + error.message)
    } finally {
      setActionLoading(null)
    }
  }

  // 清空回收站
  const handleEmptyTrash = async () => {
    if (!confirm('确定要清空回收站吗？此操作不可恢复！')) return
    if (!config.notesDir) return

    try {
      const result = await window.electronAPI.emptyTrash(config.notesDir)
      if (result.success) {
        setTrashNotes([])
      } else {
        alert('清空失败: ' + result.error)
      }
    } catch (error: any) {
      alert('清空失败: ' + error.message)
    }
  }

  // 格式化时间
  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">回收站</h2>
          <div className="flex items-center gap-2">
            {trashNotes.length > 0 && (
              <button
                onClick={handleEmptyTrash}
                className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
              >
                清空回收站
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-400 rounded"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : trashNotes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              回收站是空的
            </div>
          ) : (
            <div className="space-y-3">
              {trashNotes.map(note => (
                <div
                  key={note.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-800 dark:text-gray-200 truncate">{note.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      删除于: {formatTime(note.deletedAt)}
                    </p>
                    {note.originalPath && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                        原始位置: {note.originalPath}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleRestore(note.path)}
                      disabled={actionLoading === note.path}
                      className="px-3 py-1 text-sm text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded disabled:opacity-50"
                    >
                      恢复
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(note.path)}
                      disabled={actionLoading === note.path}
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}