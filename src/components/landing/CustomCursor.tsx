import { useRef, useEffect } from 'react'
import { gsap } from '@/lib/gsap'

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const pos = useRef({ x: 0, y: 0, rx: 0, ry: 0 })

  useEffect(() => {
    let moved = false
    const onMove = (e: MouseEvent) => {
      pos.current.x = e.clientX
      pos.current.y = e.clientY
      if (!moved) {
        moved = true
        gsap.to([dotRef.current, ringRef.current], { opacity: 1, duration: 0.3 })
      }
      gsap.to(dotRef.current, { x: e.clientX, y: e.clientY, duration: 0.1, ease: 'power2.out' })
    }
    window.addEventListener('mousemove', onMove)

    const ticker = () => {
      pos.current.rx += (pos.current.x - pos.current.rx) * 0.12
      pos.current.ry += (pos.current.y - pos.current.ry) * 0.12
      gsap.set(ringRef.current, { x: pos.current.rx, y: pos.current.ry })
    }
    gsap.ticker.add(ticker)

    const onEnter = () => gsap.to(ringRef.current, { scale: 2.5, opacity: 0.5, duration: 0.3 })
    const onLeave = () => gsap.to(ringRef.current, { scale: 1, opacity: 1, duration: 0.3 })
    document.querySelectorAll('a, button').forEach(el => {
      el.addEventListener('mouseenter', onEnter)
      el.addEventListener('mouseleave', onLeave)
    })

    return () => {
      window.removeEventListener('mousemove', onMove)
      gsap.ticker.remove(ticker)
    }
  }, [])

  return (
    <>
      <div
        ref={dotRef}
        style={{ opacity: 0 }}
        className="fixed top-0 left-0 w-2 h-2 bg-white rounded-full pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 mix-blend-difference"
      />
      <div
        ref={ringRef}
        style={{ opacity: 0 }}
        className="fixed top-0 left-0 w-8 h-8 border border-white/60 rounded-full pointer-events-none z-[9998] -translate-x-1/2 -translate-y-1/2 mix-blend-difference"
      />
    </>
  )
}
