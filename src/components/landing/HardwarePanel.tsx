import React from 'react';
import { cn } from '@/lib/utils';

interface HardwarePanelProps {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
}

export function HardwarePanel({ children, className, containerClassName }: HardwarePanelProps) {
  return (
    <div className={cn("p-1.5 rounded-[2.5rem] bg-white/5 ring-1 ring-white/5 backdrop-blur-md", containerClassName)}>
      <div className={cn(
        "p-6 rounded-[calc(2.5rem-0.375rem)] bg-zinc-900/50 border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]",
        className
      )}>
        {children}
      </div>
    </div>
  );
}
