import React from 'react';
import { AnimatedGlobe } from './AnimatedGlobe';

interface HeroSectionProps {
  isAuthenticated?: boolean;
  onSignIn: () => void;
  onDashboard?: () => void;
}

export function HeroSection({ isAuthenticated, onSignIn, onDashboard }: HeroSectionProps) {
  return (
    <section className="relative min-h-[100svh] flex items-center overflow-hidden py-20">
      {/* Background is now transparent to show smoke animation */}

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
        {/* Left: Text Content (Occupies 7 columns) */}
        <div className="lg:col-span-7 text-left space-y-8 animate-fade-in">
          <div className="space-y-4">
            <h1 className="text-7xl sm:text-8xl lg:text-[10rem] font-bold tracking-tighter leading-[0.85] text-white">
              SHRISHTI<br/>
              <span className="text-emerald-500">AI</span>
            </h1>
            <p className="text-2xl sm:text-3xl font-light text-emerald-100/90 tracking-wide max-w-xl">
              Precision Satellite Intelligence for Global Disaster Resilience
            </p>
          </div>

          <p className="text-lg sm:text-xl text-white/60 max-w-xl leading-relaxed">
            Harnessing hyper-spectral imagery and deep LSTM architectures to predict 
            environmental volatility. Actionable geospatial intelligence 
            engineered for the next generation of climate response.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-6 pt-6">
            <button
              onClick={isAuthenticated ? onDashboard : onSignIn}
              className="group relative px-12 py-5 text-lg font-medium rounded-full bg-emerald-600 text-white shadow-2xl shadow-emerald-500/20 hover:bg-emerald-500 transition-all duration-500 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="relative z-10 flex items-center gap-3">
                {isAuthenticated ? 'Enter Control Center' : 'Initialize Platform'}
                <svg className="w-5 h-5 transition-transform duration-500 group-hover:translate-x-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                </svg>
              </span>
            </button>
            
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
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-3 gap-8 pt-12 border-t border-white/5 max-w-lg">
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
          </div>
        </div>

        {/* Right: Globe (Occupies 5 columns) */}
        <div className="lg:col-span-5 relative flex justify-center lg:justify-end" style={{ animationDelay: '0.3s' }}>
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
        </div>
      </div>
    </section>
  );
}
