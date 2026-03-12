import React, { useEffect, useRef, useState } from 'react';

export function AboutSection() {
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
    <section id="about" ref={sectionRef} className="relative py-28 overflow-hidden">
      {/* Separator */}
      <div className="absolute top-0 left-0 right-0 separator-gradient" />

      <div className="max-w-3xl mx-auto px-6">
        <div
          className={`text-center space-y-4 mb-16 transition-all duration-1000 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-background text-xs text-muted-foreground font-medium">
            About the Project
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
            <span className="text-foreground">Built for </span>
            <span className="text-gradient">Research</span>
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed max-w-2xl mx-auto">
            Shrishti AI is a research-grade geospatial intelligence platform developed
            as part of an advanced exploration into the intersection of artificial
            intelligence, remote sensing, and climate science.
          </p>
        </div>

        {/* Vision & Innovation side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mission */}
          <div
            className={`surface rounded-xl p-8 space-y-4 transition-all duration-1000 delay-200 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Our Vision
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              To democratize geospatial intelligence by making satellite data analysis and 
              AI-powered prediction accessible through intuitive visualization tools — 
              enabling researchers, disaster response teams, and environmental agencies to 
              make data-driven decisions faster than ever before.
            </p>
          </div>

          {/* Innovation */}
          <div
            className={`surface rounded-xl p-8 space-y-4 transition-all duration-1000 delay-[400ms] ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
              Research Innovation
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This platform represents a novel approach to combining multi-source satellite 
              data with deep learning architectures for predictive environmental analysis, 
              pushing the boundaries of what's possible in computational geoscience.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
