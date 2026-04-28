import type { Note } from '../types'

// ============================================================
// BM25 知识检索（轻量级，无需外部依赖）
// ============================================================

interface SearchResult {
  note: Note
  score: number
  snippet: string
}

// 中文分词：按字符 bigram 切分 + 英文按空格分词
function tokenize(text: string): string[] {
  const tokens: string[] = []
  const lower = text.toLowerCase()

  // 英文单词
  const englishWords = lower.match(/[a-z0-9]+/g) || []
  tokens.push(...englishWords)

  // 中文 bigram
  const chineseChars = lower.replace(/[a-z0-9\s]/g, '')
  for (let i = 0; i < chineseChars.length - 1; i++) {
    tokens.push(chineseChars.slice(i, i + 2))
  }

  return tokens
}

// BM25 参数
const K1 = 1.5
const B = 0.75

// BM25 索引
interface BM25Index {
  docCount: number
  avgDocLen: number
  docFreqs: Map<string, number>  // token -> 包含该 token 的文档数
  docLens: number[]              // 每篇文档的长度
  docTokens: string[][]          // 每篇文档的 token 列表
  docs: Note[]                   // 对应的笔记
}

function buildIndex(notes: Note[]): BM25Index {
  const docTokens: string[][] = []
  const docLens: number[] = []
  const docFreqs = new Map<string, number>()
  const df = new Map<string, number>() // 每个文档中 token 出现次数

  for (const note of notes) {
    const text = `${note.title} ${note.category} ${(note.tags || []).join(' ')} ${note.preview || ''}`
    const tokens = tokenize(text)
    docTokens.push(tokens)
    docLens.push(tokens.length)

    // 统计文档频率（去重后每个 token 只算一次）
    const uniqueTokens = new Set(tokens)
    for (const t of uniqueTokens) {
      docFreqs.set(t, (docFreqs.get(t) || 0) + 1)
    }
  }

  const totalLen = docLens.reduce((a, b) => a + b, 0)

  return {
    docCount: notes.length,
    avgDocLen: notes.length > 0 ? totalLen / notes.length : 0,
    docFreqs,
    docLens,
    docTokens,
    docs: notes,
  }
}

function bm25Score(query: string, index: BM25Index): SearchResult[] {
  const queryTokens = tokenize(query)
  const scores: { idx: number; score: number }[] = []

  for (let i = 0; i < index.docCount; i++) {
    let score = 0
    const docLen = index.docLens[i]
    const tokens = index.docTokens[i]

    // 计算 token 频率
    const tf = new Map<string, number>()
    for (const t of tokens) {
      tf.set(t, (tf.get(t) || 0) + 1)
    }

    for (const qt of queryTokens) {
      const freq = tf.get(qt) || 0
      if (freq === 0) continue

      const df = index.docFreqs.get(qt) || 0
      const idf = Math.log((index.docCount - df + 0.5) / (df + 0.5) + 1)
      const tfNorm = (freq * (K1 + 1)) / (freq + K1 * (1 - B + B * (docLen / index.avgDocLen)))

      score += idf * tfNorm
    }

    if (score > 0) {
      scores.push({ idx: i, score })
    }
  }

  // 按分数降序
  scores.sort((a, b) => b.score - a.score)

  return scores.map(({ idx, score }) => {
    const note = index.docs[idx]
    const preview = note.preview || ''
    const snippet = preview.length > 150 ? preview.slice(0, 150) + '...' : preview
    return { note, score, snippet }
  })
}

// ============================================================
// 对外接口
// ============================================================

let cachedIndex: BM25Index | null = null
let cachedNotesKey = ''

export function searchNotes(
  query: string,
  notes: Note[],
  topK: number = 5
): SearchResult[] {
  // 缓存：笔记列表不变时复用索引
  const key = notes.map(n => n.id).join(',')
  if (key !== cachedNotesKey) {
    cachedIndex = buildIndex(notes)
    cachedNotesKey = key
  }

  if (!cachedIndex || cachedIndex.docCount === 0) return []

  const results = bm25Score(query, cachedIndex)
  return results.slice(0, topK)
}

// 生成 RAG 上下文（供 AI 拼接）
export function buildRAGContext(query: string, notes: Note[], topK: number = 3): string {
  const results = searchNotes(query, notes, topK)
  if (results.length === 0) return ''

  return results
    .map((r, i) => `---笔记${i + 1}: ${r.note.title}---\n${r.snippet}`)
    .join('\n\n')
}

export type { SearchResult }
