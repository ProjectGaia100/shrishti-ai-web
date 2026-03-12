# Shrishti AI — Web Frontend

Shrishti AI is an intelligent geospatial analytics and disaster-management web platform that integrates satellite imagery, real-time weather data, and AI-powered hazard prediction into a unified dashboard.

## Features

- **GeoVision** — Satellite image analysis and geospatial layer exploration
- **HazardGuard** — AI-driven natural disaster risk prediction
- **WeatherWise** — Real-time weather forecasting and alerts
- **Satellite Timelapse** — Animated satellite imagery over time
- **Interactive Map** — Multi-layer geospatial map with search and filtering
- **Landing Page** — Animated hero, features, and how-it-works sections

## Tech Stack

- **React** + **TypeScript**
- **Vite** — fast dev server and build tool
- **Tailwind CSS** — utility-first styling
- **shadcn/ui** — accessible component library
- **Supabase** — authentication and database
- **Vercel** — deployment

## Getting Started

Requires **Node.js ≥ 18** and **npm**.

```sh
# 1. Clone the repo
git clone https://github.com/ProjectGaia100/shrishti-ai-web.git
cd shrishti-ai-web

# 2. Install dependencies
npm install

# 3. Copy env template and fill in your keys
cp .env.example .env

# 4. Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

## Environment Variables

See `.env.example` for the full list of required keys (Supabase URL, anon key, API endpoints, etc.).

## Deployment

Deploy to Vercel by importing the repo — the included `vercel.json` handles SPA routing automatically.

## Project Structure

```
src/
  components/      # Reusable UI components
  components/landing/  # Landing-page sections
  context/         # React context providers (Auth, Theme)
  pages/           # Route-level page components
  services/        # API service helpers
public/            # Static assets and icons
```
