import { useRef, useEffect } from 'react'

export function PlatformPreview() {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15 }
    )
    ref.current?.querySelectorAll('.reveal-up').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={ref} className="relative py-12 px-6 overflow-hidden">
      <div className="reveal-up max-w-6xl mx-auto">
        {/* macOS window frame */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)]">
          {/* Title bar */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
            <span className="ml-3 text-[11px] text-white/30" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              shrishti-ai · dashboard
            </span>
          </div>
          {/* Screenshot */}
          <img
            src="/platform.png"
            alt="Shrishti AI Dashboard"
            className="w-full block"
          />
        </div>
      </div>
    </section>
  )
}
