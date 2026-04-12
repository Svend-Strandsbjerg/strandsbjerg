# Fuld kodegennemgang – Strandsbjerg repo

_Dato: 12. april 2026 (UTC)_

## Metode

Denne gennemgang er lavet som en samlet statisk review af hele repoets struktur (`src/`, `prisma/`, `docs/`, konfiguration), suppleret med lint/build/typecheck for at finde både kodekvalitetsproblemer, robusthedsrisici og driftssvagheder.

Kørte checks:

- `npm run lint` ✅
- `npx tsc --noEmit` ✅
- `npm run build` ⚠️ (fejlede pga. manglende miljøvariabler i miljøet, se fund #4)

---

## Overordnet vurdering

Projektet er velstruktureret og moderne (Next.js App Router + Prisma + Auth.js), med gode adskillelser mellem domænelogik (`lib`), server actions (`app/**/actions.ts`) og præsentationskomponenter. Der er også tydelige security-intentioner (private base paths, rolle- og approval-kontrol, token-baseret deling).

De vigtigste udfordringer ligger i:

1. driftssikkerhed i distribuerede miljøer (rate limiting),
2. input- og dataintegritet ved stemmeflow,
3. host header/origin trust i email links,
4. miljøvalidering koblet til global layout (byg/preview-friktion),
5. manglende DB-niveau constraints, hvor regler i dag kun håndhæves i applikationskode.

---

## Prioriterede fund

## 1) In-memory rate limiting bryder i multi-instance/serverless drift

**Alvor:** Høj  
**Hvorfor det er et problem:** Rate limiting gemmes i en lokal `Map`, som kun gælder i den enkelte process. På Vercel/auto-scaling/serverless vil requests fordeles på flere instanser, så limit kan omgås.  
**Kode:** `src/lib/rate-limit.ts`

**Anbefaling:** Flyt rate limiting til delt state (fx Redis/Upstash) med atomiske increment + TTL. Indfør også standardiseret response med `retryAfterMs` i alle actions.

---

## 2) Mulig host-header/origin manipulation i invite/result email links

**Alvor:** Høj  
**Hvorfor det er et problem:** `inferOrigin()` bygger URL ud fra `x-forwarded-host`/`host` uden allowlist. Hvis upstream/proxy-konfiguration ikke er stram, kan links i emails pege på forkert domæne (phishing/open redirect-lignende effekt).  
**Kode:** `src/app/disc/company/actions.ts`

**Anbefaling:** Brug en eksplicit `APP_BASE_URL` fra env som primær kilde. Tillad kun fallback til headers i development, og valider host mod allowlist.

---

## 3) Dataintegritetsfejl i stemmeflow: valg valideres ikke mod event

**Alvor:** Høj  
**Hvorfor det er et problem:** `voteForEvent` sletter stemmer for et event, men opretter nye stemmer på alle indsendte `dateOptionIds` uden at verificere at de faktisk tilhører `eventId`. En manipuleret request kan derfor stemme på datoer fra andre events.  
**Kode:** `src/app/x7k2p9q4v1m8/actions.ts`

**Anbefaling:** Slå tilladte option IDs op for `eventId`, intersect med input, afvis mismatch, og skriv kun validerede IDs.

---

## 4) Miljøvalidering i global layout giver build/prerender-friktion

**Alvor:** Mellem  
**Hvorfor det er et problem:** `validateEnvironment()` kaldes i `RootLayout`, hvilket gør at selv sider som `/_not-found` fejler ved build uden komplette produktions-ENV. Det rammer CI, preview builds og lokal UX hårdt.  
**Kode:** `src/app/layout.tsx`, `src/lib/env-validation.ts`

**Anbefaling:** Flyt validering til startup/server entrypoint eller feature-specifikke server paths. Opdel i “hard required in prod” vs. “required for DISC/email features”.

---

## 5) Race condition: duplicate aktive invites kan opstå

**Alvor:** Mellem  
**Hvorfor det er et problem:** Tjek for eksisterende aktiv invite sker i app-lag før create. To samtidige requests kan passere checket og begge oprette aktive invites for samme company/email.  
**Kode:** `src/app/disc/company/actions.ts`, `prisma/schema.prisma`

**Anbefaling:** Tilføj DB-beskyttelse:

- enten partial unique index i Postgres for aktive invites (`status='ACTIVE'` og evt. `expiresAt > now()` håndteres i job/rotation),
- eller introducer “open invite” entitet med entydig nøgle pr. company+email.

---

## 6) Manglende transaktion omkring “replace vote set”

**Alvor:** Mellem  
**Hvorfor det er et problem:** Delete + create køres separat. Fejler `createMany`, mister brugeren sine stemmer. Konkurrerende submits kan give inkonsistent sluttilstand.  
**Kode:** `src/app/x7k2p9q4v1m8/actions.ts`

**Anbefaling:** Indkapsl delete/create i `prisma.$transaction` og returnér tydelig fejlstatus til UI ved rollback.

---

## 7) Access control er stærk, men afhænger af obfuskerede path-navne

**Alvor:** Lav/Mellem  
**Hvorfor det er et problem:** Private områder er godt beskyttet via middleware + roller, men navngivning (`/x7k2p9q4v1m8`, `/m4z8r2q9t7y1`) kan gøre drift/vedligehold vanskeligere og er ikke en egentlig sikkerhedsmekanisme.  
**Kode:** `src/lib/private-routes.ts`, `middleware.ts`

**Anbefaling:** Behold auth-checks som primær sikkerhed, men overvej semantiske ruter + eksplicit policy tests.

---

## Konkrete forbedringsspor (implementerbar rækkefølge)

1. **Sikkerhed og integritet først:** Fund #2 + #3.  
2. **Robusthed i drift:** Fund #1 + #6.  
3. **Datakonsistens i DB-lag:** Fund #5.  
4. **Developer Experience/CI:** Fund #4.  
5. **Vedligeholdbarhed:** Fund #7.

---

## Codex-prompt (klar til copy/paste)

```text
Du arbejder i et Next.js 15 + Prisma + Auth.js repo.

Mål: Implementér forbedringerne nedenfor med produktion-klar kvalitet, inklusive tests og migrationer.

Krav til levering:
1) Lav små, fokuserede commits per forbedringsområde.
2) Bevar eksisterende funktionalitet/UI.
3) Tilføj/udvid tests for alle ændringer.
4) Beskriv tradeoffs i PR-beskrivelsen.
5) Kør lint + typecheck + tests og rapportér output.

Forbedringer der SKAL implementeres:
A. Rate limiting
- Erstat in-memory Map rate limiter med delt backend (fx Redis/Upstash).
- Bevar samme API-kontrakt (`ok`, `retryAfterMs`) eller introducér en kompatibel adapter.
- Sikr atomiske increments og TTL.

B. Origin-sikkerhed i email links
- Fjern implicit trust af `x-forwarded-host`/`host` til produktionslinks.
- Introducér `APP_BASE_URL` env som primær kilde.
- Tillad kun header-fallback i development.
- Valider host mod allowlist hvis fallback bruges.

C. Vote flow integritet
- I vote action: verificér at alle `dateOptionIds` tilhører det indsendte `eventId`.
- Afvis request ved mismatch med tydelig fejl.
- Udfør delete+create i en enkelt DB-transaction.

D. Invite race condition
- Tilføj DB-niveau beskyttelse mod flere aktive invites for samme `companyId + candidateEmail`.
- Lav Prisma migration (evt. rå SQL partial index hvis nødvendigt).
- Opdatér server action så constraint-fejl håndteres brugervenligt.

E. Environment validation refactor
- Fjern global hard-fail i RootLayout.
- Flyt env-validering til relevante server entrypoints/feature boundaries.
- Indfør tydelig opdeling mellem:
  - absolut nødvendige env vars for app boot
  - feature-specifikke env vars (DISC/email)

F. Dokumentation
- Opdatér README med nye env vars, rate-limit backend setup og driftsovervejelser.

Outputformat:
- Vis ændrede filer.
- Vis migrations SQL.
- Vis testændringer og testresultater.
- Forklar kort hvorfor hver ændring reducerer risiko.
```

---

## Afsluttende note

Hvis du vil, kan næste iteration være en **hands-on patch-plan**, hvor hvert fund omsættes til konkrete filændringer (med kodeforslag pr. fil), så Codex kan køre 1:1 uden yderligere afklaringer.
