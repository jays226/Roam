# Roam

Roam helps a group get from “I'm down” to a trip everyone has committed to. It includes trip creation and invites, commitments and deposits, shared planning, crew, chat, money tracking, activity, trip photos, and a responsive trip workspace. The customer-journey redesign is being delivered in phases; see the migration and current setup notes below.

## Setup

1. Create a [Supabase project](https://supabase.com/dashboard).
2. In Supabase SQL Editor, run `supabase/migrations/0001_roam.sql` through `supabase/migrations/0007_explore_sample_templates.sql` in numeric order. Migrations `0004`–`0006` add journey fields, public trip templates and points, and scheduled in-app reminders. Migration `0007` seeds ten fictional public Explore examples; it is safe to rerun and marks its source trips as demos. Migrations are additive and preserve existing trip data.
3. Use Node.js 22 (`.nvmrc` pins the runtime). Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_APP_URL`, `SUPABASE_SECRET_KEY`, `TEAM_DASHBOARD_PASSWORD`, and `CRON_SECRET`. `UNSPLASH_ACCESS_KEY` and `PEXELS_API_KEY` are optional; without them the UI uses gradient fallbacks. The Supabase secret key must stay server-side.
4. Install dependencies with `npm install`.
5. Start locally with `npm run dev`, then open `http://localhost:3000` on a phone or use the browser's device preview.
6. Deploy the repo to Vercel, add the same environment variables in Project Settings (set `NEXT_PUBLIC_APP_URL` to the deployed URL), and deploy. Vercel runs the configured daily auto-out and reminder cron using `CRON_SECRET`. Reminder delivery is currently in-app and queued for the team poke workflow; automated SMS/push delivery is not enabled.

## Core flow

- Open `/`, tap **Start a trip**, complete the organizer details, then copy the invite URL from the trip page.
- Open the invite on another device, join with first name, last name, and US phone number, then choose **I'm in** or **Can't make it**.
- The organizer can set Venmo/Cash App details in Supabase for a trip, review sent deposits, and confirm them.
- Sign in later at `/login` with your phone and first name. `/trips` lists all trips linked to your profile; `/profile` edits your name and origin airport.
- Open a trip's Plan board to shortlist, suggest, vote, record availability, build an itinerary, chat, request booking help, and track shared expenses.
- Use the trip tabs for Overview, Plan, Crew, Money, and Chat. Explore templates are public; publishing previews remove private names, phone numbers, dates, confirmations, and exact costs.
- During a trip, Overview switches to Today. Admins can preview Today mode before departure. Afterward, Money shows suggested settlements from shared expenses.
- In Explore, try **Use this trip** to copy editable blocks to a new trip. For copied plans, a 1–5 rating appears once the new trip ends.
- Every implemented core action is written to `events`.

## Demo seed

After applying the migrations, run `npm run seed:demo`. It creates or refreshes a clearly labeled fake **Demo – Tulum Spring Break** trip at `/t/demo-tulum-2027`. Demo trips are excluded from team demand metrics.

The first organizer's name and phone are collected during trip setup. Sign-in asks for phone and first name and uses a long-lived httpOnly session cookie. Phone ownership is not verified in this MVP; replace this with SMS OTP before public launch.

## Data and privacy

All database operations use server routes and the Supabase secret key. Phone numbers are stored in E.164 and must only be rendered to members of the same trip. Do not add the secret key to any `NEXT_PUBLIC_` variable. Turn on Supabase backups before using real trip data.

## Architecture

- Next.js App Router + TypeScript + Tailwind
- Supabase Postgres via server-only route handlers
- Manual payment confirmation; no funds are collected by Roam
- PWA manifest and install metadata
- `AuthProvider`/SMS OTP, Stripe Connect, automated notification, and booking integrations remain future seams

## Journey flow smoke check

On a phone-sized browser (375px), check: landing → create a multi-city trip → invite and join on another device → commit and record a deposit → move a block on the Trip Board → add travel → publish to Explore → use the template while logged out → open the resulting trip → preview Today mode as an admin. Enable reduced motion in the device accessibility settings and check the landing and commit confirmation again.
