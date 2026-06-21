# RecruitIQ

RecruitIQ is a polished B2B AI-powered applicant tracking system built for the H0 Hackathon. It helps lean teams create roles, upload resumes, rank candidates, manage pipeline stages, and generate structured interview prep.

## Live Demo

- Live demo: `TODO: add Vercel URL`
- Local demo: `http://localhost:3000`
- Guided demo route: `/demo`
- Architecture proof route: `/architecture`

## Hackathon Track

H0 Hackathon Track 2: Monetizable B2B app.

## Elevator Pitch

RecruitIQ is an AI-powered ATS for lean teams that turns resume review into a structured, monetizable hiring workflow: post roles, upload resumes, score candidates, generate interview prep, compare ranked applicants, and manage the pipeline in one place.

## Problem

Small businesses, startups, and student organizations often hire from inboxes, spreadsheets, and inconsistent interview notes. That makes it hard to compare candidates fairly, preserve context, and move quickly.

## Solution

RecruitIQ provides a polished B2B recruiting workspace with jobs, candidates, resume parsing, AI fit analysis, interview kits, pipeline stages, comparison views, and analytics. It works with deterministic mock AI by default and can optionally call OpenRouter server-side.

## Database Architecture

- Required architecture: Amazon Aurora PostgreSQL-compatible PostgreSQL architecture
- Current deployed demo DB: Neon PostgreSQL
- Database engine: PostgreSQL
- Hackathon target: Amazon Aurora PostgreSQL
- ORM: Prisma
- Deployment: Vercel

The schema is PostgreSQL-first and uses standard Prisma models, enums, relations, arrays, and JSON metadata that are compatible with Aurora PostgreSQL.

### Database Proof Placeholders

- Vercel environment variable screenshot: `TODO: add screenshot showing DATABASE_URL configured`
- Neon/PostgreSQL database tables screenshot: `TODO: add screenshot showing Prisma-created tables`
- Later Aurora PostgreSQL screenshot if migrated: `TODO: add Aurora cluster/table screenshot`

## Demo Features

- Premium landing page for an AI-powered ATS for lean teams
- Dashboard metrics for open jobs, candidate volume, interviews, and average fit score
- Job creation and job cards
- Candidate creation with `.txt` resume upload, parsed text preview, and manual resume fallback
- Candidate profiles with AI fit score, summary, strengths, gaps, recommended stage, interview questions, notes, and status controls
- Optional OpenRouter analysis through `OPENROUTER_API_KEY`
- Deterministic mock AI fallback when no AI key is configured or the provider fails
- `/compare` page for ranked candidate comparison by selected job
- `/demo` page for judge walkthrough
- `/architecture` page for system and database proof
- Kanban-style pipeline with stage updates
- Analytics cards and CSS charts for stages, job status, fit score, and top skills

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- Neon PostgreSQL for the current development/demo database
- Amazon Aurora PostgreSQL-compatible target database
- Vercel deployment
- Optional OpenRouter AI analysis with deterministic fallback

## Architecture Summary

- Next.js App Router with TypeScript
- Tailwind CSS for UI
- Server Components for data-backed pages
- Server Actions for create/update/generate workflows
- Prisma ORM with PostgreSQL datasource
- Neon PostgreSQL for current demo deployment
- Aurora PostgreSQL-compatible schema and deployment path
- Client-side `.txt` parsing stores extracted resume text directly in Postgres
- Server-only OpenRouter integration with safe JSON schema output and deterministic fallback
- No authentication yet, by design, to keep the hackathon demo focused and easy to judge

Key files:

- `prisma/schema.prisma`: database models
- `prisma/seed.ts`: demo data
- `src/lib/ai.ts`: deterministic mock AI plus optional OpenRouter integration
- `src/app/actions.ts`: Server Actions
- `src/app/(app)/compare/page.tsx`: candidate comparison demo
- `src/app/(app)/demo/page.tsx`: guided judge walkthrough
- `src/app/(app)/architecture/page.tsx`: architecture and database proof page
- `src/components/ResumeUploadField.tsx`: resume upload and preview

## Environment Variables

```bash
DATABASE_URL=""
OPENROUTER_API_KEY=
OPENROUTER_MODEL=
OPENROUTER_BASE_URL=
NEXT_PUBLIC_APP_URL=
```

`DATABASE_URL` should point to Neon PostgreSQL for the current demo or Amazon Aurora PostgreSQL for the target AWS deployment. `OPENROUTER_API_KEY` is optional. If `OPENROUTER_MODEL` or `OPENROUTER_BASE_URL` are blank, the app uses safe server-side defaults.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

```bash
cp .env.example .env
```

3. Start a local PostgreSQL database if needed:

```bash
docker compose up -d postgres
```

4. Generate Prisma Client and push the schema:

```bash
npx prisma generate
npx prisma db push
```

5. Seed demo data:

```bash
npm run db:seed
```

6. Start the app:

```bash
npm run dev
```

## Demo Script

1. Open the landing page and describe RecruitIQ as an AI-powered ATS for lean teams.
2. Go to `/dashboard` to show hiring health and top candidates.
3. Go to `/candidates` and add a candidate with a `.txt` resume upload.
4. Open the candidate profile and click `Generate AI Analysis`.
5. Show fit score, strengths, gaps, recommended stage, and interview questions.
6. Go to `/compare`, select a job, and review ranked candidates with next actions.
7. Go to `/pipeline` and update a candidate stage.
8. Finish with `/analytics` to show hiring-stage and skill insights.

## Why Teams Would Pay

- Reduces manual screening time for small hiring teams
- Produces consistent interview prep from resume and job data
- Helps founders and operators compare candidates without building custom spreadsheets
- Keeps recruiting records queryable and auditable in PostgreSQL

## Challenges

- Keeping the demo reliable without requiring paid storage, auth, or external AI keys
- Making AI output feel useful while preserving deterministic fallback behavior
- Explaining the Aurora PostgreSQL target clearly while using Neon PostgreSQL for fast deployment

## What We Learned

- Recruiting data maps naturally to relational models: jobs, candidates, applications, analyses, kits, and activity logs
- Server Actions are a strong fit for a compact B2B workflow demo
- A fallback AI path is essential for judge reliability

## What's Next

- Add authentication and organization-level permissions
- Add PDF parsing and persistent object storage when file retention is required
- Add Amazon Bedrock provider support alongside OpenRouter
- Move production database to Amazon Aurora PostgreSQL
- Add score history, interviewer feedback, and email/calendar integrations

## H0 Hackathon Note

RecruitIQ is submitted for H0 Hackathon Track 2: Monetizable B2B app. The product is intentionally scoped as a deployable MVP that demonstrates a credible paid workflow for lean hiring teams while meeting the PostgreSQL/Aurora-compatible database requirement.

## Vercel Deployment Notes

- Create a Vercel project from this repository.
- Add `DATABASE_URL` using the Neon PostgreSQL connection string for the current demo.
- Optionally add `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, and `OPENROUTER_BASE_URL`.
- Run `npx prisma db push` against the deployed database before demo seeding.
- Seed with `npm run db:seed` from a trusted local environment connected to the deployed database.

## Future AWS Aurora Deployment Notes

- Provision Amazon Aurora PostgreSQL.
- Set Vercel `DATABASE_URL` to the Aurora PostgreSQL connection string.
- Run Prisma migrations or `prisma db push` against Aurora.
- Keep the current OpenRouter fallback model, or replace the TODO in `src/lib/ai.ts` / `src/app/actions.ts` with Amazon Bedrock analysis.
- Add S3 only when persistent file storage is required; the MVP currently stores parsed resume text in PostgreSQL.

## Validation

```bash
npm run lint
npm run build
```
