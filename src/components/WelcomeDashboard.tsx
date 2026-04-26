import { useMemo, useState } from 'react'
import { useAppStore } from '../stores/appStore'

interface WelcomeDashboardProps {
  onSelectNote: (notePath: string) => void
  onCreateNote: () => void
}

export default function WelcomeDashboard({ onSelectNote, onCreateNote }: WelcomeDashboardProps) {
  const { notes, config, setImportOpen, setExportOpen, setStatisticsOpen, setTrashOpen, refreshNotes } = useAppStore()
  const [syncing, setSyncing] = useState(false)

  const stats = useMemo(() => {
    const total = notes.length
    const categories = new Set(notes.map(n => n.category)).size
    const tags = new Set(notes.flatMap(n => n.tags)).size
    const thisWeek = notes.filter(n => {
      const d = new Date(n.updatedAt)
      return Date.now() - d.getTime() < 7 * 24 * 60 * 60 * 1000
    }).length
    return { total, categories, tags, thisWeek }
  }, [notes])

  const recentNotes = useMemo(() => {
    return [...notes]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 6)
  }, [notes])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return '刚刚'
    if (hours < 24) return `${hours}小时前`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}天前`
    return d.toLocaleDateString('zh-CN')
  }

  const handleSync = async () => {
    if (!config.obsidianVaultPath) {
      alert('请先在设置中配置 Obsidian Vault 路径')
      return
    }
    if (!config.notesDir) {
      alert('请先在设置中配置笔记存储目录')
      return
    }
    setSyncing(true)
    try {
      const result = await window.electronAPI.syncObsidianNotes(
        config.obsidianVaultPath,
        config.notesDir,
        config.obsidianExcludeFolders || []
      )
      if (result.success) {
        await refreshNotes()
        alert(`同步完成！共同步 ${result.syncedCount} 篇笔记`)
      } else {
        alert(`同步失败: ${result.error}`)
      }
    } catch (error: any) {
      alert(`同步失败: ${error.message}`)
    } finally {
      setSyncing(false)
    }
  }

  const quickActions = [
    { icon: 'plus', label: '新建笔记', action: onCreateNote },
    { icon: 'upload', label: '导入文档', action: () => setImportOpen(true) },
    { icon: 'download', label: '导出笔记', action: () => setExportOpen(true) },
    { icon: 'chart', label: '统计分析', action: () => setStatisticsOpen(true) },
    { icon: 'sync', label: syncing ? '同步中...' : '同步笔记', action: handleSync, disabled: syncing },
    { icon: 'trash', label: '回收站', action: () => setTrashOpen(true) },
  ]

  const actionIcons: Record<string, JSX.Element> = {
    plus: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />,
    upload: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />,
    download: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />,
    chart: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
    sync: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />,
    trash: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />,
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-[#0a0a0f] dark:via-[#0d0d14] dark:to-[#08080d]">
      {/* Subtle grid overlay (dark mode only) */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] dark:opacity-[0.02] opacity-0" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />

      <div className="relative p-8">
        {/* Welcome section */}
        <div className="mb-10">
          <h1 className="text-[28px] font-light tracking-wide text-gray-900 dark:text-white/90 mb-2">
            欢迎使用知识库助手
          </h1>
          <p className="text-sm text-gray-500 dark:text-white/30 tracking-wider">
            管理你的知识，让 AI 助你一臂之力
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-4 gap-4 mb-10">
          {[
            { label: '总笔记', value: stats.total },
            { label: '分类', value: stats.categories },
            { label: '标签', value: stats.tags },
            { label: '本周更新', value: stats.thisWeek },
          ].map(stat => (
            <div key={stat.label} className="relative rounded-lg border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] backdrop-blur-sm p-5 group hover:border-gray-300 dark:hover:border-white/[0.12] transition-all duration-300">
              <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 60%)',
              }} />
              <div className="relative">
                <div className="text-[28px] font-extralight text-gray-900 dark:text-white/80">{stat.value}</div>
                <div className="text-xs text-gray-500 dark:text-white/25 mt-1 tracking-wide">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="mb-10">
          <h2 className="text-xs text-gray-400 dark:text-white/20 uppercase tracking-[0.2em] mb-5">
            快捷操作
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map(action => (
              <button
                key={action.label}
                onClick={action.action}
                disabled={'disabled' in action && action.disabled}
                className="flex items-center gap-3 px-4 py-3.5 rounded-lg border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.015] hover:border-gray-300 dark:hover:border-white/[0.15] hover:bg-gray-50 dark:hover:bg-white/[0.04] active:bg-gray-100 dark:active:bg-white/[0.06] transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 text-gray-400 dark:text-white/30 group-hover:text-gray-600 dark:group-hover:text-white/60 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {actionIcons[action.icon]}
                </svg>
                <span className="text-sm text-gray-600 dark:text-white/50 group-hover:text-gray-900 dark:group-hover:text-white/80 transition-colors">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent notes */}
        <div className="mb-10">
          <h2 className="text-xs text-gray-400 dark:text-white/20 uppercase tracking-[0.2em] mb-5">
            最近笔记
          </h2>
          {recentNotes.length === 0 ? (
            <div className="text-center py-16 border border-gray-200 dark:border-white/[0.04] rounded-lg bg-gray-50 dark:bg-white/[0.01]">
              <div className="text-gray-400 dark:text-white/15 text-sm">还没有笔记，点击上方"新建笔记"开始吧</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {recentNotes.map(note => (
                <button
                  key={note.id}
                  onClick={() => onSelectNote(note.path)}
                  className="text-left px-4 py-4 rounded-lg border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.015] hover:border-gray-300 dark:hover:border-white/[0.15] hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-all duration-200 group"
                >
                  <h3 className="text-sm text-gray-800 dark:text-white/70 group-hover:text-gray-900 dark:group-hover:text-white/90 transition-colors truncate">
                    {note.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-white/20 mt-1.5">
                    {note.category} · {formatDate(note.updatedAt)}
                  </p>
                  {note.tags.length > 0 && (
                    <div className="flex gap-1.5 mt-2.5 flex-wrap">
                      {note.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="px-2 py-0.5 text-[10px] border border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-white/25 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tips section */}
        <div className="px-4 py-3 rounded-lg border border-gray-200 dark:border-white/[0.04] bg-white dark:bg-white/[0.015]">
          <h3 className="text-[11px] text-gray-400 dark:text-white/25 mb-2 tracking-wide">小贴士</h3>
          <ul className="text-[11px] text-gray-400 dark:text-white/20 space-y-1">
            <li>• 点击右上角齿轮图标配置 Claude API Key 以启用 AI 功能</li>
            <li>• 设置 Obsidian Vault 路径可自动同步已有笔记</li>
            <li>• 支持导入 Word、Excel、PDF 等格式文档</li>
            <li>• 笔记自动保存，也可按 Ctrl+S 手动保存</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
