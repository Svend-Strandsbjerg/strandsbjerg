# Beta readiness checklist (external company testing)

Use this checklist when onboarding the first 1–3 real companies.

## 1) Create a company user

1. Create the user account (normal signup/login flow).
2. In Prisma Studio, set:
   - `User.approvalStatus = APPROVED`
   - `User.role = USER` (admin role is not required for recruiter flow)
3. Add company access in `CompanyMembership`:
   - `userId`: the company user
   - `companyId`: the target company
   - `role`: `COMPANY_ADMIN` or `COMPANY_RECRUITER`
4. Confirm the user can open `/disc/company`.

## 2) Create first invite

1. Login as the company user.
2. Open `/disc/company`.
3. Fill candidate name/email + expiry days.
4. Click **Create invite**.
5. Confirm success message: **Invite created** (or **Invite created and email sent**).

## 3) Send invite

- If **Send invite email to candidate** is checked, verify success message confirms email sent.
- Otherwise click **Copy link** and send the invite URL manually.

## 4) Candidate experience (what they will see)

1. Candidate opens `/disc/invite/{token}`.
2. Candidate starts and completes the DISC questionnaire.
3. Candidate sees completion state and can open a shared result once available.

## 5) View results (company side)

1. Return to `/disc/company`.
2. In **Candidates**, status should change to **completed** with **Result ready**.
3. Click **Open result** to review.
4. Optionally click **Send result email** or download PDF from result page.

## 6) First-usage markers to watch in server logs

- `disc_beta_first_invite_created`
- `disc_beta_first_completion`
- `disc_beta_first_pdf_download`

These markers provide minimal beta rollout observability without adding analytics tooling.
