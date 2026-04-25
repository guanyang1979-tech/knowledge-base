import { useEffect, useState } from 'react'

interface SplashScreenProps {
  onComplete: () => void
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [opacity, setOpacity] = useState(1)
  const [scale, setScale] = useState(1)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + Math.random() * 25 + 10
      })
    }, 200)

    // 3秒后开始淡出
    const timer = setTimeout(() => {
      setOpacity(0)
      setScale(1.02)
      const exitTimer = setTimeout(onComplete, 800)
      return () => clearTimeout(exitTimer)
    }, 3000)

    return () => {
      clearInterval(interval)
      clearTimeout(timer)
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center transition-all ease-in-out"
      style={{ opacity, transform: `scale(${scale})`, transitionDuration: '800ms' }}
    >
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(145deg, #0a0a0f 0%, #0d0d14 40%, #08080d 100%)',
        }}
      />

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
      }} />

      {/* Corner brackets */}
      <div className="absolute top-10 left-10 w-10 h-10 border-t border-l border-white/10" />
      <div className="absolute top-10 right-10 w-10 h-10 border-t border-r border-white/10" />
      <div className="absolute bottom-10 left-10 w-10 h-10 border-b border-l border-white/10" />
      <div className="absolute bottom-10 right-10 w-10 h-10 border-b border-r border-white/10" />

      {/* Scan line */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="w-full h-[1px]" style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
          animation: 'scanLine 3s linear infinite',
        }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center">
        {/* Logo */}
        <div className="relative inline-block mb-8">
          {/* Outer ring */}
          <div
            className="absolute -inset-3 rounded-full"
            style={{
              border: '1px solid rgba(255,255,255,0.06)',
              animation: 'ringPulse 4s ease-in-out infinite',
            }}
          />
          <div
            className="absolute -inset-6 rounded-full"
            style={{
              border: '1px solid rgba(255,255,255,0.03)',
              animation: 'ringPulse 4s ease-in-out 1s infinite',
            }}
          />

          {/* Logo container */}
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center relative"
            style={{
              background: 'linear-gradient(145deg, #1a1a24 0%, #12121a 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 0 40px rgba(255,255,255,0.03)',
            }}
          >
            <svg className="w-14 h-14 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1
          className="text-[42px] font-extralight tracking-[0.15em] mb-3"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.4) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          知识库助手
        </h1>

        {/* Subtitle */}
        <p className="text-white/15 text-xs tracking-[0.35em] uppercase font-light">
          Knowledge Base Assistant
        </p>

        {/* Tech tags */}
        <div className="mt-5 flex items-center justify-center gap-3">
          {['Electron', 'React', 'AI-Powered'].map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 text-[10px] rounded border border-white/[0.06] text-white/20 bg-white/[0.02] tracking-wider uppercase"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Version & Author */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <span className="text-white/15 text-xs tracking-wider">v2.0</span>
          <span className="text-white/[0.06]">|</span>
          <span className="text-white/15 text-xs tracking-wider">by 12792</span>
        </div>

        {/* Progress bar */}
        <div className="mt-10 w-48 mx-auto">
          <div className="h-[1px] bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${Math.min(progress, 100)}%`,
                background: 'linear-gradient(90deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
              }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ringPulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.05); opacity: 0.1; }
        }
        @keyframes scanLine {
          0% { top: -1%; }
          100% { top: 101%; }
        }
      `}</style>
    </div>
  )
}
