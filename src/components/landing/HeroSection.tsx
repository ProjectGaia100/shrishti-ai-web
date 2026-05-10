import React from 'react';
import { motion } from 'framer-motion';
import { AnimatedGlobe } from './AnimatedGlobe';
import { HardwarePanel } from './HardwarePanel';
import { Activity, Cpu, ShieldCheck, Database, ChartLineUp } from 'phosphor-react';

interface HeroSectionProps {
  isAuthenticated?: boolean;
  onSignIn: () => void;
  onDashboard?: () => void;
}

const dataLogs = [
  "LAT: 28.6139 LON: 77.2090 PROB: 0.982",
  "LAT: 19.0760 LON: 72.8777 PROB: 0.124",
  "LAT: 13.0827 LON: 80.2707 PROB: 0.856",
  "LAT: 22.5726 LON: 88.3639 PROB: 0.431",
  "LAT: 12.9716 LON: 77.5946 PROB: 0.098",
  "LAT: 17.3850 LON: 78.4867 PROB: 0.672",
  "LAT: 23.0225 LON: 72.5714 PROB: 0.315",
  "LAT: 15.2993 LON: 74.1240 PROB: 0.991",
];

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

          {/* Metrics Bento Row */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springTransition, delay: 0.5 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12"
          >
            <HardwarePanel className="p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-emerald-500">
                <ChartLineUp size={18} weight="bold" />
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Accuracy</span>
              </div>
              <div className="text-2xl font-bold text-white font-mono tracking-tight">97.3%</div>
            </HardwarePanel>

            <HardwarePanel className="p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-blue-500">
                <Database size={18} weight="bold" />
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Processed</span>
              </div>
              <div className="text-2xl font-bold text-white font-mono tracking-tight">2.4 PB</div>
            </HardwarePanel>

            <HardwarePanel className="p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-amber-500">
                <Cpu size={18} weight="bold" />
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Latency</span>
              </div>
              <div className="text-2xl font-bold text-white font-mono tracking-tight">REAL-TIME</div>
            </HardwarePanel>
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

            {/* Hardware-styled Status Panel */}
            <HardwarePanel 
              containerClassName="absolute -top-10 -left-10 animate-float"
              className="p-4 min-w-[180px]"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Activity size={24} className="text-emerald-500" weight="bold" />
                  <div className="absolute inset-0 bg-emerald-500/20 blur-md rounded-full" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-[10px] uppercase tracking-widest text-emerald-500/60 font-bold">System Status</div>
                  <div className="text-xs text-white font-mono font-bold">NOMINAL_OPS</div>
                </div>
              </div>
            </HardwarePanel>

            {/* Live Inference Feed Hardware Panel */}
            <HardwarePanel 
              containerClassName="absolute bottom-10 -right-5 animate-float-delayed"
              className="p-4 min-w-[220px]"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3 pb-2 border-b border-white/5">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  <div className="text-[10px] uppercase tracking-widest text-blue-500/60 font-bold">Inference Feed</div>
                </div>
                
                <div className="h-24 overflow-hidden relative">
                  <motion.div
                    animate={{ y: ["0%", "-50%"] }}
                    transition={{ 
                      duration: 15, 
                      repeat: Infinity, 
                      ease: "linear" 
                    }}
                    className="space-y-2"
                  >
                    {[...dataLogs, ...dataLogs].map((log, i) => (
                      <div key={i} className="text-[9px] font-mono text-blue-400/70 whitespace-nowrap tracking-tighter">
                        {log}
                      </div>
                    ))}
                  </motion.div>
                  {/* Fade mask */}
                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-zinc-900/50 via-transparent to-zinc-900/50" />
                </div>
              </div>
            </HardwarePanel>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
