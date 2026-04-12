# DISC staging manual acceptance checklist

Use this checklist in a staging environment with **real** database, DISC engine, and email provider credentials.

## 1) Required environment variables

The app validates required runtime env vars at startup (`validateEnvironment`). Ensure these are set before launching staging:

- `DATABASE_URL`
- `DISC_ENGINE_BASE_URL`
- `DISC_ENGINE_API_KEY`
- `DISC_ENGINE_ASSESSMENT_VERSION_ID`
- `RESEND_API_KEY`
- One of:
  - `DISC_EMAIL_FROM`, or
  - `RESEND_FROM_EMAIL`

Related auth variables (for login flows, if used in your staging run):

- `AUTH_SECRET`
- Optional OAuth/magic-link providers as needed (`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_RESEND_KEY`, `AUTH_EMAIL_FROM`)

## 2) Pre-flight checks

- [ ] `npm run build` succeeds in staging config.
- [ ] Database migrations are applied.
- [ ] At least one recruiter/admin user exists and has `COMPANY_ADMIN` or `COMPANY_RECRUITER` membership.
- [ ] DISC engine endpoint is reachable from staging runtime.
- [ ] Resend sender domain and from address are verified.

## 3) Recruiter flow

### A. Create invite
- [ ] Log in as recruiter/admin.
- [ ] Open `/disc/company`.
- [ ] Select a company and create invite with candidate name/email.
- [ ] Confirm success message appears.
- [ ] Confirm invite row appears in candidates list.

### B. Send invite email / copy invite
- [ ] Create invite with “Send invite email to candidate” enabled and verify success.
- [ ] Create invite without email and use “Copy link”; paste the link and verify URL format `/disc/invite/{token}`.
- [ ] Confirm duplicate-active-invite protection (same company + same candidate email) returns a friendly error.

## 4) Candidate flow

### C. Open invite
- [ ] Open copied/emailed invite link.
- [ ] Confirm candidate invite page loads for active invite.

### D. Start assessment
- [ ] Click “Start DISC session”.
- [ ] Confirm session starts and session ID appears.

### E. Submit assessment
- [ ] Submit valid responses JSON.
- [ ] Confirm success message is shown.
- [ ] Confirm repeated submit attempts are blocked or handled safely.

### F. View result + PDF
- [ ] Open generated result link `/disc/result/{token}`.
- [ ] Confirm result presentation loads.
- [ ] Click “Download PDF” and confirm a PDF is returned from `/disc/result/{token}/pdf`.

## 5) Recruiter post-submission verification

### G. Completed assessment visible
- [ ] Return to `/disc/company` as recruiter.
- [ ] Confirm candidate appears as completed.

### H. Open result
- [ ] Open candidate result from recruiter workflow and confirm report renders.

### I. Resend actions
- [ ] Trigger “resend invite email” (for active invite).
- [ ] Trigger “resend result email” (for submitted assessment).
- [ ] Confirm friendly success/error messages appear.

## 6) Troubleshooting (common runtime issues)

### Missing env vars
Symptoms:
- App fails early on startup/build with a missing env var error.

Actions:
- Verify all required vars listed above are set in staging runtime.
- Confirm `DISC_EMAIL_FROM` or `RESEND_FROM_EMAIL` is set (at least one is mandatory).

### Database connection issues
Symptoms:
- Startup/build/runtime errors referencing Prisma/database connection.
- Company/invite/result queries fail.

Actions:
- Verify `DATABASE_URL` is correct and reachable from staging network.
- Verify database user permissions and SSL mode.
- Ensure migrations are applied.

### DISC engine unavailable
Symptoms:
- Start/submit assessment fails with user-facing error.
- Server logs show DISC engine request failure/non-OK events.

Actions:
- Verify `DISC_ENGINE_BASE_URL`, `DISC_ENGINE_API_KEY`, and `DISC_ENGINE_ASSESSMENT_VERSION_ID`.
- Check DISC engine uptime and network allowlists.

### Email delivery issues
Symptoms:
- Invite/result email actions fail with user-facing error.
- Server logs include email delivery failure events.

Actions:
- Verify `RESEND_API_KEY` and sender (`DISC_EMAIL_FROM` or `RESEND_FROM_EMAIL`).
- Verify sender domain in Resend and inspect provider logs for bounce/rejection details.

## 7) Acceptance criteria

Mark staging as accepted only when all are true:

- [ ] Production build succeeds.
- [ ] End-to-end recruiter + candidate + result + PDF flows are verified.
- [ ] Resend actions work.
- [ ] External failure paths show user-friendly messages and useful server logs.
