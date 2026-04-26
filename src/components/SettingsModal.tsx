import { useState, useEffect } from 'react'
import { useAppStore } from '../stores/appStore'
import { initAnthropic } from '../services/aiService'

interface SettingsModalProps {
  onClose: () => void
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { config, setConfig, refreshNotes } = useAppStore()

  const [apiKey, setApiKey] = useState(config.apiKey)
  const [syncDir, setSyncDir] = useState(config.syncDir)
  const [notesDir, setNotesDir] = useState(config.notesDir)
  const [theme, setTheme] = useState<'light' | 'dark'>(config.theme)
  const [obsidianVaultPath, setObsidianVaultPath] = useState(config.obsidianVaultPath)
  const [obsidianAutoSync, setObsidianAutoSync] = useState(config.obsidianAutoSync)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [obsidianValidating, setObsidianValidating] = useState(false)
  const [obsidianValid, setObsidianValid] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [excludeFolders, setExcludeFolders] = useState<string[]>(
    config.obsidianExcludeFolders || ['.obsidian', 'node_modules', '.git']
  )
  const [newExcludeFolder, setNewExcludeFolder] = useState('')

  // 测试 API Key
  const handleTestApiKey = async () => {
    if (!apiKey.trim()) {
      alert('请输入 API Key')
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      initAnthropic(apiKey)

      // 简单测试调用
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'hi' }]
        })
      })

      if (response.ok) {
        setTestResult('success')
      } else {
        const data = await response.json()
        setTestResult('error')
        alert(`API Key 测试失败: ${data.error?.message || '未知错误'}`)
      }
    } catch (error: any) {
      setTestResult('error')
      alert(`API Key 测试失败: ${error.message}`)
    }

    setTesting(false)
  }

  // 选择同步目录
  const handleSelectSyncDir = async () => {
    const dir = await window.electronAPI.selectDirectory()
    if (dir) {
      setSyncDir(dir)
    }
  }

  // 选择笔记目录
  const handleSelectNotesDir = async () => {
    const dir = await window.electronAPI.selectDirectory()
    if (dir) {
      setNotesDir(dir)
    }
  }

  // 选择 Obsidian vault 目录
  const handleSelectObsidianVault = async () => {
    const dir = await window.electronAPI.selectDirectory()
    if (dir) {
      setObsidianVaultPath(dir)
      // 立即验证
      setObsidianValidating(true)
      const result = await window.electronAPI.validateObsidianVault(dir)
      setObsidianValid(result.valid)
      setObsidianValidating(false)
    }
  }

  // 保存设置
  const handleSave = async () => {
    setSaving(true)
    try {
      const newConfig = {
        apiKey: apiKey.trim(),
        syncDir,
        notesDir,
        theme,
        obsidianVaultPath,
        obsidianAutoSync,
        obsidianExcludeFolders: excludeFolders
      }

      await window.electronAPI.saveConfig(newConfig)
      setConfig(newConfig)

      // 初始化 AI
      if (apiKey.trim()) {
        initAnthropic(apiKey.trim())
      }

      // 刷新笔记
      await refreshNotes()

      // 启动文件监控
      if (syncDir) {
        await window.electronAPI.startWatch()
      }

      onClose()
    } catch (error: any) {
      alert(`保存设置失败: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  // 添加排除文件夹
  const handleAddExcludeFolder = () => {
    const folder = newExcludeFolder.trim()
    if (folder && !excludeFolders.includes(folder)) {
      setExcludeFolders([...excludeFolders, folder])
      setNewExcludeFolder('')
    }
  }

  // 移除排除文件夹
  const handleRemoveExcludeFolder = (folder: string) => {
    setExcludeFolders(excludeFolders.filter(f => f !== folder))
  }

  // ESC 键关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose, saving])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">设置</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Claude API 配置 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Claude API Key
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value)
                  setTestResult(null)
                }}
                placeholder="sk-ant-..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:outline-none"
              />
              <button
                onClick={handleTestApiKey}
                disabled={testing}
                className={`px-4 py-2 text-sm rounded-lg ${
                  testResult === 'success'
                    ? 'bg-green-100 text-green-700'
                    : testResult === 'error'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                {testing ? '测试中...' : testResult === 'success' ? '通过' : testResult === 'error' ? '失败' : '测试'}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              申请地址: <button
                onClick={() => window.electronAPI.openExternal('https://console.anthropic.com/')}
                className="text-primary-600 hover:underline"
              >
                Anthropic Console
              </button>
            </p>
          </div>

          {/* 笔记目录 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              笔记存储目录
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={notesDir}
                onChange={(e) => setNotesDir(e.target.value)}
                placeholder="选择目录..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:outline-none bg-gray-50 dark:bg-gray-700"
                readOnly
              />
              <button
                onClick={handleSelectNotesDir}
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200"
              >
                更改
              </button>
            </div>
          </div>

          {/* 同步目录 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              云同步目录（可选）
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={syncDir}
                onChange={(e) => setSyncDir(e.target.value)}
                placeholder="iCloud/Google Drive 文件夹..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:outline-none bg-gray-50 dark:bg-gray-700"
                readOnly
              />
              <button
                onClick={handleSelectSyncDir}
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200"
              >
                选择
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              设置为 iCloud Drive 或 Google Drive 文件夹路径，实现多设备同步
            </p>
          </div>

          {/* Obsidian 同步 */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Obsidian 同步
            </h3>

            {/* Obsidian Vault 路径 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Obsidian Vault 路径
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={obsidianVaultPath}
                  onChange={(e) => {
                    setObsidianVaultPath(e.target.value)
                    setObsidianValid(null)
                  }}
                  placeholder="选择你的 Obsidian vault 文件夹..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:outline-none bg-gray-50 dark:bg-gray-700"
                  readOnly
                />
                <button
                  onClick={handleSelectObsidianVault}
                  className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200"
                >
                  选择
                </button>
              </div>
              {obsidianValidating && (
                <p className="mt-1 text-xs text-gray-500">验证中...</p>
              )}
              {obsidianValid === true && (
                <p className="mt-1 text-xs text-green-600">✓ 有效的 Obsidian vault</p>
              )}
              {obsidianValid === false && (
                <p className="mt-1 text-xs text-red-600">✗ 不是有效的 Obsidian vault</p>
              )}
            </div>

            {/* 自动同步 */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  自动同步
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  启动时自动同步 Obsidian 笔记
                </p>
              </div>
              <button
                onClick={() => setObsidianAutoSync(!obsidianAutoSync)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  obsidianAutoSync ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    obsidianAutoSync ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 主题 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              外观
            </label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:outline-none"
            >
              <option value="light">浅色</option>
              <option value="dark">深色</option>
            </select>
          </div>

          {/* 排除文件夹 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              排除文件夹
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              这些文件夹中的笔记不会被导入
            </p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newExcludeFolder}
                onChange={(e) => setNewExcludeFolder(e.target.value)}
                placeholder="输入文件夹名称..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleAddExcludeFolder()}
              />
              <button
                onClick={handleAddExcludeFolder}
                disabled={!newExcludeFolder.trim()}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                添加
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {excludeFolders.map(folder => (
                <span
                  key={folder}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                >
                  {folder}
                  <button
                    onClick={() => handleRemoveExcludeFolder(folder)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 底部 */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 dark:bg-gray-700 rounded-lg disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                保存中...
              </>
            ) : (
              '保存'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}