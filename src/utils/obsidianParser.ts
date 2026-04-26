/**
 * Obsidian Markdown 语法解析器
 * 支持：双向链接、标签、Callout、Frontmatter、嵌入
 */

// 解析结果接口
export interface ObsidianParseResult {
  content: string
  links: ObsidianLink[]
  tags: string[]
  callouts: ObsidianCallout[]
  frontmatter: Record<string, string>
  embeds: ObsidianEmbed[]
}

export interface ObsidianLink {
  raw: string       // 原始语法 [[显示文本|别名]]
  target: string    // 链接目标笔记名
  alias: string     // 显示文本
  type: 'note' | 'heading' | 'block'
}

export interface ObsidianCallout {
  type: string      // note, warning, tip, etc.
  title?: string
  content: string
}

export interface ObsidianEmbed {
  raw: string
  target: string
  type: 'note' | 'image' | 'video' | 'audio'
}

/**
 * 解析 Frontmatter（YAML 块）
 */
export function parseFrontmatter(content: string): { frontmatter: Record<string, string>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) return { frontmatter: {}, body: content }

  const lines = match[1].split('\n')
  const fm: Record<string, string> = {}
  for (const line of lines) {
    const idx = line.indexOf(':')
    if (idx > 0) {
      fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
    }
  }
  return { frontmatter: fm, body: match[2] }
}

/**
 * 解析双向链接 [[目标]] 或 [[目标|别名]]
 */
export function parseLinks(content: string): ObsidianLink[] {
  const links: ObsidianLink[] = []
  // 匹配 [[...]] 但排除 ![[ 嵌入语法
  const regex = /(?<!!)\[\[([^\]]+)\]\]/g
  let match
  while ((match = regex.exec(content)) !== null) {
    const raw = match[0]
    const inner = match[1]
    let target = inner
    let alias = inner

    // 处理别名语法 [[目标|别名]]
    const pipeIdx = inner.indexOf('|')
    if (pipeIdx !== -1) {
      target = inner.slice(0, pipeIdx).trim()
      alias = inner.slice(pipeIdx + 1).trim()
    }

    // 判断链接类型
    let type: ObsidianLink['type'] = 'note'
    if (target.includes('#^')) {
      type = 'block'
      target = target.replace('#^', '#')
    } else if (target.includes('#')) {
      type = 'heading'
    }

    links.push({ raw, target, alias, type })
  }
  return links
}

/**
 * 解析标签 #tag 或 #tag/subtag
 */
export function parseTags(content: string): string[] {
  const tags = new Set<string>()
  // 匹配 #tag 但排除 # 标题语法（行首的 # 后跟空格）
  const regex = /(?:^|\s)#([a-zA-Z一-龥][a-zA-Z0-9一-龥_/]*)/gm
  let match
  while ((match = regex.exec(content)) !== null) {
    tags.add(match[1])
  }
  return Array.from(tags)
}

/**
 * 解析 Callout 语法
 * > [!note] 标题
 * > 内容
 */
export function parseCallouts(content: string): ObsidianCallout[] {
  const callouts: ObsidianCallout[] = []
  const regex = /^>\s*\[!([\w]+)\]\s*(.*)$/gm
  let match

  while ((match = regex.exec(content)) !== null) {
    const type = match[1].toLowerCase()
    const title = match[2].trim() || undefined

    // 收集 callout 内容（连续的 > 开头的行）
    const startIdx = match.index
    const lines = content.slice(startIdx).split('\n')
    const contentLines: string[] = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (line.startsWith('>')) {
        contentLines.push(line.replace(/^>\s?/, ''))
      } else {
        break
      }
    }

    callouts.push({
      type,
      title,
      content: contentLines.join('\n').trim()
    })
  }
  return callouts
}

/**
 * 解析嵌入语法 ![[目标]]
 */
export function parseEmbeds(content: string): ObsidianEmbed[] {
  const embeds: ObsidianEmbed[] = []
  const regex = /!\[\[([^\]]+)\]\]/g
  let match

  while ((match = regex.exec(content)) !== null) {
    const target = match[1]
    let type: ObsidianEmbed['type'] = 'note'

    if (/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(target)) {
      type = 'image'
    } else if (/\.(mp4|webm|mov)$/i.test(target)) {
      type = 'video'
    } else if (/\.(mp3|wav|ogg)$/i.test(target)) {
      type = 'audio'
    }

    embeds.push({ raw: match[0], target, type })
  }
  return embeds
}

/**
 * 将 Obsidian 语法转换为标准 Markdown（用于预览渲染）
 */
export function obsidianToMarkdown(content: string): string {
  let result = content

  // 转换双向链接为普通文本链接
  result = result.replace(/(?<!!)\[\[([^\]|]+)\|([^\]]+)\]\]/g, '[$2]($1)')
  result = result.replace(/(?<!!)\[\[([^\]]+)\]\]/g, '[$1]($1)')

  // 转换嵌入为引用
  result = result.replace(/!\[\[([^\]]+)\]\]/g, '> 嵌入: $1')

  // 转换 Callout 为引用块
  result = result.replace(/^>\s*\[!([\w]+)\]\s*(.*)$/gm, '> **[$1]** $2')

  return result
}

/**
 * 完整解析 Obsidian Markdown
 */
export function parseObsidianMarkdown(content: string): ObsidianParseResult {
  const { frontmatter, body } = parseFrontmatter(content)

  return {
    content: body,
    links: parseLinks(content),
    tags: parseTags(content),
    callouts: parseCallouts(content),
    frontmatter,
    embeds: parseEmbeds(content)
  }
}

/**
 * 从笔记内容中提取纯文本（去除所有 Markdown 语法）
 * 用于 AI 分析和搜索
 */
export function extractPlainText(content: string): string {
  let text = content

  // 移除 Frontmatter
  text = text.replace(/^---[\s\S]*?---\n?/, '')

  // 移除 Markdown 标题
  text = text.replace(/^#{1,6}\s+/gm, '')

  // 移除加粗、斜体
  text = text.replace(/\*\*(.+?)\*\*/g, '$1')
  text = text.replace(/\*(.+?)\*/g, '$1')

  // 移除链接，保留文本
  text = text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
  text = text.replace(/\[\[([^\]]+)\]\]/g, '$1')
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

  // 移除图片
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '')

  // 移除代码块
  text = text.replace(/```[\s\S]*?```/g, '')

  // 移除行内代码
  text = text.replace(/`([^`]+)`/g, '$1')

  // 移除引用标记
  text = text.replace(/^>\s+/gm, '')

  // 移除水平线
  text = text.replace(/^[-*_]{3,}$/gm, '')

  // 移除多余空行
  text = text.replace(/\n{3,}/g, '\n\n')

  return text.trim()
}
