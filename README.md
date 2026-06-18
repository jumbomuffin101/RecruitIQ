# RecruitIQ

RecruitIQ is a polished B2B AI-powered applicant tracking system built for the H0 Hackathon. It helps small businesses, startups, and student organizations manage hiring pipelines, rank candidates, and generate structured interview prep from candidate data.

## Hackathon Track

H0 Hackathon full-stack product track.

## AWS Database

RecruitIQ is PostgreSQL-first through Prisma ORM and is designed to run on Amazon Aurora PostgreSQL for the hackathon database requirement.

## Features

- Landing page for an AI-powered ATS for lean teams
- Dashboard with hiring summary metrics, recent candidates, top candidates, and pipeline overview
- Jobs CRUD form and job cards
- Candidate creation, profile pages, notes, resume summaries, skills, and status tracking
- Deterministic mock AI analysis with fit score, strengths, gaps, recommended stage, and interview questions
- Kanban-style pipeline with status updates
- Analytics cards and simple CSS charts for stages, job statuses, fit score, and top skills
- Prisma schema and seed data for demo-ready content

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Configure PostgreSQL:

```bash
cp .env.example .env
```

Set `DATABASE_URL` to a PostgreSQL or Amazon Aurora PostgreSQL connection string.
For a local Docker database, run:

```bash
docker compose up -d postgres
```

3. Generate Prisma Client and push the schema:

```bash
npx prisma generate
npx prisma db push
```

4. Seed demo data:

```bash
npm run db:seed
```

5. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Vercel Deployment Notes

- Create a Vercel project from this repository.
- Add `DATABASE_URL` in Vercel project environment variables.
- Use an Amazon Aurora PostgreSQL connection string for the production database.
- Run `npx prisma db push` against the Aurora database before the demo, or use a migration workflow if you add migrations later.
- The app uses deterministic mock AI and does not require OpenAI or AWS Bedrock keys yet.

## Architecture Summary

- Next.js App Router with TypeScript and Tailwind CSS
- Server Components for data-backed pages
- Server Actions for job creation, candidate creation, status updates, and AI analysis generation
- Prisma ORM with PostgreSQL datasource
- Reusable UI components: `AppSidebar`, `StatCard`, `CandidateCard`, `JobCard`, `StatusBadge`, `PipelineColumn`, `EmptyState`, and `PageHeader`
- Mock AI logic in `src/lib/ai.ts`, with TODO markers for future OpenAI or Amazon Bedrock integration
