import { useRef, useEffect, useState } from 'react'

export function ApiSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [typed, setTyped] = useState('')
  const [typingDone, setTypingDone] = useState(false)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view')
            setInView(true)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15 }
    )
    sectionRef.current?.querySelectorAll('.reveal-up, .reveal-left, .reveal-right').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!inView) return
    const json = `{
  "prediction": {
    "risk_level": "HIGH",
    "probability": 0.87,
    "disaster_type": "landslide",
    "confidence": 0.94,
    "forecast_window": "48h"
  },
  "location": {
    "lat": 15.4,
    "lon": 73.8,
    "region": "Western Ghats, Goa"
  },
  "model": "hazardguard-v3.2",
  "timestamp": "2025-07-12T08:30:00Z"
}`
    let i = 0
    const timer = setInterval(() => {
      if (i < json.length) {
        setTyped(json.slice(0, i + 1))
        i++
      } else {
        clearInterval(timer)
        setTypingDone(true)
      }
    }, 12)
    return () => clearInterval(timer)
  }, [inView])

  return (
    <section id="api" ref={sectionRef} className="relative py-24 px-6 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-transparent to-white/10" />

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">
        {/* Left: copy + buttons */}
        <div className="reveal-left space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] uppercase tracking-[0.2em] text-white/50 font-medium">
            Open Platform
          </div>

          <h2 className="text-5xl sm:text-6xl font-black text-white leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Our Models.
            <br />
            Your Data.
            <br />
            Your API.
          </h2>

          <p className="text-white/50 text-base leading-relaxed max-w-lg">
            Integrate geospatial intelligence into your existing workflows. RESTful API with
            predictable endpoints, comprehensive documentation, and SDKs for Python and JavaScript.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <a
              href="#"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/90 transition-colors"
            >
              View Documentation
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/15 text-white/60 font-semibold text-sm hover:bg-white/5 hover:text-white transition-colors"
            >
              API Reference
            </a>
          </div>
        </div>

        {/* Right: terminal */}
        <div className="reveal-right">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.4)]">
            {/* Traffic-light header */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06]">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840]" />
              <span className="ml-3 text-[11px] text-white/30" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                shrishti-api · zsh
              </span>
            </div>

            {/* Terminal body */}
            <div className="p-6 text-sm leading-relaxed" style={{ fontFamily: "'JetBrains Mono', monospace", height: 340 }}>
              <div className="text-white/30 mb-1">
                $ <span className="text-emerald-400">curl</span> <span className="text-cyan-400">-H</span> <span className="text-amber-400">"X-API-Key: sk_live_..."</span> \
              </div>
              <div className="pl-4 text-white/30">
                https://api.shrishti.ai/v1/models/<span className="text-emerald-400">hazardguard</span>/predict \
              </div>
              <div className="pl-4 text-white/30">
                <span className="text-cyan-400">-d</span> <span className="text-amber-400">'&#123;"lat": 15.4, "lon": 73.8&#125;'</span>
              </div>

              <pre className="mt-5 text-[13px] text-white/50 whitespace-pre-wrap break-words overflow-y-auto" style={{ maxHeight: 220 }}>
                {typed}
                {!typingDone && <span className="text-emerald-400 animate-pulse">▋</span>}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
