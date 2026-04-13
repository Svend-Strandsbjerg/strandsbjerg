# Strandsbjerg personal site + family planning module

Production-style Next.js foundation for a professional personal brand with a protected family event voting MVP.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Prisma + PostgreSQL (Vercel-friendly)
- Auth.js (Google + magic link via Resend)
- Ready for Vercel deployment

## Features

### Public site

- `/` Home: professional hero, strengths, focused CTA
- `/professional`: architecture-first professional presentation
- `/contact`: minimalist contact page + form UI placeholders

### Private family module

- `/familie` overview (protected)
- create event with multiple candidate date options
- `/familie/events/[id]` detail + multi-select voting
- aggregate vote counts + voter visibility by date

### DISC module

- personal DISC assessment flow
- company invite flow for recruiters/admins
- token-based result sharing + PDF download
- email sending for invites and result sharing

## Local setup

1. Install dependencies

```bash
npm install
```

2. Copy environment variables

```bash
cp .env.example .env
```

3. Configure a PostgreSQL database in `.env`

4. Generate Prisma client + run migrations

```bash
npm run prisma:generate
npm run prisma:migrate
```

5. (Optional) Seed sample data

```bash
npm run prisma:seed
```

6. Start development server

```bash
npm run dev
```

## Environment variables

### Core required (startup validated)

The app fails fast if these are missing:

- `DATABASE_URL`
- `DISC_ENGINE_BASE_URL`
- `DISC_ENGINE_API_KEY`
- `DISC_ENGINE_ASSESSMENT_VERSION_ID`
- `RESEND_API_KEY`
- one of:
  - `DISC_EMAIL_FROM`, or
  - `RESEND_FROM_EMAIL`

### Auth-related

- `AUTH_SECRET`
- optional provider vars depending on login methods used:
  - `AUTH_GOOGLE_ID`
  - `AUTH_GOOGLE_SECRET`
  - `AUTH_RESEND_KEY`
  - `AUTH_EMAIL_FROM`

## Staging acceptance testing (DISC)

For a full recruiter/candidate/manual acceptance checklist, see:

- [`docs/staging-disc-manual-testing.md`](docs/staging-disc-manual-testing.md)
- [`docs/beta-readiness-checklist.md`](docs/beta-readiness-checklist.md)

This includes:

- exact invite/start/submit/result/PDF/resend manual test flow
- pre-flight staging checks
- troubleshooting for env/database/DISC engine/email issues

## Authentication setup

- Configure Google OAuth values (`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`) and Auth.js secret.
- Configure Resend (`AUTH_RESEND_KEY`, `AUTH_EMAIL_FROM`) for magic links.
- `/familie` routes are protected through `middleware.ts`.

### Google OAuth troubleshooting (`401: invalid_client`)

- Ensure `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are set in the active environment (local `.env` or hosting platform variables).
- In Google Cloud Console, verify the OAuth client still exists and is of type **Web application**.
- Add the correct **Authorized redirect URI**:
  - Local: `http://localhost:3000/api/auth/callback/google`
  - Production: `https://<your-domain>/api/auth/callback/google`

## Vercel deployment notes

1. Connect repository in Vercel.
2. Set all environment variables from `.env.example`.
3. Use a managed PostgreSQL database (e.g., Vercel Postgres/Neon/Supabase).
4. Build command is already configured through `npm run build`.

## Data model overview

- `User` with global `role` (`ADMIN`/`USER`) for platform access control.
- `FamilyEvent` created by a user.
- `EventDateOption` entries per event.
- `Vote` mapping users to one or more date options.

## Scope

Version 1 intentionally keeps the family utility simple while prioritizing professional identity, maintainability, and clean architecture boundaries.
