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
- Recruiter-configurable job requirements, required/preferred qualification type, critical requirement flags, and per-job scoring rubrics
- Action Center with prioritized recruiter tasks and recent activity
- Job-specific ranked candidate comparison
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

## Tech Stack

- Next.js App Router
- React and TypeScript
- Tailwind CSS
- Prisma ORM
- Amazon Aurora PostgreSQL
- Vercel
- Optional OpenRouter API
- `unpdf` serverless PDF text extraction

## Important Files

- `prisma/schema.prisma`: relational data model
- `prisma/seed.ts`: Northstar Labs sample workspace
- `src/app/actions.ts`: trusted server mutations
- `src/app/api/resume/parse/route.ts`: private PDF/TXT extraction route
- `src/lib/resume-extract.ts`: deterministic and optional OpenRouter structured extraction
- `src/lib/evaluations/*`: structured evaluation scoring, evidence, schemas, constants, rubric normalization, and persistence service
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
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openai/gpt-oss-120b:free
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_APP_NAME=RecruitIQ
OPENROUTER_SITE_URL=
```

- `DATABASE_URL` is required and should point to Amazon Aurora PostgreSQL in production.
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

For local PostgreSQL with Docker:

```bash
docker compose up -d postgres
```

## Vercel Deployment

1. Import the repository into Vercel.
2. Add the Aurora PostgreSQL connection string as `DATABASE_URL`.
3. Optionally configure the OpenRouter variables.
4. Apply the Prisma schema to the production database.
5. Seed the sample workspace only when a populated evaluation environment is desired.

Use Prisma migrations for production changes:

```bash
npx prisma migrate deploy
```

This repository includes a baseline migration for the schema that existed before structured evaluations. Existing non-empty databases created with `prisma db push` should mark that baseline as applied once, then deploy later additive migrations.

Use `prisma db push` only for disposable local experiments.

## Demo Walkthrough

1. Open `/quick-start` for the guided product flow.
2. Review the dashboard metrics and prioritized Action Center.
3. Create a job with structured requirements and a 100-point scoring rubric, or inspect the existing Northstar Labs roles.
4. Upload a PDF or TXT resume from `/candidates`, extract structured details, and edit the profile before saving.
5. Open the saved candidate and review the concise summary, education, experience, projects, and raw resume disclosure.
6. Generate Recruiter Copilot analysis.
7. Show the deterministic fit score, structured evaluation breakdown, grounded resume evidence, risks, suggested next step, interview kit, and analysis source badge.
8. Use `/compare` to rank applicants for a selected job.
9. Move a candidate in `/pipeline` and finish with `/analytics`.
10. Open `/architecture` to explain Vercel, Server Actions, Prisma, and Amazon Aurora PostgreSQL.

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

- Authentication and organization permissions
- Interviewer scorecards and collaborative feedback
- Email and calendar integrations
- Durable resume storage when retention is required
- Amazon Bedrock provider support
- Candidate score history, configurable evaluation rubrics, and stale evaluation warnings
- Billing and plan management after product validation

## Known Limitations

- Authentication and organization-level access control are not implemented yet.
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
