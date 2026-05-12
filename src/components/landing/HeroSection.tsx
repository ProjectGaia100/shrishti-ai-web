import { useRef, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Points, PointMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { motion } from 'motion/react'
import { gsap, useGSAP } from '@/lib/gsap'

// Particle field
function ParticleField() {
  const ref = useRef<THREE.Points>(null!)
  const count = 3000

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 10
      arr[i * 3 + 1] = (Math.random() - 0.5) * 10
      arr[i * 3 + 2] = (Math.random() - 0.5) * 10
    }
    return arr
  }, [])

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.getElapsedTime() * 0.04
      ref.current.rotation.x = clock.getElapsedTime() * 0.02
    }
  })

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#4fc3f7"
        size={0.015}
        sizeAttenuation
        depthWrite={false}
        opacity={0.6}
      />
    </Points>
  )
}

// Animated orbit ring
function OrbitRing({ radius, speed, color }: { radius: number; speed: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null!)
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.z = clock.getElapsedTime() * speed
      ref.current.rotation.x = Math.PI / 3
    }
  })
  return (
    <mesh ref={ref}>
      <torusGeometry args={[radius, 0.003, 16, 200]} />
      <meshBasicMaterial color={color} transparent opacity={0.25} />
    </mesh>
  )
}

interface HeroSectionProps {
  isAuthenticated?: boolean
  onSignIn: () => void
  onDashboard?: () => void
}

const WORDS = ['SHRISHTI', 'AI']

export function HeroSection({ isAuthenticated, onSignIn, onDashboard }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const tl = gsap.timeline({ delay: 0.8 })

    // Stagger each word
    tl.from('.hero-word', {
      y: 120,
      opacity: 0,
      rotateX: -80,
      stagger: 0.12,
      duration: 1.2,
      ease: 'power4.out',
    })
    .from(subtitleRef.current, {
      y: 40,
      opacity: 0,
      duration: 0.9,
      ease: 'power3.out',
    }, '-=0.6')
    .from(ctaRef.current, {
      y: 30,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
    }, '-=0.5')
    .from(statsRef.current?.children ? Array.from(statsRef.current.children) : [], {
      y: 20,
      opacity: 0,
      stagger: 0.1,
      duration: 0.6,
      ease: 'power2.out',
    }, '-=0.4')

    // Parallax on scroll
    gsap.to('.hero-content', {
      yPercent: 30,
      opacity: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top top',
        end: '60% top',
        scrub: true,
      },
    })
  }, { scope: sectionRef })

  const stats = [
    { value: '5+', label: 'Data Layers' },
    { value: '3', label: 'AI Models' },
    { value: '60-day', label: 'Forecasts' },
    { value: '99.9%', label: 'Uptime' },
  ]

  return (
    <section ref={sectionRef} className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden">
      {/* Three.js canvas */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 4], fov: 60 }} gl={{ antialias: true, alpha: true }}>
          <Suspense fallback={null}>
            <ParticleField />
            <OrbitRing radius={1.8} speed={0.3} color="#4fc3f7" />
            <OrbitRing radius={2.4} speed={-0.2} color="#7c3aed" />
            <OrbitRing radius={3.0} speed={0.15} color="#06b6d4" />
          </Suspense>
        </Canvas>
      </div>

      {/* Radial gradient overlay */}
      <div className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,transparent_30%,#050510_100%)]" />

      {/* Content */}
      <div className="hero-content relative z-[2] max-w-6xl mx-auto px-6 text-center">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-[10px] uppercase tracking-[0.2em] text-cyan-400 font-medium mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Satellite Intelligence Platform
        </motion.div>

        {/* Main title */}
        <h1 ref={titleRef} className="overflow-hidden mb-6" style={{ perspective: '1000px' }}>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {WORDS.map((word, i) => (
              <span
                key={word}
                className={`hero-word inline-block font-black leading-none tracking-tight ${
                  i === 0
                    ? 'text-[clamp(4rem,12vw,10rem)] text-white'
                    : 'text-[clamp(4rem,12vw,10rem)] bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-500 bg-clip-text text-transparent'
                }`}
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {word}
              </span>
            ))}
          </div>
        </h1>

        {/* Subtitle */}
        <p ref={subtitleRef} className="text-white/50 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
          Harness satellite imagery, deep learning, and real-time climate data to predict
          natural disasters and generate actionable geospatial intelligence.
        </p>

        {/* CTA */}
        <div ref={ctaRef} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
          {/* Primary magnetic button */}
          <MagneticButton onClick={isAuthenticated ? onDashboard! : onSignIn} primary>
            {isAuthenticated ? 'Open Dashboard' : 'Explore Platform'}
          </MagneticButton>
          <button
            onClick={() => document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors duration-300"
          >
            See how it works
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Stats */}
        <div ref={statsRef} className="flex flex-wrap items-center justify-center gap-8 sm:gap-16">
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums">{s.value}</div>
              <div className="text-xs text-white/40 mt-1 uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[2] flex flex-col items-center gap-2">
        <div className="w-px h-16 bg-gradient-to-b from-transparent via-white/30 to-transparent animate-pulse" />
      </div>
    </section>
  )
}

function MagneticButton({ children, onClick, primary }: { children: React.ReactNode; onClick: () => void; primary?: boolean }) {
  const ref = useRef<HTMLButtonElement>(null)

  const onMove = (e: React.MouseEvent) => {
    const { left, top, width, height } = ref.current!.getBoundingClientRect()
    const x = (e.clientX - left - width / 2) * 0.25
    const y = (e.clientY - top - height / 2) * 0.25
    gsap.to(ref.current, { x, y, duration: 0.4, ease: 'power2.out' })
  }
  const onLeave = () => gsap.to(ref.current, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' })

  return (
    <button
      ref={ref}
      onClick={onClick}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`group relative flex items-center gap-3 px-7 py-3.5 rounded-full font-semibold text-sm transition-all duration-300 active:scale-[0.97] ${
        primary
          ? 'bg-white text-black hover:bg-white/90 shadow-[0_0_40px_rgba(255,255,255,0.15)]'
          : 'border border-white/20 text-white hover:bg-white/5'
      }`}
    >
      {children}
      <span className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${primary ? 'bg-black/10' : 'bg-white/10'}`}>
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </span>
    </button>
  )
}
