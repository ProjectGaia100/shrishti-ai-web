import { useState, useEffect, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface CollapsibleSectionProps {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onToggle?: (expanded: boolean) => void;
  badge?: string;
  emptyMessage?: string;
}

export const CollapsibleSection = ({
  title,
  icon: Icon,
  children,
  defaultExpanded = true,
  expanded: controlledExpanded,
  onToggle,
  badge,
  emptyMessage,
}: CollapsibleSectionProps) => {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  
  // Use controlled state if provided, otherwise use internal state
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  useEffect(() => {
    if (controlledExpanded !== undefined) {
      setInternalExpanded(controlledExpanded);
    }
  }, [controlledExpanded]);

  const handleToggle = () => {
    const newState = !isExpanded;
    setInternalExpanded(newState);
    onToggle?.(newState);
  };

  const hasChildren = children !== null && children !== undefined && 
    (Array.isArray(children) ? children.length > 0 : true);

  return (
    <div className="border-b border-border/50 last:border-b-0">
      {/* Section Header */}
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-muted/50"
      >
        <div className="flex items-center gap-2">
          {Icon && (
            <Icon className="h-4 w-4 text-primary" />
          )}
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
            {title}
          </span>
          {badge && (
            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown 
          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
            isExpanded ? 'rotate-0' : '-rotate-90'
          }`}
        />
      </button>

      {/* Section Content */}
      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {hasChildren && !emptyMessage ? (
          <div className="space-y-2 pb-3">
            {children}
          </div>
        ) : emptyMessage ? (
          <div className="px-4 pb-2">
            <p className="text-[10px] italic text-muted-foreground/60">{emptyMessage}</p>
          </div>
        ) : (
          <div className="space-y-2 pb-3">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};
