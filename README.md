# Lev Website pre live 

M lev pre live:

- Landing page with problem-first narrative and motion sections
- `/book-demo` page with Cal.com embed
- Founder card with LinkedIn icon CTA
- Responsive design + reduced-motion support

## Stack

- Next.js (App Router + TypeScript)
- Tailwind CSS
- Framer Motion

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create your env file:

```bash
cp .env.example .env.local
```

3. Fill these values in `.env.local`:

```bash
NEXT_PUBLIC_CALCOM_30MIN_URL=https://cal.com/<your-handle>/30min
NEXT_PUBLIC_CALCOM_15MIN_URL=https://cal.com/<your-handle>/15min
NEXT_PUBLIC_FOUNDER_LINKEDIN_URL=https://www.linkedin.com/in/prasoonpathak
```

4. Start development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Main Files

- `src/app/page.tsx`: landing page route
- `src/app/book-demo/page.tsx`: booking route
- `src/components/landing-page.tsx`: full landing UI and section animations
- `src/components/book-demo-page.tsx`: booking UI and Cal.com embed
- `src/lib/site-config.ts`: config for booking/LinkedIn links

## Production Build

```bash
npm run lint
npm run build
npm run start
```

## Deploy

Deploy on Vercel:

1. Push this repository to GitHub.
2. Import project into Vercel.
3. Add the same `NEXT_PUBLIC_*` environment variables in Vercel Project Settings.
4. Deploy.
