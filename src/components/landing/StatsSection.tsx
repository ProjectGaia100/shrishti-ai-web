import { useRef, useState, useEffect } from 'react'
import { gsap } from '@/lib/gsap'

const stats = [
  { value: 5, suffix: '+', label: 'Satellite Data Layers', desc: 'NDVI, Temperature, Land Cover, Terrain, Nighttime Lights' },
  { value: 3, suffix: '', label: 'AI Model Families', desc: 'HazardGuard · WeatherWise · GeoVision Fusion' },
  { value: 60, suffix: '-day', label: 'Weather Forecasts', desc: 'Across 36 meteorological variables' },
  { value: 99.9, suffix: '%', label: 'Platform Uptime', desc: 'Production-grade reliability' },
]

function Counter({ target, suffix, active }: { target: number; suffix: string; active: boolean }) {
  const [val, setVal] = useState(0)

  useEffect(() => {
    if (!active) return
    const obj = { n: 0 }
    gsap.to(obj, {
      n: target,
      duration: 2,
      ease: 'power2.out',
      onUpdate: () => setVal(Math.round(obj.n * 10) / 10),
    })
  }, [active, target])

  return <span className="tabular-nums">{target % 1 !== 0 ? val.toFixed(1) : val}{suffix}</span>
}

export function StatsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view')
            setActive(true)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.2 }
    )
    sectionRef.current?.querySelectorAll('.stat-card').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="relative pt-8 pb-12 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div key={i} className="stat-card reveal-up p-1.5 rounded-[1.5rem] border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-500"
              style={{ transitionDelay: `${i * 80}ms` }}>
              <div className="rounded-[calc(1.5rem-6px)] p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] h-full">
                <div className="text-4xl font-black text-white mb-2">
                  <Counter target={s.value} suffix={s.suffix} active={active} />
                </div>
                <div className="text-sm font-semibold text-white/70 mb-2">{s.label}</div>
                <div className="text-xs text-white/30 leading-relaxed">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
