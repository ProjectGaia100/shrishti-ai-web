import React, { useState } from 'react';
import { useScroll, useMotionValueEvent, motion } from 'framer-motion';

interface NavbarProps {
  isAuthenticated?: boolean;
  onSignIn: () => void;
  onDashboard?: () => void;
  onLogout?: () => void;
}

export function Navbar({ isAuthenticated, onSignIn, onDashboard, onLogout }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 50);
  });

  const navbarVariants = {
    initial: { y: -20, opacity: 0 },
    animate: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 120, damping: 25 } }
  };

  return (
    <motion.nav
      variants={navbarVariants}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-background/95 backdrop-blur-md border-b border-border shadow-sm py-2'
          : 'bg-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img src="/shrishti-icon-small.png" alt="Shrishti AI Icon" className="h-10 w-10 object-contain" />
          <img src="/shrishti-text-long.png" alt="Shrishti AI" className="h-8 object-contain" />
        </div>

        {/* Right side: CTA */}
        <div className="flex items-center gap-3">
          
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onDashboard}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-muted transition-colors duration-200"
              >
                Dashboard
              </button>
              <button
                onClick={onLogout}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={onSignIn}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
