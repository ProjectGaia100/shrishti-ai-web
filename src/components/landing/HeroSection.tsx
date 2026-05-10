import React from 'react';
import { motion } from 'framer-motion';
import { AnimatedGlobe } from './AnimatedGlobe';

interface HeroSectionProps {
  isAuthenticated?: boolean;
  onSignIn: () => void;
  onDashboard?: () => void;
}

export function HeroSection({ isAuthenticated, onSignIn, onDashboard }: HeroSectionProps) {
  const springTransition = {
    type: "spring",
    stiffness: 100,
    damping: 20
  };

  return (
    <section className="relative min-h-[100svh] flex items-center overflow-hidden py-20">
      {/* Background is now transparent to show smoke animation */}

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
        {/* Left: Text Content (Occupies 7 columns) */}
        <div className="lg:col-span-7 text-left space-y-8">
          <div className="space-y-4">
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                backgroundPosition: ["0% 0%", "10% 10%", "0% 0%"]
              }}
              transition={{
                opacity: { duration: 0.8 },
                y: springTransition,
                backgroundPosition: { duration: 30, repeat: Infinity, ease: "linear" }
              }}
              className="text-8xl sm:text-9xl lg:text-[12rem] font-bold tracking-tighter leading-[0.8] text-transparent bg-clip-text bg-cover bg-center"
              style={{ 
                backgroundImage: `url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=2072')`,
                backgroundSize: '150%'
              }}
            >
              SHRISHTI<br/>
              AI
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springTransition, delay: 0.2 }}
              className="text-2xl sm:text-3xl font-light text-emerald-100/90 tracking-wide max-w-xl"
            >
              Precision Satellite Intelligence for Global Disaster Resilience
            </motion.p>
          </div>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springTransition, delay: 0.3 }}
            className="text-lg sm:text-xl text-[oklch(var(--slate-text))] max-w-[65ch] leading-relaxed"
          >
            Harnessing hyper-spectral imagery and deep LSTM architectures to predict 
            environmental volatility. Actionable geospatial intelligence 
            engineered for the next generation of climate response.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springTransition, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center gap-6 pt-6"
          >
            {/* Double-Bezel Initialize Button */}
            <div className="p-1.5 rounded-full bg-white/5 ring-1 ring-white/10 group">
              <button
                onClick={isAuthenticated ? onDashboard : onSignIn}
                className="px-8 py-4 rounded-full bg-white text-black font-bold shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] hover:bg-zinc-200 transition-colors flex items-center gap-3"
              >
                {isAuthenticated ? 'Enter Control Center' : 'Initialize Platform'}
                <svg className="w-5 h-5 transition-transform duration-500 group-hover:translate-x-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                </svg>
              </button>
            </div>
            
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-[#020617] bg-emerald-950/50 flex items-center justify-center overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-emerald-500/20 to-transparent" />
                </div>
              ))}
              <div className="pl-6 text-sm text-white/40 font-mono self-center">
                +2.4k Nodes Active
              </div>
            </div>
          </motion.div>

          {/* Metrics row */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springTransition, delay: 0.5 }}
            className="grid grid-cols-3 gap-8 pt-12 border-t border-white/5 max-w-lg"
          >
            {[
              { value: '60D', label: 'Forecast' },
              { value: '97.3%', label: 'Accuracy' },
              { value: 'REAL', label: 'Latency' },
            ].map((stat, i) => (
              <div key={i} className="space-y-1">
                <div className="text-2xl font-bold text-white font-mono tracking-tight">{stat.value}</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-500/60 font-semibold">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right: Globe (Occupies 5 columns) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...springTransition, delay: 0.6 }}
          className="lg:col-span-5 relative flex justify-center lg:justify-end"
        >
          <div className="relative lg:scale-125 translate-x-10">
            <AnimatedGlobe />

            {/* Tactical Status Cards */}
            <div className="absolute -top-10 -left-10 bg-[#0F172A]/80 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-4 shadow-2xl animate-float">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                <div className="space-y-0.5">
                  <div className="text-[10px] uppercase tracking-widest text-emerald-500/60 font-bold">System Status</div>
                  <div className="text-xs text-white font-mono">NOMINAL_OPS</div>
                </div>
              </div>
            </div>

            <div className="absolute bottom-10 -right-5 bg-[#0F172A]/80 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-4 shadow-2xl animate-float-delayed">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse shadow-[0_0_12px_rgba(59,130,246,0.5)]" />
                <div className="space-y-0.5">
                  <div className="text-[10px] uppercase tracking-widest text-blue-500/60 font-bold">Inference Feed</div>
                  <div className="text-xs text-white font-mono">STREAMING_PROBS</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
