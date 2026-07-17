# RecruitIQ

RecruitIQ is an AI-powered applicant tracking system for lean hiring teams. It brings jobs, resume intake, candidate ranking, Recruiter Copilot analysis, interview preparation, pipeline management, and hiring analytics into one production-oriented workspace.

## H0 Hackathon

- Track: **Track 2 - Monetizable B2B app**
- Deployment: **Vercel**
- AWS database: **Amazon Aurora PostgreSQL**
- ORM: **Prisma**

## Elevator Pitch

Small recruiting teams often run hiring from spreadsheets, inboxes, and inconsistent notes. RecruitIQ gives them a focused ATS that parses resumes, explains candidate fit, prioritizes next actions, and keeps every hiring decision connected to structured PostgreSQL data.

## Product Value

- **Problem:** Manual resume review and fragmented tools make hiring slow and inconsistent.
- **Solution:** A unified workflow for role creation, resume intake, AI-assisted evaluation, comparison, pipeline decisions, and analytics.
- **Customer:** Startups, small businesses, lean recruiting teams, and student organizations.
- **Monetization:** SaaS subscription per organization or recruiter seat, with expansion tiers for automation and analytics.

## Features

- Job creation and active hiring portfolio
- Two-step PDF/TXT resume intake with editable structured field extraction
- Deterministic extraction for contact details, links, education, recent role, skills, experience, projects, and concise summary
- Optional OpenRouter enhancement for structured resume summaries with deterministic fallback
- Manual resume text and manual profile entry when extraction is unavailable
- Candidate profiles with skills, notes, stage, and resume evidence
- Recruiter Copilot with deterministic fit score, AI-enhanced executive summary, role match, strengths, risks, next step, and interview kit
- OpenRouter analysis with deterministic fallback when no key is configured or the provider is unavailable
- Versioned structured evaluations with category scores, requirement-level results, and grounded resume evidence
- Versioned interview scorecards generated from evaluation snapshots, with requirement-linked questions, 1-5 ratings, interviewer signals, notes, and observed evidence
- Resume-to-interview validation that highlights confirmed, weakened, and unresolved screening signals without changing the deterministic fit score
- Recruiter-configurable job requirements, required/preferred qualification type, critical requirement flags, and per-job scoring rubrics
- Action Center with prioritized recruiter tasks and recent activity
- Job-specific ranked candidate comparison
- Application-specific pipeline stages, append-only status history, and multi-job candidate workflows
- Kanban-style pipeline updates
- Hiring analytics for stages, fit scores, job status, and top skills
- Quick Start workflow and screenshot-ready architecture page
- Realistic sample workspace with 4 jobs and 12 candidates

## Architecture

```text
Recruiter
   -> Vercel / Next.js App Router
   -> Next.js Server Actions and Route Handlers
   -> Prisma ORM
   -> Amazon Aurora PostgreSQL

Optional server-side analysis:
Server Action -> OpenRouter API for summaries, strengths/gaps, and interview kits
              -> deterministic fallback when unavailable
```

### Database Architecture

RecruitIQ uses Amazon Aurora PostgreSQL as its production database. Prisma maps organizations, users, jobs, candidates, applications, job requirements, candidate evaluations, requirement results, resume evidence, legacy resume analyses, interview kits, and activity logs into relational PostgreSQL models. Aurora is a strong fit because hiring workflows require reliable transactions, relational integrity, auditable activity, and scalable querying across candidates and roles.

The Prisma schema uses PostgreSQL-native features and remains portable to other PostgreSQL-compatible environments for local development or migration work.

### Evaluation Architecture

RecruitIQ now writes versioned `CandidateEvaluation` records alongside the existing `ResumeAnalysis` and `InterviewKit` rows. The legacy rows keep the current UI stable, while the structured evaluation tables provide the foundation for an explainable scoring engine.

- `JobRequirement`: normalized requirements derived from a job's requirement text, including required/preferred type, category, weight, keywords, and order.
- `JobEvaluationRubric`: per-job category weights for required skills, experience, projects, education, preferred qualifications, and domain alignment.
- `CandidateEvaluation`: one immutable evaluation run for one candidate and one job, with status, source, score, recommendation, scoring version, prompt version, model name, and error summary.
- `EvaluationCategoryScore`: category-level score breakdowns such as required skills, project alignment, education, domain alignment, and preferred qualifications.
- `RequirementResult`: matched, partial, or missing result for each evaluated job requirement.
- `EvaluationEvidence`: exact excerpts from stored resume text that support matched or partially matched requirements.
- `InterviewScorecard`: a versioned, explicit human-feedback record for one candidate/job/evaluation combination.
- `InterviewCriterion`: immutable requirement-linked interview prompts and evaluation guidance, including a requirement-text snapshot.
- `InterviewResponse`: optional 1-5 rating, interviewer signal, notes, and observed evidence for a single criterion.

The numerical score is deterministic. OpenRouter may improve the narrative summary, strengths, gaps, and interview kit, but it does not independently decide the final score or recommendation. If OpenRouter is missing, times out, returns invalid JSON, returns malformed schema output, or responds with a transient provider error, RecruitIQ falls back to deterministic analysis and keeps the workflow usable.

Scoring and prompt versions are centralized in `src/lib/evaluations/constants.ts` and persisted with each evaluation. Prior evaluation versions are retained; regenerating analysis creates a new evaluation instead of overwriting history.

### Structured Requirements and Rubrics

Recruiters create and edit structured requirements from the job UI. Each requirement has text, required/preferred type, category, weight, optional keywords, order, and an optional critical flag. Requirements removed from the current rubric are soft-deleted so historical `RequirementResult` rows remain explainable.

Category weights are configured per job and must total 100%. Defaults are:

- Required Skills: 30
- Relevant Experience: 25
- Project Alignment: 15
- Education: 10
- Preferred Qualifications: 10
- Domain Alignment: 10

Individual requirement weights are normalized inside their category. They decide relative importance within the category, not the total score budget.

Example:

```text
Required Skills category weight: 30

Requirements:
Python weight 3
PostgreSQL weight 2
AWS weight 1

Normalized contributions:
Python: 15
PostgreSQL: 10
AWS: 5

Candidate:
Python matched: 15
PostgreSQL partial: 5
AWS missing: 0

Required Skills score:
20 / 30
```

Required and preferred requirements are treated differently. Missing required qualifications receive stricter partial-credit behavior and clearer warnings. Preferred qualifications add value when found but are not treated as baseline failures when absent. A missing critical requirement lowers confidence and caps advancement-oriented recommendations to recruiter review; it does not force the score to zero.

Every `CandidateEvaluation` stores a `rubricSnapshot` containing category weights, requirement IDs, text, type, category, weights, keywords, critical flags, order, and scoring version. This makes older evaluations explainable even after a recruiter changes the job rubric. Candidate detail pages show a stale-evaluation warning when a candidate was evaluated before the job rubric was updated.

### Interview Scorecards

After an evaluation is complete, recruiters can generate a new interview scorecard. Each scorecard is tied to that evaluation and snapshots the relevant requirement text, screening result, prompt, and guidance. Generating another scorecard creates a new version rather than altering prior feedback.

Interviewers may record a rating, signal, notes, and observed evidence for any criterion. Blank criteria remain incomplete, and completed scorecards are retained as historical records. RecruitIQ classifies the human feedback as confirmed, weakened, or unresolved screening evidence. This is decision support only: interview feedback does not mutate the deterministic fit score, pipeline stage, or make a hiring decision automatically.

### Candidate Applications and Pipeline State

Candidate profiles are global records: contact details, resume text, skills, and notes belong to the person. Pipeline state belongs to the `Application` relationship between that candidate and a specific job. `Application.status` is the source of truth for pipeline views, dashboard metrics, analytics, comparison context, and stage changes.

`Candidate.status` remains only as a legacy compatibility field for existing records. RecruitIQ does not synchronize it after the application-aware migration.

```text
Candidate: Jane Doe

Applications:
Backend Engineer - Interview - Fit score: 84
Platform Engineer - Screened - Fit score: 76
Data Engineer - Rejected - Fit score: 61
```

Every application is created at `APPLIED` with an initial `ApplicationStatusHistory` row. Each stage update changes only that application and appends a history entry in the same transaction. Evaluations and interview scorecards remain scoped to their candidate/job pair.

## Tech Stack

- Next.js App Router
- React and TypeScript
- Tailwind CSS
- Prisma ORM
- Amazon Aurora PostgreSQL
- Vercel
- Optional OpenRouter API
- Clerk for authentication, sessions, user profiles, and organization membership
- `unpdf` serverless PDF text extraction

## Important Files

- `prisma/schema.prisma`: relational data model
- `prisma/seed.ts`: Northstar Labs sample workspace
- `src/app/actions.ts`: trusted server mutations
- `src/app/api/resume/parse/route.ts`: private PDF/TXT extraction route
- `src/lib/resume-extract.ts`: deterministic and optional OpenRouter structured extraction
- `src/lib/evaluations/*`: structured evaluation scoring, evidence, schemas, constants, rubric normalization, and persistence service
- `src/lib/interviews/scorecards.ts`: scorecard generation, response helpers, and versioning logic
- `src/lib/interviews/validation.ts`: resume-to-interview validation classification
- `src/components/InterviewScorecardPanel.tsx`: interviewer feedback and validation UI
- `src/lib/applications/*`: application stage schemas and application-aware metrics
- `src/components/AddApplicationForm.tsx`: attach an existing candidate to another job
- `src/lib/jobs/schemas.ts`: Zod validation for job fields, requirements, and rubrics
- `src/components/JobRubricForm.tsx`: structured job requirement and rubric editor
- `src/components/CandidateIntakeForm.tsx`: two-step editable resume intake
- `src/lib/ai.ts`: OpenRouter integration and deterministic fallback
- `src/app/(app)/dashboard/page.tsx`: metrics and Action Center
- `src/app/(app)/compare/page.tsx`: job-specific candidate prioritization
- `src/app/(app)/architecture/page.tsx`: in-product system architecture
- `src/app/(app)/quick-start/page.tsx`: guided product workflow

## Environment Variables

```bash
DATABASE_URL=""
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/clerk/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/clerk/sign-up
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openai/gpt-oss-120b:free
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_APP_NAME=RecruitIQ
OPENROUTER_SITE_URL=
```

- `DATABASE_URL` is required and should point to Amazon Aurora PostgreSQL in production.
- Clerk configuration is required for normal development and production. Only `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is browser-visible; `CLERK_SECRET_KEY` is server-only.
- `OPENROUTER_API_KEY` is optional and is only read by server-side code.
- OpenRouter is used server-side to improve candidate summaries, role match explanations, strengths, gaps, next steps, and interview kits.
- Fit scores remain explainable and deterministic based on skill and requirement matching.
- When OpenRouter is missing, times out, returns invalid JSON, or is unavailable, RecruitIQ uses deterministic candidate analysis.
- OpenRouter candidate analysis responses are validated with Zod before any AI-generated narrative fields are persisted.
- No resume files are stored or exposed publicly; only extracted text is saved to PostgreSQL.
- `/api/ai-status` is a diagnostic route. In production it returns only restricted configuration status and never returns secrets, model routing details, or provider URLs.

## Local Setup

```bash
npm install
cp .env.example .env
npm run db:generate
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

### Clerk Authentication and Organization Isolation

Clerk is the sole source of truth for authentication, sessions, sign-in/sign-up, social connections, active organizations, and organization roles. Configure Google and GitHub connections in the Clerk Dashboard; no provider-specific application code is required. `/clerk/sign-in` and `/clerk/sign-up` render Clerk's hosted components.

Prisma remains the source of truth for hiring data and internal foreign keys. On each authenticated workspace request, RecruitIQ derives `userId`, `orgId`, and organization role from Clerk, then idempotently mirrors the Clerk user and organization into Prisma using `User.clerkUserId` and `Organization.clerkOrganizationId`. Server Actions and data loaders derive the active organization from this context; they never accept organization IDs from the client for authorization.

The first signed-in user without an active Clerk organization is redirected to `/onboarding`, which uses Clerk's organization creation/selection UI. Clerk assigns the creator its organization admin role; the next workspace request mirrors that organization and user into Prisma. New workspaces begin empty.

Roles are intentionally small:

- `ADMIN`: full workspace management, including deletion.
- `RECRUITER`: create and manage jobs, candidates, applications, evaluations, and scorecards.
- `INTERVIEWER`: view context and submit interview feedback; cannot edit jobs, rubrics, candidates, or pipeline stages.

Clerk role mapping is server-side and least-privilege: `org:admin` -> `ADMIN`, `org:recruiter` -> `RECRUITER`, `org:interviewer` -> `INTERVIEWER`, and Clerk's default `org:member` -> `INTERVIEWER`. Unknown roles are denied rather than trusted.

### Existing Workspace Linking

Existing RecruitIQ organizations are never auto-matched by email or name. Before an existing workspace can be used through Clerk, link the known Prisma and Clerk IDs explicitly:

```bash
npx tsx scripts/link-clerk-identity.ts \
  --organization-id <prisma-org-id> \
  --clerk-organization-id <clerk-org-id> \
  --user-id <prisma-user-id> \
  --clerk-user-id <clerk-user-id>
```

The command refuses conflicting links. This preserves the existing organization, its hiring data, and internal attribution. Auth.js-era `Account`, `Session`, and `VerificationToken` tables are retained in PostgreSQL for data safety but are no longer represented in Prisma or used at runtime.

For local PostgreSQL with Docker:

```bash
docker compose up -d postgres
```

## Vercel Deployment

1. Import the repository into Vercel.
2. Add the Aurora PostgreSQL connection string as `DATABASE_URL`.
3. Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from the linked Clerk application, then configure approved production domains and social connections in Clerk.
4. Optionally configure the OpenRouter variables.
5. Apply the reviewed Prisma migration to the production database.
6. Seed the sample workspace only when a populated evaluation environment is desired.

Use Prisma migrations for production changes:

```bash
npx prisma migrate deploy
```

This repository includes a baseline migration for the schema that existed before structured evaluations. Existing non-empty databases created with `prisma db push` should mark that baseline as applied once, then deploy later additive migrations.

Use `prisma db push` only for disposable local experiments.

## Testing and Operations

Automated tests never use `DATABASE_URL`. Set `DATABASE_URL_TEST` to a disposable PostgreSQL database whose URL clearly identifies it as a test database. The reset script rejects URLs without `test` and rejects Neon and Amazon RDS hostnames.

```bash
npm run test:db:reset
npm run test:unit
npm run test:integration
npm run test:e2e
```

Integration tests use two organizations with fixed users, jobs, candidates, applications, and a scorecard. They verify foreign organization IDs resolve to no record and that the evaluation service rejects cross-organization input before persistence.

Playwright uses Clerk's official `@clerk/testing` helpers with a dedicated Clerk development instance. Configure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `E2E_CLERK_ADMIN_EMAIL`, `E2E_CLERK_INTERVIEWER_EMAIL`, `E2E_CLERK_ONBOARDING_EMAIL`, and matching Clerk organization/user IDs for the disposable database seed. The `clerk-e2e` CI job runs only when those test-only GitHub secrets are configured; normal CI never exposes production Clerk secrets.

GitHub Actions in `.github/workflows/ci.yml` runs Prisma generation and validation, migrations from an empty PostgreSQL 16 database, linting, unit tests, integration tests, and a build. The separate Clerk E2E job uses test-only secrets and Chromium Playwright. `npm run ci` runs the non-browser portion locally.

### Health and Deployment

- `GET /api/health` returns `{ "status": "ok" }` when the process is running.
- `GET /api/readiness` performs a minimal database query and returns `{ "status": "ready" }`, or a safe `503` response.

Structured server logs record authentication and authorization denials, readiness failures, evaluation outcomes, and OpenRouter failures using non-sensitive IDs and operation IDs. Resume text, interview notes, tokens, OAuth secrets, and raw provider payloads are not logged. Production data-load errors render a generic message rather than Prisma or configuration details.

Deployment sequence:

1. Configure `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and optional OpenRouter variables.
2. Add the Vercel production and preview domains to the Clerk application; enable Google and/or GitHub in Clerk when desired.
3. Run the reviewed migration with `npx prisma migrate deploy`.
4. Deploy the app, then check `/api/health`, `/api/readiness`, authenticated sign-in, and a small hiring workflow.
5. Roll back application code independently when needed. Use reviewed forward migrations rather than destructive database rollbacks.

Public routes: `/`, `/clerk/sign-in`, `/clerk/sign-up`, `/api/health`, and `/api/readiness`. Hiring pages and internal APIs require a Clerk session; workspace data additionally requires an active Clerk organization. The deterministic evaluation path remains active when OpenRouter is absent or fails.

```text
Browser -> Clerk session and active organization -> Clerk-to-Prisma identity mirror -> Server Action / Route Handler
-> authorization policy -> Prisma -> PostgreSQL

Authenticated recruiter -> candidate/job ownership verification -> deterministic evaluation
-> optional LLM narrative -> validated output -> transactional persistence -> evaluation history
```

## Demo Walkthrough

1. Open `/quick-start` for the guided product flow.
2. Review the dashboard metrics and prioritized Action Center.
3. Create a job with structured requirements and a 100-point scoring rubric, or inspect the existing Northstar Labs roles.
4. Upload a PDF or TXT resume from `/candidates`, extract structured details, and edit the profile before saving.
5. Open the saved candidate and review the concise summary, education, experience, projects, and raw resume disclosure.
6. Generate Recruiter Copilot analysis.
7. Generate an interview scorecard, capture interviewer evidence, and show how feedback confirms, weakens, or leaves screening signals unresolved.
8. Show the deterministic fit score, structured evaluation breakdown, grounded resume evidence, risks, suggested next step, interview kit, and analysis source badge.
9. Use `/compare` to rank applicants for a selected job.
10. Attach an existing candidate to a second job, then give each application an independent stage.
11. Filter `/pipeline` by job and verify every card represents a candidate plus a specific application.
12. Finish with `/analytics`, where total applications and stage counts are application-aware.
13. Open `/architecture` to explain Vercel, Server Actions, Prisma, and Amazon Aurora PostgreSQL.

## Challenges

- Supporting resume extraction without permanent object storage or public file URLs
- Keeping AI workflows reliable when external keys or providers are unavailable
- Presenting complex recruiting evidence in a compact interface
- Building a production database story that is easy to explain during judging

## What We Learned

- Recruiting data maps naturally to relational PostgreSQL models and transactions.
- Server Actions are effective for compact B2B workflows with trusted mutations.
- AI output becomes more useful when paired with evidence, risks, and a concrete next action.
- A deterministic fallback is essential for production reliability and live judging.

## Future Roadmap

- Role assignment and invitation workflows
- Email and calendar integrations
- Durable resume storage when retention is required
- Amazon Bedrock provider support
- Candidate score history, configurable evaluation rubrics, and stale evaluation warnings
- Billing and plan management after product validation

## Known Limitations

- Clerk browser flows require configured Clerk keys, enabled Clerk Organizations, and a disposable PostgreSQL database for local E2E execution.
- Candidate editing is not implemented yet.
- The current resume evidence UI is excerpt-based; it does not highlight text inside a rendered resume.
- PDF parsing works for text-based PDFs, not scanned image-only resumes.
- The legacy `ResumeAnalysis` and `InterviewKit` models remain for compatibility while the structured evaluation model is adopted.

## Security Notes

- `.env` and `.env*.local` are gitignored.
- `.env.example` contains placeholders only.
- OpenRouter keys are never exposed to client components.
- Resume parsing is size-limited, processed server-side, and not persisted as a file.
- Database access is initialized lazily so Vercel builds remain safe.

## Validation

```bash
npm run lint
npm run build
npm test
```
