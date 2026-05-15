import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { Moon, Sun, Home, LayoutDashboard, Settings, User, LogOut, ChevronDown } from 'lucide-react';

export function UserMenu() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/');
  }, [logout, navigate]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!user) return null;

  return (
    <div ref={menuRef} className="relative z-50">
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center sm:px-3 sm:py-1.5 h-10 w-10 sm:h-auto sm:w-auto rounded-xl sm:rounded-lg bg-background/80 sm:bg-background/90 backdrop-blur-xl sm:backdrop-blur-sm border border-border/40 sm:border-border shadow-2xl sm:shadow-sm hover:border-primary/20 hover:bg-muted/50 transition-all active:scale-95 sm:active:scale-100 group"
      >
        {/* Desktop View */}
        <div className="hidden sm:flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shadow-sm group-hover:scale-105 transition-transform">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col items-start">
            <span className="text-xs font-bold text-foreground leading-tight">
              {user.name}
            </span>
            <span className="text-[10px] text-muted-foreground leading-tight uppercase tracking-wider">
              {theme === 'light' ? 'Light' : 'Dark'} Mode
            </span>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </div>
        
        {/* Mobile View */}
        <div className="sm:hidden flex items-center justify-center">
          <Settings className="w-5 h-5 text-foreground/80" />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-background border border-border rounded-xl shadow-xl overflow-hidden animate-fade-in ring-1 ring-black/5">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-border bg-muted/20">
            <p className="text-sm font-bold text-foreground">{user.name}</p>
            <p className="text-[10px] font-medium text-muted-foreground truncate uppercase tracking-tight">{user.email}</p>
          </div>

          {/* Theme Toggle */}
          <div className="px-1 py-1 border-b border-border">
            <button
              onClick={() => {
                toggleTheme();
              }}
              className="w-full flex items-center justify-between gap-3 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                {theme === 'light' ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-amber-400" />}
                <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
              </div>
              <span className="text-[10px] font-bold text-primary/60 uppercase">Switch</span>
            </button>
          </div>

          {/* Menu items */}
          <div className="p-1 space-y-0.5">
            <button
              onClick={() => {
                setOpen(false);
                navigate('/');
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </button>

            <button
              onClick={() => {
                setOpen(false);
                navigate('/dashboard');
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => {
                setOpen(false);
                navigate('/settings');
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>

            <button
              onClick={() => {
                setOpen(false);
                navigate('/profile');
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </button>
          </div>

          {/* Logout */}
          <div className="p-1 border-t border-border mt-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
