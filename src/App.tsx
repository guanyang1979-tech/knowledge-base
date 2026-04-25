import { useEffect, useState } from 'react'
import { useAppStore } from './stores/appStore'
import { initAnthropic } from './services/aiService'
import Sidebar from './components/Sidebar'
import NoteList from './components/NoteList'
import NoteEditor from './components/NoteEditor'
import SettingsModal from './components/SettingsModal'
import AIChatPanel from './components/AIChatPanel'
import ImportPanel from './components/ImportPanel'
import StatisticsPanel from './components/StatisticsPanel'
import TrashPanel from './components/TrashPanel'
import ExportPanel from './components/ExportPanel'
import SplashScreen from './components/SplashScreen'
import WelcomeDashboard from './components/WelcomeDashboard'

function App() {
  const {
    config,
    setConfig,
    refreshNotes,
    setTemplates,
    setCurrentNote,
    currentNote,
    sidebarOpen,
    setSidebarOpen,
    settingsOpen,
    setSettingsOpen,
    importOpen,
    setImportOpen,
    statisticsOpen,
    setStatisticsOpen,
    trashOpen,
    setTrashOpen,
    exportOpen,
    setExportOpen,
  } = useAppStore()

  const [showSplash, setShowSplash] = useState(true)

  // 初始化
  useEffect(() => {
    async function init() {
      const savedConfig = await window.electronAPI.getConfig()
      setConfig(savedConfig)
      if (savedConfig.apiKey) {
        initAnthropic(savedConfig.apiKey)
      }
      await refreshNotes()
      const templates = await window.electronAPI.getTemplates()
      setTemplates(templates)
    }
    init()
    window.electronAPI.onFileAdded(() => refreshNotes())
    window.electronAPI.onFileChanged(() => refreshNotes())
    window.electronAPI.onFileRemoved(() => refreshNotes())
  }, [])

  // 配置变更时重新初始化 AI
  useEffect(() => {
    if (config.apiKey) {
      initAnthropic(config.apiKey)
    }
  }, [config.apiKey])

  // 主题切换
  useEffect(() => {
    if (config.theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [config.theme])

  // 启动封面结束后进入主界面
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />
  }

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f]">
      {/* 顶部导航栏 */}
      <header className="h-12 bg-[#0d0d14]/80 backdrop-blur-md border-b border-white/[0.06] flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-white/[0.06] rounded-md transition-colors"
            title={sidebarOpen ? '收起侧边栏' : '展开侧边栏'}
          >
            <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-white/[0.1] to-white/[0.05] border border-white/[0.08] flex items-center justify-center">
              <svg className="w-3 h-3 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h1 className="text-xs font-medium text-white/50 tracking-wider">知识库助手</h1>
          </div>
        </div>

        {/* 搜索框 */}
        <div className="flex-1 max-w-md mx-4">
          <div className="relative">
            <input
              type="text"
              placeholder="搜索笔记..."
              value={useAppStore.getState().searchQuery}
              onChange={(e) => useAppStore.getState().setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 pl-9 text-xs bg-white/[0.04] border border-white/[0.06] rounded-md text-white/60 placeholder-white/20 focus:bg-white/[0.06] focus:border-white/[0.12] focus:outline-none transition-colors"
            />
            <svg className="w-3.5 h-3.5 text-white/20 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* 右侧工具栏 */}
        <div className="flex items-center gap-0.5">
          <button onClick={() => setImportOpen(true)} className="p-1.5 hover:bg-white/[0.06] rounded-md transition-colors" title="导入文档">
            <svg className="w-3.5 h-3.5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </button>
          <button onClick={() => setExportOpen(true)} className="p-1.5 hover:bg-white/[0.06] rounded-md transition-colors" title="导出笔记">
            <svg className="w-3.5 h-3.5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          <button onClick={() => setStatisticsOpen(true)} className="p-1.5 hover:bg-white/[0.06] rounded-md transition-colors" title="统计分析">
            <svg className="w-3.5 h-3.5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </button>
          <div className="w-px h-4 bg-white/[0.06] mx-1.5" />
          <button onClick={() => setTrashOpen(true)} className="p-1.5 hover:bg-white/[0.06] rounded-md transition-colors" title="回收站">
            <svg className="w-3.5 h-3.5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button onClick={() => setSettingsOpen(true)} className="p-1.5 hover:bg-white/[0.06] rounded-md transition-colors" title="设置">
            <svg className="w-3.5 h-3.5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 侧边栏 */}
        {sidebarOpen && (
          <aside className="w-56 bg-[#0d0d14] border-r border-white/[0.06] flex flex-col flex-shrink-0">
            <Sidebar />
          </aside>
        )}

        {/* 笔记列表 */}
        <aside className="w-64 bg-[#0d0d14] border-r border-white/[0.06] flex flex-col flex-shrink-0">
          <NoteList />
        </aside>

        {/* 笔记编辑区 / 欢迎面板 */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {currentNote ? (
            <NoteEditor />
          ) : (
            <WelcomeDashboard onSelectNote={(notePath) => {
              window.electronAPI.readNote(notePath).then(result => {
                if (result.success) {
                  setCurrentNote({
                    ...useAppStore.getState().notes.find(n => n.path === notePath)!,
                    content: result.content,
                  })
                }
              })
            }} />
          )}
        </main>

        {/* AI 对话面板 */}
        <aside className="w-72 bg-[#0d0d14] border-l border-white/[0.06] flex flex-col flex-shrink-0">
          <AIChatPanel />
        </aside>
      </div>

      {/* 弹窗 */}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {importOpen && <ImportPanel onClose={() => setImportOpen(false)} />}
      {statisticsOpen && <StatisticsPanel onClose={() => setStatisticsOpen(false)} />}
      {trashOpen && <TrashPanel onClose={() => setTrashOpen(false)} onRestore={() => refreshNotes()} />}
      {exportOpen && <ExportPanel onClose={() => setExportOpen(false)} />}
    </div>
  )
}

export default App
