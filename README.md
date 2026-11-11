# Roam

Roam helps a group get from “I'm down” to a trip everyone has committed to. This repo currently implements the Phase 1 foundation: trip creation, invite joining, commitment, manual deposit status, event logging, and scheduled auto-out. Later phases from the product brief are not implemented yet.

## Setup

1. Create a [Supabase project](https://supabase.com/dashboard).
2. In Supabase SQL Editor, run `supabase/migrations/0001_roam.sql`, `supabase/migrations/0002_planning_and_accounts.sql`, and `supabase/migrations/0003_trip_day_cities.sql` in order.
3. Use Node.js 22 (`.nvmrc` pins the runtime). Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_APP_URL`, `SUPABASE_SECRET_KEY`, `TEAM_DASHBOARD_PASSWORD`, and `CRON_SECRET`. The secret key must stay server-side.
4. Install dependencies with `npm install`.
5. Start locally with `npm run dev`, then open `http://localhost:3000` on a phone or use the browser's device preview.
6. Deploy the repo to Vercel, add the same environment variables in Project Settings (set `NEXT_PUBLIC_APP_URL` to the deployed URL), and deploy. Vercel runs the configured daily auto-out cron using `CRON_SECRET`.

## Core flow

- Open `/`, tap **Start a trip**, complete the organizer details, then copy the invite URL from the trip page.
- Open the invite on another device, join with first name, last name, and US phone number, then choose **I'm in** or **Can't make it**.
- The organizer can set Venmo/Cash App details in Supabase for a trip, review sent deposits, and confirm them.
- Sign in later at `/login` with your phone and first name. `/trips` lists all trips linked to your profile; `/profile` edits your name and origin airport.
- Open a trip's Plan board to shortlist, suggest, vote, record availability, build an itinerary, chat, request booking help, and track shared expenses.
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
