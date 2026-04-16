import React, { useEffect, useRef, useState } from 'react';

const steps = [
  {
    number: '01',
    title: 'Asset Ingestion',
    subtitle: 'Satellite + Agro-Weather',
    description:
      'Multi-source multi-spectral imagery from Sentinel and Landsat combined with specialized NASA agro-weather streams for soil and climate analysis.',
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    ),
    details: ['Sentinel-2 MSI', 'Landsat 8/9', 'NASA POWER', 'Soil Grids'],
  },
  {
    number: '02',
    title: 'Agri-AI Modeling',
    subtitle: 'Crop Stress Intelligence',
    description:
      'Advanced neural networks analyze multi-spectral bands to identify NDVI anomalies, evapotranspiration rates, and soil moisture stress.',
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
    ),
    details: ['NDVI Analysis', 'Moisture Prediction', 'Yield Estimator', 'Stress CNN'],
  },
  {
    number: '03',
    title: 'Farm Planning',
    subtitle: 'Strategic Yield Insights',
    description:
      'Actionable agritech intelligence delivered through crop health maps, seasonal forecasts, and automated stress alerts for farm management.',
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
      </svg>
    ),
    details: ['NDVI Dashboards', 'Stress Alerts', 'Yield Optimization', 'Soil Insights'],
  },
];

export function HowItWorksSection() {
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
    <section id="how-it-works" ref={sectionRef} className="relative py-28 overflow-hidden bg-muted/30 dark:bg-transparent">
      {/* Separator */}
      <div className="absolute top-0 left-0 right-0 separator-gradient" />

      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <div className={`text-center space-y-4 mb-20 transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-background text-xs text-muted-foreground font-medium mb-4">
            Pipeline Architecture
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
            <span className="text-foreground">How It </span>
            <span className="text-gradient">Works</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            From raw satellite data to actionable intelligence — a three-stage
            pipeline powered by deep learning and remote sensing.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-[72px] left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-px">
            <div className={`h-full bg-border transition-all duration-2000 ${visible ? 'scale-x-100' : 'scale-x-0'}`} style={{ transformOrigin: 'left' }} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8">
            {steps.map((step, i) => (
              <div
                key={step.number}
                className={`relative transition-all duration-700 ${
                  visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
                }`}
                style={{ transitionDelay: `${i * 250 + 300}ms` }}
              >
                <div className="group relative">
                  {/* Number + icon */}
                  <div className="relative flex justify-center mb-8">
                    <div className="w-16 h-16 rounded-xl surface-raised flex items-center justify-center text-primary">
                      {step.icon}
                    </div>
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                      {step.number}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="text-center space-y-3">
                    <h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.subtitle}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>

                    {/* Tech tags */}
                    <div className="flex flex-wrap justify-center gap-2 pt-4">
                      {step.details.map((detail) => (
                        <span
                          key={detail}
                          className="text-xs px-3 py-1 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors duration-200"
                        >
                          {detail}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mobile arrow */}
                {i < steps.length - 1 && (
                  <div className="lg:hidden flex justify-center py-6">
                    <svg className="w-5 h-5 text-muted-foreground animate-bounce-slow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
