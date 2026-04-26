import { useEffect } from 'react'

interface AboutModalProps {
  onClose: () => void
}

const features = [
  'Markdown 笔记编辑与实时预览',
  'Obsidian 语法完整支持',
  'AI 智能问答、摘要、润色',
  '相关笔记智能推荐',
  'Excel / Word / PDF 文档导入',
  '可拖拽面板布局',
  '深色 / 浅色主题',
]

export default function AboutModal({ onClose }: AboutModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleOpenDoc = () => {
    window.electronAPI.openExternal('open-readme')
  }

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white dark:bg-[#14141c] rounded-xl border border-gray-200 dark:border-white/[0.08] shadow-2xl w-[420px] max-w-[90vw] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(145deg, #1a1a24, #12121a)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <svg className="w-6 h-6 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">知识库助手</h2>
              <p className="text-xs text-gray-400 dark:text-white/30 mt-0.5">Knowledge Base Assistant</p>
            </div>
          </div>

          {/* Version */}
          <div className="flex items-center gap-2 mb-5">
            <span className="px-2 py-0.5 text-[11px] rounded-full bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 font-medium">
              v2.3.0
            </span>
            <span className="text-xs text-gray-400 dark:text-white/25">by G.Y</span>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-white/50 leading-relaxed mb-4">
            一个基于 AI 的个人知识库管理系统，结合本地存储与智能分析，提升知识管理效率。
          </p>

          {/* Features */}
          <div className="mb-4">
            <h3 className="text-xs font-medium text-gray-500 dark:text-white/35 mb-2 uppercase tracking-wider">功能特性</h3>
            <div className="grid grid-cols-1 gap-1">
              {features.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-white/45">
                  <span className="w-1 h-1 rounded-full bg-primary-400 dark:bg-primary-500/60 flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* Tech stack */}
          <p className="text-xs text-gray-400 dark:text-white/25">
            Electron + React + TypeScript + Tailwind CSS
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100 dark:bg-white/[0.06]" />

        {/* Actions */}
        <div className="px-6 py-3 flex items-center justify-between">
          <button
            onClick={handleOpenDoc}
            className="text-sm text-gray-500 dark:text-white/40 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
          >
            查看文档
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/[0.1] transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
