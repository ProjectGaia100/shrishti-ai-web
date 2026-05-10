import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useScroll, useTransform, motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { SmokeBackground } from '@/components/ui/smoke-background';
import { Navbar } from './landing/Navbar';
import { HeroSection } from './landing/HeroSection';
import { Footer } from './landing/Footer';

// =============================================================================
// SMOKE BACKGROUND CONFIGURATION - Tweak these values to customize the effect
// Location: web/src/components/LandingPage.tsx
// =============================================================================
const SMOKE_CONFIG = {
  // --- SMOKE SETTINGS ---
  smokeColor: "#71717a",      // Desaturated silver-grey
  glowColor: "#3B82F6",       // Glow/highlight color on smoke edges (hex)
  glowIntensity: 0.2,         // Subtle glow
  brightness: 0.8,            // Overall smoke brightness (0.0 - 1.0)
  speed: 0.4,                 // Slow, cinematic speed
  
  // --- BACKGROUND COLOR (the dark/black areas) ---
  baseColor: "#050505",       // Deep OLED black
  baseMix: 0.8,               // How much baseColor stays after fade-in (0.0 = fades to black, 1.0 = stays baseColor fully)
  
  // --- OVERLAY (darkens everything for text readability) ---
  overlayOpacity: 0.4,        // Dark overlay opacity (0.0 - 1.0)
  
  // --- DOTS CONFIGURATION (flickering dots on far left/right edges) ---
  dotDensity: 0.8,            // How many dots (0.0 - 1.0)
  dotBrightness: 2.0,         // Dot brightness (0.0 - 2.0) - subtle is ~0.5-0.8
  dotColor: "#a8d4ff",        // Dot color (hex) - try "#a8d4ff" for blue tint
  dotSize: 0.006,             // Dot size (0.001 - 0.01) - smaller = tinier dots
  dotEdgeWidth: 0.20,         // How far from edge dots appear (0.05 - 0.25) - smaller = closer to edge only
};
// =============================================================================

const staggerContainer = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const { scrollYProgress } = useScroll();
  
  // Dynamic opacity based on scroll depth - fades out as user scrolls down
  const backgroundOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.3]);
  const contentBrightness = useTransform(scrollYProgress, [0, 0.5], [1, 0.8]);

  const goToAuth = () => navigate('/auth');
  const goToDashboard = () => navigate('/dashboard');
  const handleLogout = async () => { await logout(); navigate('/'); };

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Animated Smoke Background */}
      <motion.div 
        className="fixed inset-0 z-0"
        style={{ opacity: backgroundOpacity }}
      >
        <SmokeBackground 
          smokeColor={SMOKE_CONFIG.smokeColor}
          glowColor={SMOKE_CONFIG.glowColor}
          glowIntensity={SMOKE_CONFIG.glowIntensity}
          brightness={SMOKE_CONFIG.brightness}
          speed={SMOKE_CONFIG.speed}
          baseColor={SMOKE_CONFIG.baseColor}
          baseMix={SMOKE_CONFIG.baseMix}
          dotDensity={SMOKE_CONFIG.dotDensity}
          dotBrightness={SMOKE_CONFIG.dotBrightness}
          dotColor={SMOKE_CONFIG.dotColor}
          dotSize={SMOKE_CONFIG.dotSize}
          dotEdgeWidth={SMOKE_CONFIG.dotEdgeWidth}
        />
        {/* Dark overlay for better text readability */}
        <div 
          className="absolute inset-0 bg-black pointer-events-none"
          style={{ opacity: SMOKE_CONFIG.overlayOpacity }}
        />
      </motion.div>
      
      {/* Content Layer */}
      <motion.div 
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="relative z-10"
        style={{ filter: `brightness(${contentBrightness})` }}
      >
        <Navbar
          isAuthenticated={isAuthenticated}
          onSignIn={goToAuth}
          onDashboard={goToDashboard}
          onLogout={handleLogout}
        />
        <HeroSection
          isAuthenticated={isAuthenticated}
          onSignIn={goToAuth}
          onDashboard={goToDashboard}
        />
        <Footer />
      </motion.div>
    </div>
  );
}

export default LandingPage;
