import { useRef, useState, useEffect } from 'react'
import { gsap, useGSAP } from '@/lib/gsap'
import { motion, AnimatePresence } from 'motion/react'

interface NavbarProps {
  isAuthenticated?: boolean
  onSignIn: () => void
  onDashboard?: () => void
  onLogout?: () => void
}

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'About', href: '#about' },
]

export function Navbar({ isAuthenticated, onSignIn, onDashboard, onLogout }: NavbarProps) {
  const navRef = useRef<HTMLElement>(null)
  const [open, setOpen] = useState(false)

  // Entrance animation
  useGSAP(() => {
    gsap.from(navRef.current, {
      y: -80,
      opacity: 0,
      duration: 1,
      ease: 'power4.out',
      delay: 0.5,
    })
  }, { scope: navRef })

  // Lock scroll when menu open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const scrollTo = (href: string) => {
    setOpen(false)
    setTimeout(() => {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
    }, 400)
  }

  return (
    <>
      <nav ref={navRef} className="fixed top-6 left-0 right-0 z-[100] flex justify-center pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-6 px-4 py-2.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2.5 shrink-0">
            <img src="/shrishti-icon-small.png" alt="" className="h-7 w-7 object-contain" />
            <span className="text-white font-semibold text-sm tracking-wide">Shrishti AI</span>
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ label, href }) => (
              <button
                key={label}
                onClick={() => scrollTo(href)}
                className="px-3 py-1.5 text-xs text-white/60 hover:text-white transition-colors duration-300 rounded-full hover:bg-white/5"
              >
                {label}
              </button>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <button onClick={onDashboard} className="px-4 py-1.5 text-xs font-medium text-white/80 hover:text-white border border-white/15 rounded-full hover:bg-white/5 transition-all duration-300">
                  Dashboard
                </button>
                <button onClick={onLogout} className="px-4 py-1.5 text-xs font-medium text-red-400 border border-red-500/20 rounded-full hover:bg-red-500/10 transition-all duration-300">
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={onSignIn}
                className="group flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-black bg-white rounded-full hover:bg-white/90 transition-all duration-300 active:scale-[0.97]"
              >
                Sign In
                <span className="w-4 h-4 rounded-full bg-black/10 flex items-center justify-center group-hover:translate-x-0.5 transition-transform duration-300">
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </button>
            )}

            {/* Hamburger (mobile) */}
            <button
              onClick={() => setOpen(!open)}
              className="md:hidden w-8 h-8 flex flex-col items-center justify-center gap-1.5 relative"
              aria-label="Menu"
            >
              <span className={`block w-5 h-px bg-white transition-all duration-300 ${open ? 'rotate-45 translate-y-[3px]' : ''}`} />
              <span className={`block w-5 h-px bg-white transition-all duration-300 ${open ? '-rotate-45 -translate-y-[3px]' : ''}`} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[99] bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center gap-8"
          >
            {NAV_LINKS.map(({ label, href }, i) => (
              <motion.button
                key={label}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ delay: i * 0.08 + 0.1, duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                onClick={() => scrollTo(href)}
                className="text-4xl font-bold text-white hover:text-white/60 transition-colors"
              >
                {label}
              </motion.button>
            ))}
            <motion.button
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ delay: 0.35, duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
              onClick={isAuthenticated ? onDashboard : onSignIn}
              className="mt-4 px-8 py-3 bg-white text-black font-semibold rounded-full text-lg"
            >
              {isAuthenticated ? 'Dashboard' : 'Get Started'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
