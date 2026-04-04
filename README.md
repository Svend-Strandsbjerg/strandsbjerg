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

- `User` with `role` (`ADMIN`/`FAMILY`) for future role-based access.
- `FamilyEvent` created by a user.
- `EventDateOption` entries per event.
- `Vote` mapping users to one or more date options.

## Scope

Version 1 intentionally keeps the family utility simple while prioritizing professional identity, maintainability, and clean architecture boundaries.
