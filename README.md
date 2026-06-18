# RecruitIQ

RecruitIQ is a polished B2B AI-powered applicant tracking system built for the H0 Hackathon. It helps lean teams create roles, upload resumes, rank candidates, manage pipeline stages, and generate structured interview prep.

## Live Demo

- Live demo: `TODO: add Vercel URL`
- Local demo: `http://localhost:3000`

## Hackathon Track

H0 Hackathon Track 2: Monetizable B2B app.

## Database

- Required architecture: Amazon Aurora PostgreSQL-compatible PostgreSQL architecture
- Current deployed demo DB: Neon PostgreSQL
- ORM: Prisma

The schema is PostgreSQL-first and uses standard Prisma models, enums, relations, arrays, and JSON metadata that are compatible with Aurora PostgreSQL.

## Demo Features

- Premium landing page for an AI-powered ATS for lean teams
- Dashboard metrics for open jobs, candidate volume, interviews, and average fit score
- Job creation and job cards
- Candidate creation with `.txt` resume upload, parsed text preview, and manual resume fallback
- Candidate profiles with AI fit score, summary, strengths, gaps, recommended stage, interview questions, notes, and status controls
- Optional OpenRouter analysis through `OPENROUTER_API_KEY`
- Deterministic mock AI fallback when no AI key is configured or the provider fails
- `/compare` page for ranked candidate comparison by selected job
- Kanban-style pipeline with stage updates
- Analytics cards and CSS charts for stages, job status, fit score, and top skills

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

Key files:

- `prisma/schema.prisma`: database models
- `prisma/seed.ts`: demo data
- `src/lib/ai.ts`: deterministic mock AI plus optional OpenRouter integration
- `src/app/actions.ts`: Server Actions
- `src/app/(app)/compare/page.tsx`: candidate comparison demo
- `src/components/ResumeUploadField.tsx`: resume upload and preview

## Environment Variables

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/recruitiq?schema=public"
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`OPENROUTER_API_KEY` is optional. The app remains fully functional without external AI keys.

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
