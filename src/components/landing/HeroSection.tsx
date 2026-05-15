import { useRef, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Points, PointMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { motion } from 'motion/react'
import { gsap, useGSAP } from '@/lib/gsap'
import { EarthScene } from './EarthGlobe'

// Star field — 3 layers + milky way glow
function StarField() {
  const tinyRef   = useRef<THREE.Points>(null!)
  const smallRef  = useRef<THREE.Points>(null!)
  const brightRef = useRef<THREE.Points>(null!)

  const { tiny, small, bright } = useMemo(() => {
    const onSphere = (count: number, r: number) => {
      const arr = new Float32Array(count * 3)
      for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2
        const phi   = Math.acos(2 * Math.random() - 1)
        arr[i*3]   = r * Math.sin(phi) * Math.cos(theta)
        arr[i*3+1] = r * Math.sin(phi) * Math.sin(theta)
        arr[i*3+2] = r * Math.cos(phi)
      }
      return arr
    }
    return {
      tiny:   onSphere(12000, 22),
      small:  onSphere(4000,  20),
      bright: onSphere(600,   18),
    }
  }, [])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.005
    if (tinyRef.current)   tinyRef.current.rotation.y   = t
    if (smallRef.current)  smallRef.current.rotation.y  = t
    if (brightRef.current) brightRef.current.rotation.y = t
  })

  return (
    <>
      <Points ref={tinyRef}   positions={tiny}   stride={3} frustumCulled={false}>
        <PointMaterial transparent color="#aabcff" size={0.025} sizeAttenuation depthWrite={false} opacity={0.7} />
      </Points>
      <Points ref={smallRef}  positions={small}  stride={3} frustumCulled={false}>
        <PointMaterial transparent color="#d0e0ff" size={0.045} sizeAttenuation depthWrite={false} opacity={0.85} />
      </Points>
      <Points ref={brightRef} positions={bright} stride={3} frustumCulled={false}>
        <PointMaterial transparent color="#ffffff" size={0.08} sizeAttenuation depthWrite={false} opacity={1.0} />
      </Points>
    </>
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
    { value: '36', label: 'Weather Variables' },
  ]

  return (
    <section ref={sectionRef} className="relative min-h-[100dvh] flex items-center overflow-hidden">
      {/* True space background */}
      <div className="absolute inset-0 z-0 bg-[#020408]">
        <div className="absolute inset-0 opacity-[0.35]" style={{
          background: 'radial-gradient(ellipse 160% 30% at 65% 45%, #2a3a6a, transparent)',
        }} />
        <div className="absolute inset-0 opacity-[0.15]" style={{
          background: 'radial-gradient(ellipse 80% 60% at 30% 70%, #1a0a3a, transparent)',
        }} />
        <Canvas className="absolute inset-0" camera={{ position: [0, 0, 5], fov: 60 }} gl={{ antialias: true, alpha: false }}>
          <color attach="background" args={['#050a14']} />
          <Suspense fallback={null}>
            <StarField />
          </Suspense>
        </Canvas>
      </div>

      {/* Subtle left fade for text readability — keep stars visible */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-r from-[#050a14]/70 via-[#050a14]/20 to-transparent" />

      {/* Split layout */}
      <div className="hero-content relative z-[2] w-full max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center min-h-[100dvh] py-24">

        {/* LEFT — text */}
        <div className="flex flex-col items-start text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="text-[10px] uppercase tracking-[0.25em] text-white/30 font-medium mb-8"
          >
            Satellite Intelligence Platform
          </motion.div>

          <h1 ref={titleRef} className="overflow-hidden mb-6" style={{ perspective: '1000px' }}>
            <div className="flex flex-row flex-wrap gap-x-4 gap-y-1 items-end">
              {WORDS.map((word, i) => (
                <span
                  key={word}
                  className={`hero-word inline-block font-black leading-none tracking-tight ${
                    i === 0
                      ? 'text-[clamp(3rem,7vw,6rem)] text-white'
                      : 'text-[clamp(3rem,7vw,6rem)]'
                  }`}
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    ...(i === 1 ? { color: 'oklch(68% 0.2 240)' } : {}),
                  }}
                >
                  {word}
                </span>
              ))}
            </div>
          </h1>

          <p ref={subtitleRef} className="text-white/50 text-lg max-w-lg leading-relaxed mb-10">
            Harness satellite imagery, deep learning, and real-time climate data to predict
            natural disasters and generate actionable geospatial intelligence.
          </p>

          <div ref={ctaRef} className="flex flex-col sm:flex-row items-center gap-4 mb-16">
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

          <div ref={statsRef} className="flex flex-wrap items-center gap-8 sm:gap-12">
            {stats.map((s, i) => (
              <div key={i} className="text-left">
                <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums">{s.value}</div>
                <div className="text-xs text-white/40 mt-1 uppercase tracking-widest">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Earth globe */}
        <div className="hidden lg:flex items-center justify-center h-[580px] mt-4">
          <Canvas camera={{ position: [0, 0, 3.2], fov: 45 }} gl={{ antialias: true, alpha: true }}>
            <Suspense fallback={null}>
              <EarthScene />
            </Suspense>
          </Canvas>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[2]">
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
