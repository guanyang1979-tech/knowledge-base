import { useState, useEffect } from 'react'
import { useAppStore } from '../stores/appStore'
import { initAIConfig, testConnection } from '../services/aiService'
import type { Config } from '../types'

interface SettingsModalProps {
  onClose: () => void
}

// 预设模型配置
const PRESETS: { name: string; provider: Config['provider']; baseUrl: string; model: string }[] = [
  { name: 'Anthropic (Claude)', provider: 'anthropic', baseUrl: 'https://api.anthropic.com', model: 'claude-sonnet-4-20250514' },
  { name: '小米 MiMo', provider: 'openai', baseUrl: 'https://api.xiaomi.com/v1', model: 'MiMo-v2.5' },
  { name: 'DeepSeek', provider: 'openai', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
  { name: '通义千问 (Qwen)', provider: 'openai', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  { name: '硅基流动', provider: 'openai', baseUrl: 'https://api.siliconflow.cn/v1', model: 'deepseek-ai/DeepSeek-V3' },
  { name: 'Moonshot (Kimi)', provider: 'openai', baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  { name: '智谱 AI (GLM)', provider: 'openai', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  { name: '自定义', provider: 'openai', baseUrl: '', model: '' },
]

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { config, setConfig, refreshNotes } = useAppStore()

  // AI 模型配置
  const [provider, setProvider] = useState<Config['provider']>(config.provider || 'openai')
  const [apiKey, setApiKey] = useState(config.apiKey)
  const [baseUrl, setBaseUrl] = useState(config.baseUrl || '')
  const [model, setModel] = useState(config.model || '')
  const [temperature, setTemperature] = useState(config.temperature ?? 0.7)
  const [maxTokens, setMaxTokens] = useState(config.maxTokens ?? 4096)
  const [presetName, setPresetName] = useState('')

  // 其他配置
  const [syncDir, setSyncDir] = useState(config.syncDir)
  const [notesDir, setNotesDir] = useState(config.notesDir)
  const [theme, setTheme] = useState<'light' | 'dark'>(config.theme)
  const [obsidianVaultPath, setObsidianVaultPath] = useState(config.obsidianVaultPath)
  const [obsidianAutoSync, setObsidianAutoSync] = useState(config.obsidianAutoSync)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [testError, setTestError] = useState('')
  const [obsidianValidating, setObsidianValidating] = useState(false)
  const [obsidianValid, setObsidianValid] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [excludeFolders, setExcludeFolders] = useState<string[]>(
    config.obsidianExcludeFolders || ['.obsidian', 'node_modules', '.git']
  )
  const [newExcludeFolder, setNewExcludeFolder] = useState('')

  // 选择预设
  const handlePresetChange = (name: string) => {
    setPresetName(name)
    const preset = PRESETS.find(p => p.name === name)
    if (preset) {
      setProvider(preset.provider)
      setBaseUrl(preset.baseUrl)
      setModel(preset.model)
    }
  }

  // 测试连接
  const handleTest = async () => {
    if (!apiKey.trim()) {
      alert('请输入 API Key')
      return
    }
    setTesting(true)
    setTestResult(null)
    setTestError('')

    const testConfig: Config = {
      ...config,
      provider,
      apiKey: apiKey.trim(),
      baseUrl,
      model,
      temperature,
      maxTokens,
    }

    const result = await testConnection(testConfig)
    setTestResult(result.success ? 'success' : 'error')
    if (!result.success) setTestError(result.error || '')
    setTesting(false)
  }

  // 目录选择
  const handleSelectNotesDir = async () => {
    const dir = await window.electronAPI.selectDirectory()
    if (dir) setNotesDir(dir)
  }
  const handleSelectSyncDir = async () => {
    const dir = await window.electronAPI.selectDirectory()
    if (dir) setSyncDir(dir)
  }
  const handleSelectObsidianVault = async () => {
    const dir = await window.electronAPI.selectDirectory()
    if (dir) {
      setObsidianVaultPath(dir)
      setObsidianValidating(true)
      const result = await window.electronAPI.validateObsidianVault(dir)
      setObsidianValid(result.valid)
      setObsidianValidating(false)
    }
  }

  // 保存
  const handleSave = async () => {
    setSaving(true)
    try {
      const newConfig: Partial<Config> = {
        provider,
        apiKey: apiKey.trim(),
        baseUrl,
        model,
        temperature,
        maxTokens,
        syncDir,
        notesDir,
        theme,
        obsidianVaultPath,
        obsidianAutoSync,
        obsidianExcludeFolders: excludeFolders,
      }

      await window.electronAPI.saveConfig(newConfig)
      setConfig({ ...config, ...newConfig } as Config)
      initAIConfig({ ...config, ...newConfig } as Config)
      await refreshNotes()
      if (syncDir) await window.electronAPI.startWatch()
      onClose()
    } catch (error: any) {
      alert(`保存设置失败: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleAddExcludeFolder = () => {
    const folder = newExcludeFolder.trim()
    if (folder && !excludeFolders.includes(folder)) {
      setExcludeFolders([...excludeFolders, folder])
      setNewExcludeFolder('')
    }
  }

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose, saving])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">设置</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">

          {/* ============ AI 模型配置 ============ */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              AI 模型配置
            </h3>

            {/* 服务商预设 */}
            <div className="mb-3">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">服务商</label>
              <select
                value={presetName}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:outline-none bg-white dark:bg-gray-700"
              >
                <option value="">-- 选择预设或自定义 --</option>
                {PRESETS.map(p => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* API 地址 */}
            <div className="mb-3">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                API 地址 {provider === 'anthropic' ? '(Anthropic 协议)' : '(OpenAI 兼容协议)'}
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={provider === 'anthropic' ? 'https://api.anthropic.com' : 'https://api.deepseek.com'}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:outline-none bg-white dark:bg-gray-700"
              />
            </div>

            {/* API Key */}
            <div className="mb-3">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">API Key</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setTestResult(null) }}
                  placeholder="输入 API Key..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:outline-none"
                />
                <button
                  onClick={handleTest}
                  disabled={testing}
                  className={`px-3 py-2 text-sm rounded-lg whitespace-nowrap ${
                    testResult === 'success' ? 'bg-green-100 text-green-700'
                    : testResult === 'error' ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {testing ? '测试中...' : testResult === 'success' ? '通过' : testResult === 'error' ? '失败' : '测试'}
                </button>
              </div>
              {testResult === 'error' && testError && (
                <p className="mt-1 text-xs text-red-500">{testError}</p>
              )}
            </div>

            {/* 模型名称 */}
            <div className="mb-3">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">模型名称</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="例如: deepseek-chat"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:outline-none bg-white dark:bg-gray-700"
              />
            </div>

            {/* 温度 & 最大 Token */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  温度: {temperature.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">最大 Token</label>
                <input
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value) || 4096)}
                  min={256}
                  max={128000}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:outline-none bg-white dark:bg-gray-700"
                />
              </div>
            </div>
          </div>

          {/* ============ 笔记目录 ============ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">笔记存储目录</label>
            <div className="flex gap-2">
              <input type="text" value={notesDir} onChange={(e) => setNotesDir(e.target.value)}
                placeholder="选择目录..." readOnly
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:outline-none bg-gray-50 dark:bg-gray-700" />
              <button onClick={handleSelectNotesDir}
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200">更改</button>
            </div>
          </div>

          {/* 同步目录 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">云同步目录（可选）</label>
            <div className="flex gap-2">
              <input type="text" value={syncDir} onChange={(e) => setSyncDir(e.target.value)}
                placeholder="iCloud/Google Drive 文件夹..." readOnly
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:outline-none bg-gray-50 dark:bg-gray-700" />
              <button onClick={handleSelectSyncDir}
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200">选择</button>
            </div>
          </div>

          {/* ============ Obsidian 同步 ============ */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Obsidian 同步</h3>
            <div className="mb-3">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Vault 路径</label>
              <div className="flex gap-2">
                <input type="text" value={obsidianVaultPath}
                  onChange={(e) => { setObsidianVaultPath(e.target.value); setObsidianValid(null) }}
                  placeholder="选择 Obsidian vault 文件夹..." readOnly
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:outline-none bg-gray-50 dark:bg-gray-700" />
                <button onClick={handleSelectObsidianVault}
                  className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200">选择</button>
              </div>
              {obsidianValidating && <p className="mt-1 text-xs text-gray-500">验证中...</p>}
              {obsidianValid === true && <p className="mt-1 text-xs text-green-600">有效的 Obsidian vault</p>}
              {obsidianValid === false && <p className="mt-1 text-xs text-red-600">不是有效的 Obsidian vault</p>}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">自动同步</label>
                <p className="text-xs text-gray-500 dark:text-gray-400">启动时自动同步 Obsidian 笔记</p>
              </div>
              <button onClick={() => setObsidianAutoSync(!obsidianAutoSync)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${obsidianAutoSync ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${obsidianAutoSync ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          {/* 主题 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">外观</label>
            <select value={theme} onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:outline-none">
              <option value="light">浅色</option>
              <option value="dark">深色</option>
            </select>
          </div>

          {/* 排除文件夹 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">排除文件夹</label>
            <div className="flex gap-2 mb-2">
              <input type="text" value={newExcludeFolder} onChange={(e) => setNewExcludeFolder(e.target.value)}
                placeholder="输入文件夹名称..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleAddExcludeFolder()} />
              <button onClick={handleAddExcludeFolder} disabled={!newExcludeFolder.trim()}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50">添加</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {excludeFolders.map(folder => (
                <span key={folder} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                  {folder}
                  <button onClick={() => setExcludeFolders(excludeFolders.filter(f => f !== folder))} className="text-gray-400 hover:text-red-500">
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
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 dark:bg-gray-700 rounded-lg disabled:opacity-50">取消</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2">
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                保存中...
              </>
            ) : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
