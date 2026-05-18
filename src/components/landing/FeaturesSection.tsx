import { useRef, useEffect, useState } from 'react'

export function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null)

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
      { threshold: 0.08 }
    )
    sectionRef.current?.querySelectorAll('.reveal').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const [risks, setRisks] = useState([
    { label: 'Flood',     pct: 78, color: '#3b82f6' },
    { label: 'Drought',   pct: 43, color: '#f59e0b' },
    { label: 'Storm',     pct: 61, color: '#6366f1' },
    { label: 'Landslide', pct: 29, color: '#10b981' },
    { label: 'Normal',    pct: 55, color: '#94a3b8' },
  ])

  useEffect(() => {
    const timers = risks.map((_, i) =>
      setInterval(() => {
        setRisks(prev => prev.map((r, j) =>
          j === i ? { ...r, pct: Math.floor(Math.random() * 101) } : r
        ))
      }, 4000 + i * 1200)
    )
    return () => timers.forEach(clearInterval)
  }, [])

  const small = [
    {
      tag: 'Weather AI', title: 'WeatherWise', sub: 'LSTM Forecasting',
      desc: 'Hyperlocal 60-day predictions across 36 atmospheric variables using context-aware LSTM pipelines.',
      accent: '#3b82f6',
      detail: '60-day · 36 variables',
    },
    {
      tag: 'Fusion AI', title: 'GeoVision', sub: 'Multi-Model Fusion',
      desc: 'Cross-stacked ensemble fusing LSTM, gradient-boosted trees, and CNN for disaster classification.',
      accent: '#10b981',
      detail: 'LSTM + Trees + CNN',
    },
    {
      tag: 'Satellite', title: 'Earth Layers', sub: 'Dynamic Observation',
      desc: 'Toggle NDVI, temperature, land cover, terrain, and nighttime lights with seamless blending.',
      accent: '#8b5cf6',
      detail: '5+ live datasets',
    },
  ]

  return (
    <section id="features" ref={sectionRef} className="relative pt-20 pb-16 px-6 overflow-hidden">
      {/* Ambient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-blue-600/4 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-14 reveal" style={{ opacity: 0, transform: 'translateY(24px)', transition: 'opacity 0.7s ease, transform 0.7s ease' }}>
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/25 mb-4">Platform Capabilities</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-[1.05] max-w-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Research-grade<br />
            <span style={{ color: 'oklch(68% 0.2 240)' }}>intelligence</span>
          </h2>
        </div>

        {/* Asymmetric grid: HazardGuard left (tall), 3 cards right (stacked) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-3">

          {/* HazardGuard — tall left column */}
          <div
            className="reveal group relative rounded-[1.75rem] overflow-hidden border border-white/[0.07] bg-white/[0.025]"
            style={{ opacity: 0, transform: 'translateY(32px)', transition: 'opacity 0.8s ease, transform 0.8s ease', minHeight: '420px' }}
          >
            {/* Subtle red ambient */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="absolute inset-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] rounded-[1.75rem]" />

            <div className="relative z-10 h-full flex flex-col p-7">
              {/* Top row */}
              <div className="flex items-start justify-between mb-8">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.25em] text-red-400/60 mb-3">Risk AI</p>
                  <h3 className="text-3xl font-black text-white tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>HazardGuard</h3>
                  <p className="text-xs text-white/30 mt-1.5 font-medium">Disaster Prediction Engine</p>
                </div>
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
              </div>

              {/* Risk bars */}
              <div className="flex-1 space-y-4">
                {risks.map(({ label, pct, color }, i) => (
                  <div key={label} className="reveal" style={{ opacity: 0, transform: 'translateX(-12px)', transition: `opacity 0.6s ease ${i * 80 + 200}ms, transform 0.6s ease ${i * 80 + 200}ms` }}>
                    <div className="flex justify-between items-baseline mb-1.5">
                      <span className="text-[11px] uppercase tracking-widest text-white/40 font-medium">{label}</span>
                      <span className="text-sm font-black tabular-nums" style={{ color, transition: 'color 0.3s' }}>{pct}%</span>
                    </div>
                    <div className="h-[3px] rounded-full bg-white/[0.06]">
                      <div className="h-[3px] rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}99, ${color})`, transition: 'width 2.5s cubic-bezier(0.4,0,0.2,1)' }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <p className="text-[11px] text-white/25 mt-8 leading-relaxed border-t border-white/[0.06] pt-5">
                Deep learning models analyze satellite imagery, seismic data, and climate patterns to predict natural disasters before they strike.
              </p>
            </div>
          </div>

          {/* Right column — 3 stacked cards */}
          <div className="flex flex-col gap-3">
            {small.map((f, i) => (
              <div
                key={f.title}
                className="reveal group relative rounded-[1.75rem] overflow-hidden border border-white/[0.07] bg-white/[0.025] flex-1"
                style={{ opacity: 0, transform: 'translateY(24px)', transition: `opacity 0.7s ease ${i * 100 + 100}ms, transform 0.7s ease ${i * 100 + 100}ms` }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                  style={{ background: `radial-gradient(ellipse at 80% 50%, ${f.accent}10, transparent 70%)` }} />
                <div className="absolute inset-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] rounded-[1.75rem]" />

                <div className="relative z-10 p-6 flex items-start gap-5 h-full">
                  {/* Left: text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] uppercase tracking-[0.25em] mb-2" style={{ color: `${f.accent}99` }}>{f.tag}</p>
                    <h3 className="text-lg font-black text-white tracking-tight mb-0.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{f.title}</h3>
                    <p className="text-[10px] text-white/30 mb-3 font-medium">{f.sub}</p>
                    <p className="text-[11px] text-white/40 leading-relaxed">{f.desc}</p>
                  </div>
                  {/* Right: detail pill */}
                  <div className="shrink-0 mt-1">
                    <span className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-full whitespace-nowrap"
                      style={{ background: `${f.accent}12`, color: `${f.accent}cc`, border: `1px solid ${f.accent}20` }}>
                      {f.detail}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .reveal.in-view { opacity: 1 !important; transform: none !important; }
      `}</style>
    </section>
  )
}
