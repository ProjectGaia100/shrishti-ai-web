import { useRef, useEffect } from 'react'

export function AboutSection() {
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
    sectionRef.current?.querySelectorAll('.reveal-left, .reveal-right').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <section id="about" ref={sectionRef} className="relative pt-16 pb-10 px-6 overflow-hidden">
      <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-violet-600/8 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        <div className="reveal-left space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] uppercase tracking-[0.2em] text-white/50 font-medium">
            About the Project
          </div>
          <h2 className="text-5xl sm:text-6xl font-black text-white leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Built for
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Research</span>
          </h2>
          <p className="text-white/50 text-lg leading-relaxed">
            Shrishti AI is a research-grade geospatial intelligence platform at the intersection of
            artificial intelligence, remote sensing, and climate science.
          </p>
          <p className="text-white/30 text-sm leading-relaxed">
            Designed to make earth observation practical — transforming raw satellite and weather
            streams into operational intelligence for climate and disaster use cases.
          </p>
        </div>

        <div className="reveal-right space-y-4">
          {[
            {
              icon: (
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ),
              title: 'Our Vision',
              text: 'Democratize geospatial intelligence by making satellite data analysis and AI-powered prediction accessible through intuitive visualization tools.',
              color: '#4fc3f7',
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              ),
              title: 'Research Innovation',
              text: 'A novel approach combining multi-source satellite data with deep learning architectures for predictive environmental analysis.',
              color: '#a78bfa',
            },
          ].map((card) => (
            <div key={card.title} className="p-1.5 rounded-[1.5rem] border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-500">
              <div className="rounded-[calc(1.5rem-6px)] p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${card.color}15`, color: card.color }}>
                    {card.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-2">{card.title}</h3>
                    <p className="text-sm text-white/40 leading-relaxed">{card.text}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
