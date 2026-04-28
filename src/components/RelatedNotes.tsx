import { useMemo } from 'react'
import { useAppStore } from '../stores/appStore'
import { parseLinks, parseTags, extractPlainText } from '../utils/obsidianParser'

interface RelatedNotesProps {
  onSelectNote: (path: string) => void
}

export default function RelatedNotes({ onSelectNote }: RelatedNotesProps) {
  const { notes, currentNote } = useAppStore()

  const relatedNotes = useMemo(() => {
    if (!currentNote || !currentNote.content) return []

    const results: { note: typeof notes[0]; score: number; reason: string }[] = []
    const currentContent = currentNote.content

    // 1. 基于双向链接的关联
    const links = parseLinks(currentContent)
    const linkTargets = new Set(links.map(l => l.target.toLowerCase()))

    for (const note of notes) {
      if (note.path === currentNote.path) continue

      const noteTitle = note.title.toLowerCase()

      // 链接目标匹配
      if (linkTargets.has(noteTitle) || linkTargets.has(note.path)) {
        results.push({ note, score: 100, reason: '双向链接' })
        continue
      }

      // 链接文本包含笔记标题
      if (linkTargets.size > 0) {
        for (const target of linkTargets) {
          if (noteTitle.includes(target) || target.includes(noteTitle)) {
            results.push({ note, score: 80, reason: '链接提及' })
            break
          }
        }
      }
    }

    // 2. 基于标签的关联
    const currentTags = parseTags(currentContent)
    const tagSet = new Set(currentTags.map(t => t.toLowerCase()))

    for (const note of notes) {
      if (note.path === currentNote.path) continue
      if (results.some(r => r.note.path === note.path)) continue

      const noteTags = new Set(note.tags.map(t => t.toLowerCase()))
      const commonTags = [...tagSet].filter(t => noteTags.has(t))

      if (commonTags.length > 0) {
        results.push({
          note,
          score: 40 + commonTags.length * 10,
          reason: `共同标签: ${commonTags.slice(0, 3).join(', ')}`
        })
      }
    }

    // 3. 基于内容相似度的关联（简单关键词匹配）
    const currentPlain = extractPlainText(currentContent).toLowerCase()
    const currentWords = new Set(
      currentPlain.split(/\s+/).filter(w => w.length > 2)
    )

    for (const note of notes) {
      if (note.path === currentNote.path) continue
      if (results.some(r => r.note.path === note.path)) continue

      const notePlain = (note.preview || '').toLowerCase()
      const noteWords = new Set(notePlain.split(/\s+/).filter(w => w.length > 2))

      let commonWords = 0
      for (const word of currentWords) {
        if (noteWords.has(word)) commonWords++
      }

      if (commonWords >= 3) {
        results.push({
          note,
          score: 20 + commonWords * 2,
          reason: '内容相关'
        })
      }
    }

    // 按分数排序，取前 10 个
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
  }, [currentNote, notes])

  if (!currentNote || relatedNotes.length === 0) return null

  return (
    <div className="border-t border-gray-200 dark:border-white/[0.06] p-3">
      <h3 className="text-[11px] text-gray-400 dark:text-white/25 uppercase tracking-wider mb-2">
        相关笔记 ({relatedNotes.length})
      </h3>
      <div className="space-y-1">
        {relatedNotes.map(({ note, reason }) => (
          <button
            key={note.path}
            onClick={() => onSelectNote(note.path)}
            className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors group"
          >
            <div className="text-xs text-gray-700 dark:text-white/60 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400">
              {note.title}
            </div>
            <div className="text-[10px] text-gray-400 dark:text-white/20 mt-0.5">
              {reason}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
