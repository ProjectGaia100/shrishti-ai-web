import React, { useEffect, useRef, useState } from 'react';

const features = [
  {
    title: 'HazardGuard',
    subtitle: 'Disaster Prediction Engine',
    description:
      'Deep learning models analyze satellite imagery, seismic data, and climate patterns to predict natural disasters before they strike.',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
    accentColor: 'text-red-600 dark:text-red-400',
    accentBg: 'bg-red-50 dark:bg-red-500/10',
    accentBorder: 'hover:border-red-200 dark:hover:border-red-500/30',
  },
  {
    title: 'WeatherWise',
    subtitle: 'LSTM Weather Forecasting',
    description:
      'Advanced LSTM neural networks process atmospheric data to deliver hyperlocal 60-day weather predictions across 36 variables.',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
      </svg>
    ),
    accentColor: 'text-blue-600 dark:text-blue-400',
    accentBg: 'bg-blue-50 dark:bg-blue-500/10',
    accentBorder: 'hover:border-blue-200 dark:hover:border-blue-500/30',
  },
  {
    title: 'GeoVision Fusion',
    subtitle: 'Multi-Model Ensemble',
    description:
      'Cross-stacked ensemble fusing LSTM, Tree Models and CNN for disaster classification and weather regime prediction.',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
    accentColor: 'text-emerald-600 dark:text-emerald-400',
    accentBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    accentBorder: 'hover:border-emerald-200 dark:hover:border-emerald-500/30',
  },
  {
    title: 'Earth Data Layers',
    subtitle: 'Dynamic Earth Observation',
    description:
      'Toggle between NDVI, temperature, land cover, terrain, and nighttime lights with seamless layer blending on an interactive map.',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L12 12.75 6.429 9.75m11.142 0l4.179 2.25L12 17.25 2.25 12l4.179-2.25m11.142 0l4.179 2.25L12 22.5l-9.75-5.25 4.179-2.25" />
      </svg>
    ),
    accentColor: 'text-cyan-600 dark:text-cyan-400',
    accentBg: 'bg-cyan-50 dark:bg-cyan-500/10',
    accentBorder: 'hover:border-cyan-200 dark:hover:border-cyan-500/30',
  },
];

export function FeaturesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="features" ref={sectionRef} className="relative py-28 overflow-hidden">
      {/* Top separator */}
      <div className="absolute top-0 left-0 right-0 separator-gradient" />

      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className={`text-center space-y-4 mb-20 transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-muted/50 text-xs text-muted-foreground font-medium mb-4">
            Platform Capabilities
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
            <span className="text-foreground">Research-Grade </span>
            <span className="text-gradient">Features</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            Advanced geospatial intelligence tools combining satellite data, deep learning, 
            and ensemble models for comprehensive Earth monitoring.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={`group relative surface rounded-xl transition-all duration-500 ${feature.accentBorder} hover:shadow-lg ${
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
              }`}
              style={{ transitionDelay: `${i * 100 + 200}ms` }}
            >
              <div className="relative p-8 space-y-4">
                {/* Icon */}
                <div className={`w-11 h-11 rounded-lg ${feature.accentBg} ${feature.accentColor} flex items-center justify-center`}>
                  {feature.icon}
                </div>

                {/* Title */}
                <div>
                  <h3 className="text-xl font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">{feature.subtitle}</p>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
