# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Marketing website for Lev, an AI accounting product for SMBs in India. Built with Next.js App Router, TypeScript, Tailwind CSS v4, and Framer Motion.

## Commands

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build
npm run lint     # Run ESLint
npm run start    # Start production server
```

## Architecture

**Route Pattern**: Thin route files (`src/app/*/page.tsx`) that import and render corresponding component files from `src/components/`. Page logic lives in components, not routes.

**Key Files**:
- `src/lib/site-config.ts` - Centralized config for Cal.com booking URLs and founder info. All external links flow through here.
- `src/components/landing-page.tsx` - Full landing UI with animated sections
- `src/components/book-demo-page.tsx` - Cal.com embed with duration toggle
- `src/app/globals.css` - Tailwind v4 import + custom CSS variables for theming

**Animation Pattern**: All components use Framer Motion with `useReducedMotion()` hook. Helper functions `fadeUp()` and `stagger()` accept a `shouldReduceMotion` boolean to disable animations for accessibility.

**Environment Variables** (prefix with `NEXT_PUBLIC_`):
- `CALCOM_30MIN_URL` / `CALCOM_15MIN_URL` - Cal.com booking links
- `FOUNDER_LINKEDIN_URL` - Founder's LinkedIn profile

## Conventions

- Use `@/*` path alias for imports from `src/`
- Tailwind v4 syntax: utility classes in JSX, CSS variables in globals.css
- All external/configurable URLs must go through `site-config.ts`
