import { useState, useCallback, useEffect, useRef } from 'react'

interface ResizablePanelProps {
  width: number
  onWidthChange: (w: number) => void
  minWidth?: number
  maxWidth?: number
  direction?: 'left' | 'right'
}

export default function ResizablePanel({
  width,
  onWidthChange,
  minWidth = 160,
  maxWidth = 500,
  direction = 'right',
}: ResizablePanelProps) {
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    startX.current = e.clientX
    startWidth.current = width
    setDragging(true)
  }, [width])

  useEffect(() => {
    if (!dragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX.current
      const newWidth = direction === 'right'
        ? startWidth.current + delta
        : startWidth.current - delta
      const clamped = Math.min(maxWidth, Math.max(minWidth, newWidth))
      onWidthChange(clamped)
    }

    const handleMouseUp = () => {
      setDragging(false)
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, direction, minWidth, maxWidth, onWidthChange])

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`w-1 flex-shrink-0 cursor-col-resize group relative z-10 ${
        dragging
          ? 'bg-primary-400/50'
          : 'bg-gray-200 dark:bg-white/[0.06] hover:bg-primary-400/30'
      } transition-colors`}
    >
      {/* 拖拽时扩展 hit area */}
      {dragging && (
        <div className="absolute inset-0 -left-2 -right-2" />
      )}
    </div>
  )
}
