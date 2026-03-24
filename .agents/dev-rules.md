# Logling Dev Rules

## Architecture
- **Next.js 14 App Router**: all routes live in `src/app/`
- **Feature-based**: domain logic lives in `src/features/{feature}/`
- **No BullMQ or Redis**: use simple Next.js async API routes for background processing (create DB record → return → process in background)
- **Migration tool**: `supabase/migrations/*.ts` files executed with `npx tsx`

## Code Rules
1. **TypeScript strict mode**: NO `any` unless commented with reason
2. **Server Components by default**: only add `'use client'` if needed (events, hooks, animations)
3. **Shared types**: always define in `src/types/index.ts`
4. **Supabase Admin Client**: only in API routes (server-side), NEVER in client components
5. **Environment Variables**: never hardcode keys; use `process.env.VARIABLE_NAME`
6. **Path alias**: always use `@/*` (e.g., `@/lib/supabase`) not relative imports for `src/` files

## Styling Rules
1. **Tailwind CSS v4**: uses `@theme` CSS variables in `globals.css`; do not add arbitrary hex colors unless truly needed
2. **Design tokens**: use semantic color names (`surface`, `primary-container`, `outline`) NOT `#131313` directly where possible
3. **Animations**: use `motion/react` (Framer Motion) for all transitions
4. **No inline styles**: never use the `style={}` prop unless dynamically calculated

## Security Rules (from Prompt.md)
1. **Gemini system prompt**: always include the full Logling Security Protocol from `document/Prompt.md`
2. **Diff masking**: before sending any Git diff to Gemini, run through a masking function that redacts passwords/secrets/API keys
3. **Access Token**: GitHub access token must NOT be stored in plain text; encrypt before storing in DB
4. **Rate limiting**: each user can trigger maximum 50 analyses per day (enforce at API level)

## Naming Conventions
- **Files**: camelCase for utilities, PascalCase for React components
- **DB columns**: `snake_case`
- **TypeScript types**: PascalCase
- **API routes**: `kebab-case` folder names (e.g., `/api/analyze-commit/route.ts`)
