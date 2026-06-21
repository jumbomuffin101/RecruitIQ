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
- PDF and TXT resume parsing without permanent file storage
- Manual resume text fallback when extraction is unavailable
- Candidate profiles with skills, notes, stage, and resume evidence
- Recruiter Copilot with fit score, executive summary, role match, strengths, risks, next step, and interview kit
- Optional OpenRouter analysis with deterministic fallback
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
Server Action -> OpenRouter API
              -> deterministic fallback when unavailable
```

### Database Architecture

RecruitIQ uses Amazon Aurora PostgreSQL as its production database. Prisma maps organizations, users, jobs, candidates, applications, resume analyses, interview kits, and activity logs into relational PostgreSQL models. Aurora is a strong fit because hiring workflows require reliable transactions, relational integrity, auditable activity, and scalable querying across candidates and roles.

The Prisma schema uses PostgreSQL-native features and remains portable to other PostgreSQL-compatible environments for local development or migration work.

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
- `src/lib/ai.ts`: OpenRouter integration and deterministic fallback
- `src/app/(app)/dashboard/page.tsx`: metrics and Action Center
- `src/app/(app)/compare/page.tsx`: job-specific candidate prioritization
- `src/app/(app)/architecture/page.tsx`: in-product system architecture
- `src/app/(app)/quick-start/page.tsx`: guided product workflow

## Environment Variables

```bash
DATABASE_URL=""
OPENROUTER_API_KEY=
OPENROUTER_MODEL=
OPENROUTER_BASE_URL=
NEXT_PUBLIC_APP_URL=
```

- `DATABASE_URL` is required and should point to Amazon Aurora PostgreSQL in production.
- `OPENROUTER_API_KEY` is optional and is only read by server-side code.
- When OpenRouter is missing or unavailable, RecruitIQ uses deterministic candidate analysis.
- No resume files are stored or exposed publicly; only extracted text is saved to PostgreSQL.

## Local Setup

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:push
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

## Demo Walkthrough

1. Open `/quick-start` for the guided product flow.
2. Review the dashboard metrics and prioritized Action Center.
3. Create a job or inspect the existing Northstar Labs roles.
4. Upload a PDF or TXT resume from `/candidates` and review the extracted text.
5. Open a candidate and generate Recruiter Copilot analysis.
6. Show the fit score, evidence, risks, suggested next step, and interview kit.
7. Use `/compare` to rank applicants for a selected job.
8. Move a candidate in `/pipeline` and finish with `/analytics`.
9. Open `/architecture` to explain Vercel, Server Actions, Prisma, and Amazon Aurora PostgreSQL.

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
- Candidate score history and configurable evaluation rubrics
- Billing and plan management after product validation

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
```
