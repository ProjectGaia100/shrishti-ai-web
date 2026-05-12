import { useRef, useEffect } from 'react'
import { gsap } from '@/lib/gsap'

interface CTASectionProps {
  isAuthenticated?: boolean
  onSignIn: () => void
  onDashboard?: () => void
}

export function CTASection({ isAuthenticated, onSignIn, onDashboard }: CTASectionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

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
      { threshold: 0.2 }
    )
    sectionRef.current?.querySelectorAll('.reveal-up').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const onMove = (e: React.MouseEvent) => {
    const { left, top, width, height } = btnRef.current!.getBoundingClientRect()
    const x = (e.clientX - left - width / 2) * 0.3
    const y = (e.clientY - top - height / 2) * 0.3
    gsap.to(btnRef.current, { x, y, duration: 0.4, ease: 'power2.out' })
  }
  const onLeave = () => gsap.to(btnRef.current, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' })

  return (
    <section ref={sectionRef} className="relative pt-12 pb-24 px-6 overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[300px] bg-gradient-to-r from-blue-600/15 via-violet-600/15 to-cyan-600/15 rounded-full blur-[80px]" />
      </div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-transparent to-white/10" />

      <div className="reveal-up max-w-3xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] uppercase tracking-[0.2em] text-white/50 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Ready to Launch
        </div>

        <h2 className="text-5xl sm:text-7xl font-black text-white leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Explore Earth
          <br />
          <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-500 bg-clip-text text-transparent">
            Intelligence
          </span>
        </h2>

        <p className="text-white/40 text-lg max-w-xl mx-auto">
          Access satellite data, disaster predictions, and weather forecasts — all in one platform.
        </p>

        <div className="flex justify-center pt-4">
          <button
            ref={btnRef}
            onClick={isAuthenticated ? onDashboard : onSignIn}
            onMouseMove={onMove}
            onMouseLeave={onLeave}
            className="group relative flex items-center gap-4 px-10 py-5 rounded-full bg-white text-black font-bold text-lg shadow-[0_0_60px_rgba(255,255,255,0.2)] hover:shadow-[0_0_80px_rgba(255,255,255,0.3)] transition-shadow duration-500 active:scale-[0.97]"
          >
            {isAuthenticated ? 'Open Dashboard' : 'Get Started Free'}
            <span className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-transform duration-300">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </section>
  )
}
