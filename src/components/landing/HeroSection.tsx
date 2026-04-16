import React from 'react';
import { AnimatedGlobe } from './AnimatedGlobe';

interface HeroSectionProps {
  isAuthenticated?: boolean;
  onSignIn: () => void;
  onDashboard?: () => void;
}

export function HeroSection({ isAuthenticated, onSignIn, onDashboard }: HeroSectionProps) {
  return (
    <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden py-8">
      {/* Background is now transparent to show smoke animation */}

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
        {/* Left: Text Content */}
        <div className="flex-1 text-center lg:text-left space-y-6 animate-fade-in">
          {/* Heading - Larger and more impactful */}
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05]">
            <span className="text-white drop-shadow-lg">SHRISHTI</span>{' '}
            <span className="text-gradient bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">AI</span>
          </h1>

          {/* Tagline - More prominent */}
          <p className="text-2xl sm:text-3xl font-light text-white/90 tracking-wide">
            Satellite Intelligence for Precision Agriculture
          </p>

          {/* Description - Better contrast */}
          <p className="text-lg sm:text-xl text-white/70 max-w-2xl leading-relaxed">
            Harness satellite imagery, deep learning, and predictive models 
            to monitor crop health, analyze soil moisture, and mitigate seasonal risks 
            — all from a single research platform.
          </p>

          {/* CTA Button - Single prominent button */}
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
            <button
              onClick={isAuthenticated ? onDashboard : onSignIn}
              className="group relative px-10 py-4 text-lg font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="relative z-10 flex items-center gap-3">
                {isAuthenticated ? 'Go to Dashboard' : 'Explore Platform'}
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>
          </div>

          {/* Stats row - More visual impact */}
          <div className="flex items-center justify-center lg:justify-start gap-12 pt-8">
            {[
              { value: '5+', label: 'Asset Layers' },
              { value: 'Yield', label: 'Predictions' },
              { value: 'Daily', label: 'Soil Health' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-white/60 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Globe - Larger */}
        <div className="flex-shrink-0 relative lg:scale-110" style={{ animationDelay: '0.3s' }}>
          <AnimatedGlobe />

          {/* Floating status cards around globe - Glass morphism style */}
          <div className="absolute -top-2 -right-4 md:top-4 md:right-0 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg px-4 py-2.5 text-sm animate-float">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-white/90 font-medium">NDVI Optimized</span>
            </div>
          </div>

          <div className="absolute -bottom-2 -left-4 md:bottom-6 md:left-0 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg px-4 py-2.5 text-sm animate-float-delayed">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-white/90 font-medium">Moisture Map</span>
            </div>
          </div>

          <div className="absolute top-1/2 -right-8 md:-right-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg px-4 py-2.5 text-sm animate-float-slow">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-white/90 font-medium">Processing</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
