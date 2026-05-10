# Shrishti AI - Design System & UI Architecture

## Design Philosophy: "The Satellite Control Room"
The interface is designed to evoke the precision and authority of a satellite operations center. It prioritizes information density, high clarity, and professional aesthetics.

### Key Principles
-   **High Density, Low Noise**: Maximize information display without overwhelming the user.
-   **Glassmorphism & Elevation**: Use of glass effects (`.glass`) and subtle shadows (`.surface`) for modular depth.
-   **Dark Mode Priority**: A deep charcoal palette that reduces eye strain during long monitoring sessions.
-   **Semantic Coloring**: Standardized colors for datasets (Vegetation = Green, Terrain = Orange, etc.).

## Visual Language

### Color Palette (OKLCH-ready)
-   **Primary**: Pure Black/White (depending on mode) for professional utility.
-   **Background**: Deep Charcoal (`0 0% 3.9%`).
-   **Accent**: Satellite Blue (`3b82f6`) for active states and highlights.
-   **Datasets**:
    -   Vegetation: Green (`142 76% 36%`)
    -   Terrain: Orange (`25 95% 45%`)
    -   Landcover: Sky Blue (`199 89% 40%`)

### Typography
-   **Font**: `Inter` for its geometric clarity and readability at small sizes.
-   **Scale**: Tight typographic scale with emphasis on uppercase labels for UI controls.

### UI Components
-   **Sidebar**: A 3-tab navigation system (Models, Data, Regions) using high-density list items.
-   **Panels**: Collapsible glass containers for specialized tools (HazardGuard, WeatherWise).
-   **Map**: The central canvas with minimal overlays and floating control clusters.

## Component Architecture

### Page Structure
`Index.tsx` acts as the primary layout orchestrator:
-   `Sidebar`: Left-docked navigation and control hub.
-   `MapView`: Full-screen geospatial visualization engine.
-   `Floating Panels`: Contextual toolbars and status overlays.

### Interaction Patterns
-   **Hover Lift**: Subtle vertical movement (`.hover-lift`) to indicate interactivity.
-   **Smooth Transitions**: 200ms cubic-bezier transitions for all state changes.
-   **Glow Effects**: Pulsing glows for critical alerts or active processing states.

## Implementation Guidelines
-   **Tailwind First**: Use utility classes for 90% of styling.
-   **Vanilla CSS for Logic**: Use CSS variables for theme-aware tokens.
-   **Accessibility**: Maintain high contrast ratios for map labels and data overlays.
