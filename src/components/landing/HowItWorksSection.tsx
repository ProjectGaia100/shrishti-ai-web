import { useRef, useEffect } from 'react'

const steps = [
  {
    num: '01',
    title: 'Data Ingestion',
    desc: 'Multi-source satellite imagery from Sentinel, Landsat, and MODIS combined with real-time weather data streams through Google Earth Engine.',
    tags: ['Sentinel-2', 'Landsat 8/9', 'MODIS', 'Weather APIs'],
    color: '#4fc3f7',
  },
  {
    num: '02',
    title: 'AI Processing',
    desc: 'Advanced neural networks including LSTMs, CNNs, and ensemble models process multi-dimensional geospatial data for pattern recognition.',
    tags: ['LSTM Networks', 'CNN', 'Random Forest', 'Transfer Learning'],
    color: '#a78bfa',
  },
  {
    num: '03',
    title: 'Predictive Insights',
    desc: 'Actionable intelligence delivered through interactive maps, real-time dashboards, predictive alerts, and comprehensive analytics.',
    tags: ['Interactive Maps', 'Risk Heatmaps', 'Trend Analytics', 'Alerts'],
    color: '#34d399',
  },
]

export function HowItWorksSection() {
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
      { threshold: 0.15 }
    )
    sectionRef.current?.querySelectorAll('.reveal-up, .reveal-left, .reveal-right').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <section id="how-it-works" ref={sectionRef} className="relative py-16 px-6 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-transparent to-white/10" />

      <div className="max-w-5xl mx-auto">
        <div className="reveal-up text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] uppercase tracking-[0.2em] text-white/50 font-medium mb-6">
            Pipeline Architecture
          </div>
          <h2 className="text-5xl sm:text-6xl font-black text-white leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            How It{' '}
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Works</span>
          </h2>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line — desktop only */}
          <div className="absolute left-1/2 -translate-x-1/2 top-7 bottom-7 w-px bg-gradient-to-b from-cyan-500/30 via-violet-500/30 to-emerald-500/30 hidden md:block" />

          <div className="flex flex-col gap-8">
            {steps.map((step, i) => {
              const isLeft = i % 2 === 0
              return (
                <div
                  key={step.num}
                  className={`${isLeft ? 'reveal-left' : 'reveal-right'} relative grid grid-cols-1 md:grid-cols-[1fr_56px_1fr] items-center gap-4 md:gap-0`}
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  {/* Left slot */}
                  <div className={isLeft ? 'md:pr-8' : 'md:order-3 md:pl-8'}>
                    <div className="p-px rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-500">
                      <div className="rounded-[calc(1rem-1px)] p-6">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-xs font-mono font-bold tracking-widest" style={{ color: step.color }}>{step.num}</span>
                          <h3 className="text-xl font-bold text-white">{step.title}</h3>
                        </div>
                        <p className="text-white/50 text-sm leading-relaxed mb-4">{step.desc}</p>
                        <div className="flex flex-wrap gap-2">
                          {step.tags.map(tag => (
                            <span key={tag} className="px-2.5 py-1 rounded-full text-[11px] border border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/20 transition-colors duration-200">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Center node */}
                  <div className={`relative z-10 flex items-center justify-center shrink-0 ${isLeft ? 'md:order-2' : 'md:order-2'}`}>
                    <div className="w-14 h-14 rounded-full border-2 flex items-center justify-center font-black text-lg"
                      style={{ borderColor: step.color, color: step.color, background: `${step.color}12` }}>
                      {i + 1}
                    </div>
                    <div className="absolute inset-0 rounded-full animate-ping opacity-[0.08]" style={{ background: step.color }} />
                  </div>

                  {/* Right slot — empty on desktop for alternating side */}
                  <div className={`hidden md:block ${isLeft ? 'md:order-3' : 'md:order-1'}`} />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
