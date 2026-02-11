# Lev Website

Marketing website for Lev, an AI accounting product for SMBs.

## Stack

- Next.js (App Router + TypeScript)
- Tailwind CSS v4
- GSAP + ScrollTrigger
- Framer Motion

## Routes

- `/` - Landing page
- `/get-trail` - Primary call scheduling page (Cal.com embed)
- `/book-demo` - Legacy route that redirects to `/get-trail`

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env.local
```

3. Configure env values:

```bash
NEXT_PUBLIC_CALCOM_30MIN_URL=https://cal.com/lev.call
NEXT_PUBLIC_CALCOM_15MIN_URL=https://cal.com/your-handle/15min
NEXT_PUBLIC_FOUNDER_LINKEDIN_URL=https://www.linkedin.com/in/prasoonpathak
```

4. Run dev server:

```bash
npm run dev
```

## Build + Validate

```bash
npm run lint
npm run build
npm run start
```

## Key Files

- `/Users/prasoonpathak/Documents/lev.ai/src/app/page.tsx`
- `/Users/prasoonpathak/Documents/lev.ai/src/app/get-trail/page.tsx`
- `/Users/prasoonpathak/Documents/lev.ai/src/app/get-lev/page.tsx` (legacy redirect)
- `/Users/prasoonpathak/Documents/lev.ai/src/app/book-demo/page.tsx`
- `/Users/prasoonpathak/Documents/lev.ai/src/components/landing-page.tsx`
- `/Users/prasoonpathak/Documents/lev.ai/src/components/book-demo-page.tsx`
- `/Users/prasoonpathak/Documents/lev.ai/src/components/brand-mark.tsx`
- `/Users/prasoonpathak/Documents/lev.ai/src/lib/site-config.ts`
- `/Users/prasoonpathak/Documents/lev.ai/src/app/globals.css`
