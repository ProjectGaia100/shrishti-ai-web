import { useRef, useEffect } from 'react'

const features = [
  {
    id: 'hazard',
    title: 'HazardGuard',
    subtitle: 'Disaster Prediction Engine',
    description: 'Deep learning models analyze satellite imagery, seismic data, and climate patterns to predict natural disasters before they strike.',
    tag: 'Risk AI',
    color: 'from-red-500/20 to-orange-500/10',
    accent: '#ef4444',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
    span: 'md:col-span-2 md:row-span-2',
  },
  {
    id: 'weather',
    title: 'WeatherWise',
    subtitle: 'LSTM Forecasting',
    description: 'Advanced LSTM neural networks deliver hyperlocal 60-day weather predictions across 36 variables.',
    tag: 'Weather AI',
    color: 'from-blue-500/20 to-cyan-500/10',
    accent: '#3b82f6',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
      </svg>
    ),
    span: 'md:col-span-2',
  },
  {
    id: 'geo',
    title: 'GeoVision',
    subtitle: 'Multi-Model Fusion',
    description: 'Cross-stacked ensemble fusing LSTM, Tree Models and CNN for disaster classification.',
    tag: 'Fusion AI',
    color: 'from-emerald-500/20 to-teal-500/10',
    accent: '#10b981',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
    span: '',
  },
  {
    id: 'layers',
    title: 'Earth Layers',
    subtitle: 'Dynamic Observation',
    description: 'Toggle NDVI, temperature, land cover, terrain, and nighttime lights with seamless layer blending.',
    tag: 'Satellite',
    color: 'from-violet-500/20 to-purple-500/10',
    accent: '#8b5cf6',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L12 12.75 6.429 9.75m11.142 0l4.179 2.25L12 17.25 2.25 12l4.179-2.25m11.142 0l4.179 2.25L12 22.5l-9.75-5.25 4.179-2.25" />
      </svg>
    ),
    span: '',
  },
]

export function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

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
      { threshold: 0.1 }
    )

    if (headerRef.current) observer.observe(headerRef.current)
    gridRef.current?.querySelectorAll('.feat-card').forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  return (
    <section id="features" ref={sectionRef} className="relative pt-16 pb-12 px-6 overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-12 reveal-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] uppercase tracking-[0.2em] text-white/50 font-medium mb-6">
            Platform Capabilities
          </div>
          <h2 className="text-5xl sm:text-6xl font-black text-white leading-tight mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Research-Grade
            <br />
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Intelligence</span>
          </h2>
          <p className="text-white/40 text-lg max-w-xl mx-auto">
            Four specialized AI engines working in concert to deliver actionable Earth intelligence.
          </p>
        </div>

        {/* Bento grid */}
        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-4 gap-4 md:grid-rows-[auto_auto]">
          {features.map((f, i) => (
            <div
              key={f.id}
              className={`feat-card reveal-up group relative rounded-[1.5rem] overflow-hidden border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-500 cursor-default ${f.span}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="absolute inset-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] rounded-[1.5rem]" />

              <div className="relative z-10 h-full flex flex-col p-6 gap-3">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-widest font-medium mb-4"
                    style={{ background: `${f.accent}20`, color: f.accent }}>
                    <span className="w-1 h-1 rounded-full" style={{ background: f.accent }} />
                    {f.tag}
                  </span>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `${f.accent}15`, color: f.accent }}>
                    {f.icon}
                  </div>
                  <h3 className={`font-bold text-white mb-1 ${f.id === 'hazard' ? 'text-2xl' : 'text-lg'}`}>{f.title}</h3>
                  <p className="text-xs text-white/40 mb-3">{f.subtitle}</p>
                  <p className={`text-white/50 leading-relaxed ${f.id === 'hazard' ? 'text-sm' : 'text-xs'}`}>{f.description}</p>
                  {f.id === 'hazard' && (
                    <div className="mt-6 grid grid-cols-2 gap-3">
                      {['Flood Risk', 'Earthquake', 'Wildfire', 'Cyclone'].map((risk) => (
                        <div key={risk} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/15">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                          <span className="text-xs text-white/60">{risk}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
