import React from 'react';
import { AnimatedGlobe } from './AnimatedGlobe';

interface HeroSectionProps {
  isAuthenticated?: boolean;
  onSignIn: () => void;
  onDashboard?: () => void;
}

export function HeroSection({ isAuthenticated, onSignIn, onDashboard }: HeroSectionProps) {
  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background — clean, minimal */}
      <div className="absolute inset-0 bg-background" />
      
      {/* Subtle grid pattern — dark mode only */}
      <div
        className="absolute inset-0 opacity-0 dark:opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Subtle accent glow — dark mode only */}
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-primary/[0.04] rounded-full blur-[120px] pointer-events-none hidden dark:block" />
      <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-primary/[0.03] rounded-full blur-[100px] pointer-events-none hidden dark:block" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-16 lg:gap-24 pt-24">
        {/* Left: Text Content */}
        <div className="flex-1 text-center lg:text-left space-y-8 animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-muted/50 text-xs text-muted-foreground font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            <span>Geospatial Intelligence Platform</span>
          </div>

          {/* Heading */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08]">
            <span className="text-foreground">SHRISHTI</span>{' '}
            <span className="text-gradient">AI</span>
          </h1>

          {/* Tagline */}
          <p className="text-xl sm:text-2xl font-light text-muted-foreground tracking-wide">
            Satellite Intelligence for Disaster Prediction
          </p>

          {/* Description */}
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
            Harness satellite imagery, deep learning, and real-time climate data 
            to predict natural disasters, monitor environmental change, and generate 
            actionable geospatial intelligence — all from a single research platform.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
            <button
              onClick={isAuthenticated ? onDashboard : onSignIn}
              className="group relative px-8 py-3.5 text-base font-semibold rounded-lg bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-all duration-250 hover:bg-primary/90 active:scale-[0.98]"
            >
              <span className="relative z-10 flex items-center gap-2">
                {isAuthenticated ? 'Go to Dashboard' : 'Explore Platform'}
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>

            <button
              onClick={scrollToFeatures}
              className="px-8 py-3.5 text-base font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
            >
              Learn More
            </button>
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-center lg:justify-start gap-10 pt-6">
            {[
              { value: '5+', label: 'Data Layers' },
              { value: 'AI', label: 'Predictions' },
              { value: 'Real-time', label: 'Monitoring' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-lg font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Globe */}
        <div className="flex-shrink-0 relative" style={{ animationDelay: '0.3s' }}>
          <AnimatedGlobe />

          {/* Floating status cards around globe */}
          <div className="absolute -top-2 -right-4 md:top-4 md:right-0 surface-raised rounded-lg px-3 py-2 text-xs animate-float">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-success" />
              <span className="text-muted-foreground font-medium">NDVI Active</span>
            </div>
          </div>

          <div className="absolute -bottom-2 -left-4 md:bottom-6 md:left-0 surface-raised rounded-lg px-3 py-2 text-xs animate-float-delayed">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-muted-foreground font-medium">Satellite Feed</span>
            </div>
          </div>

          <div className="absolute top-1/2 -right-8 md:-right-6 surface-raised rounded-lg px-3 py-2 text-xs animate-float-slow">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
              <span className="text-muted-foreground font-medium">Processing</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce-slow">
        <span className="text-xs text-muted-foreground">Scroll to explore</span>
        <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  );
}
