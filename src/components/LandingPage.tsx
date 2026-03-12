import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ParticleField } from './landing/ParticleField';
import { Navbar } from './landing/Navbar';
import { HeroSection } from './landing/HeroSection';
import { FeaturesSection } from './landing/FeaturesSection';
import { HowItWorksSection } from './landing/HowItWorksSection';
import { AboutSection } from './landing/AboutSection';
import { Footer } from './landing/Footer';

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  const goToAuth = () => navigate('/auth');
  const goToDashboard = () => navigate('/dashboard');
  const handleLogout = async () => { await logout(); navigate('/'); };

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      <ParticleField />
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
      <FeaturesSection />
      <HowItWorksSection />
      <AboutSection />
      <Footer />
    </div>
  );
}
