import { useMemo } from 'react'
import { useAppStore } from '../stores/appStore'

interface StatisticsPanelProps {
  onClose: () => void
}

export default function StatisticsPanel({ onClose }: StatisticsPanelProps) {
  const { notes } = useAppStore()

  // 统计分析数据
  const stats = useMemo(() => {
    // 按分类统计
    const categoryStats = notes.reduce((acc, note) => {
      const cat = note.category || '未分类'
      acc[cat] = (acc[cat] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // 按标签统计
    const tagStats = notes.reduce((acc, note) => {
      note.tags?.forEach(tag => {
        acc[tag] = (acc[tag] || 0) + 1
      })
      return acc
    }, {} as Record<string, number>)

    // 按来源统计（通过 frontmatter 或路径判断）
    const sourceStats = {
      obsidian: 0,
      imported: 0,
      manual: 0
    }

    notes.forEach(note => {
      if (note.path.includes('Obsidian同步') || note.path.includes('obsidian')) {
        sourceStats.obsidian++
      } else if (note.path.includes('文档库') || note.content.includes('source_file:')) {
        sourceStats.imported++
      } else {
        sourceStats.manual++
      }
    })

    // 获取 Top 标签
    const topTags = Object.entries(tagStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    // 获取 Top 分类
    const topCategories = Object.entries(categoryStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    // 时间统计
    const now = new Date()
    const thisWeek = notes.filter(n => {
      const date = new Date(n.updatedAt)
      const diff = now.getTime() - date.getTime()
      return diff < 7 * 24 * 60 * 60 * 1000
    }).length

    const thisMonth = notes.filter(n => {
      const date = new Date(n.updatedAt)
      const diff = now.getTime() - date.getTime()
      return diff < 30 * 24 * 60 * 60 * 1000
    }).length

    return {
      total: notes.length,
      categoryStats,
      tagStats,
      sourceStats,
      topTags,
      topCategories,
      thisWeek,
      thisMonth
    }
  }, [notes])

  // 最大分类数（用于进度条计算）
  const maxCategoryCount = Math.max(...Object.values(stats.categoryStats), 1)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">知识库统计</h2>
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
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* 总体统计 */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-primary-50 dark:bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">{stats.total}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">总笔记数</div>
            </div>
            <div className="bg-green-50 dark:bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.thisWeek}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">本周更新</div>
            </div>
            <div className="bg-blue-50 dark:bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.thisMonth}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">本月更新</div>
            </div>
            <div className="bg-purple-50 dark:bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{Object.keys(stats.tagStats).length}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">标签总数</div>
            </div>
          </div>

          {/* 来源分布 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">知识来源</h3>
            <div className="flex gap-2">
              <div className="flex-1 bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Obsidian</span>
                </div>
                <div className="text-lg font-semibold text-gray-800 dark:text-gray-200">{stats.sourceStats.obsidian}</div>
              </div>
              <div className="flex-1 bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">导入文档</span>
                </div>
                <div className="text-lg font-semibold text-gray-800 dark:text-gray-200">{stats.sourceStats.imported}</div>
              </div>
              <div className="flex-1 bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">手动创建</span>
                </div>
                <div className="text-lg font-semibold text-gray-800 dark:text-gray-200">{stats.sourceStats.manual}</div>
              </div>
            </div>
          </div>

          {/* 分类分布 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">分类分布</h3>
            <div className="space-y-2">
              {stats.topCategories.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">暂无数据</p>
              ) : (
                stats.topCategories.map(([name, count]) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400 w-24 truncate">{name}</span>
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full"
                        style={{ width: `${(count / maxCategoryCount) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400 w-8 text-right">{count}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 热门标签 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">热门标签</h3>
            {stats.topTags.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">暂无数据</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {stats.topTags.map(([tag, count]) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-full"
                  >
                    {tag} ({count})
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}