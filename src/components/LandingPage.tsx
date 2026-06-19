import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { SmoothScroll } from './landing/SmoothScroll'
import { CustomCursor } from './landing/CustomCursor'
import { Navbar } from './landing/Navbar'
import { HeroSection } from './landing/HeroSection'
import { PlatformPreview } from './landing/PlatformPreview'
import { FeaturesSection } from './landing/FeaturesSection'
import { HowItWorksSection } from './landing/HowItWorksSection'
import { StatsSection } from './landing/StatsSection'
import { AboutSection } from './landing/AboutSection'
import { ApiSection } from './landing/ApiSection'
import { CTASection } from './landing/CTASection'
import { Footer } from './landing/Footer'

export function LandingPage() {
  const navigate = useNavigate()
  const { isAuthenticated, logout } = useAuth()

  const goToAuth = () => navigate('/auth')
  const goToDashboard = () => navigate('/dashboard')
  const handleLogout = async () => { await logout(); navigate('/') }

  return (
    <SmoothScroll>
      {/* Custom cursor (desktop only) */}
      <div className="hidden lg:block">
        <CustomCursor />
      </div>

      {/* Deep space background */}
      <div className="fixed inset-0 z-0 bg-[#020408]">
        {/* Subtle noise grain */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
        }} />
      </div>

      {/* Content */}
      <div className="relative z-10">
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
        <PlatformPreview />
        <FeaturesSection />
        <ApiSection />
        <StatsSection />
        <HowItWorksSection />
        <AboutSection />
        <CTASection
          isAuthenticated={isAuthenticated}
          onSignIn={goToAuth}
          onDashboard={goToDashboard}
        />
        <Footer />
      </div>
    </SmoothScroll>
  )
}
