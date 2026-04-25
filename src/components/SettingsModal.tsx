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
  const [theme, setTheme] = useState(config.theme)
  const [obsidianVaultPath, setObsidianVaultPath] = useState(config.obsidianVaultPath)
  const [obsidianAutoSync, setObsidianAutoSync] = useState(config.obsidianAutoSync)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [obsidianValidating, setObsidianValidating] = useState(false)
  const [obsidianValid, setObsidianValid] = useState<boolean | null>(null)

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
    const newConfig = {
      apiKey: apiKey.trim(),
      syncDir,
      notesDir,
      theme: theme as 'light' | 'dark',
      obsidianVaultPath,
      obsidianAutoSync,
      obsidianExcludeFolders: ['.obsidian', 'node_modules', '.git']
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
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">设置</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 dark:text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-400 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-6">
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
              onChange={(e) => setTheme(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:outline-none"
            >
              <option value="light">浅色</option>
              <option value="dark">深色</option>
            </select>
          </div>
        </div>

        {/* 底部 */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 dark:bg-gray-700 rounded-lg"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}