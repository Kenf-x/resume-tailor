# Resume Tailor

AI-assisted web app to upload multiple resumes, build a **master resume**, and **tailor** it to a job posting (LinkedIn, Indeed, ZipRecruiter URL or pasted text). Exports **PDF**, **DOCX**, and **plain text**.

## Folder structure

```
app/                 # App Router pages and API routes (app/api/*)
components/          # UI (dashboard, upload zone, workflow steps, ui/)
lib/                 # Prisma client, env, file storage helpers
services/            # Domain logic
  ai/                # OpenAI prompts + JSON completion helper
  resume-parse.ts    # PDF/DOCX/TXT extraction + structured parse
  resume-merge.ts    # Deterministic + LLM merge
  job-extract.ts     # Fetch URL / paste + job JSON
  tailor.ts          # Tailoring + keyword match
  export-*.ts        # Plain text, DOCX, PDF
types/               # Shared TypeScript types (structured resume, job, analysis)
prisma/              # schema.prisma
uploads/             # Local file storage (gitignored)
```

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS**
- **PostgreSQL** + **Prisma**
- **OpenAI** (optional but recommended) for parsing, merge, tailoring, and match scoring
- **pdf-parse**, **mammoth** (DOCX text), **docx** / **pdf-lib** (exports)

## Prerequisites

- Node.js 20+
- PostgreSQL (local or Docker)

## Setup

1. **Copy environment file**

   ```bash
   cp .env.example .env
   ```

2. **Start Postgres** (example with Docker)

   ```bash
   docker compose up -d
   ```

3. **Install dependencies**

   ```bash
   npm install
   npx prisma generate
   ```

4. **Apply database schema**

   ```bash
   npx prisma db push
   ```

5. **Add your OpenAI key** to `.env` as `OPENAI_API_KEY` for full AI features. Without it, the app uses heuristic parsing and limited tailoring.

6. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Workflow

1. Upload one or more resumes (PDF, DOCX, TXT).
2. Click **Generate master resume** to merge parsed content.
3. Edit the master JSON if needed, then **Save master**.
4. Enter a job URL and/or paste the description; click **Analyze job**.
5. Choose tailoring intensity and **Generate tailored resume**.
6. Review match analysis, edit tailored JSON, then **Download** PDF/DOCX/TXT or **Copy**.

## Project layout

| Path | Purpose |
|------|---------|
| `app/` | Routes and API handlers (`app/api/...`) |
| `components/` | UI (dashboard, upload zone, workflow steps) |
| `lib/` | Prisma client, storage paths, env helpers |
| `services/` | Parsing, merge, job extraction, tailoring, export, AI prompts |
| `types/` | Structured resume and job types |
| `prisma/` | Database schema |

## Guardrails

Prompts instruct the model **not** to invent employers, dates, degrees, or metrics. Tailoring should only reorganize and rephrase content grounded in uploads and your edits. Job URLs may be blocked by job boards; use **paste** as a fallback.

## Build for production

From the project root:

```bash
npm install
npx prisma generate
npm run build
npm run start
```

## Connect GitHub to Vercel (step by step)

1. **Sign in** at [vercel.com](https://vercel.com) with **Continue with GitHub** (same account that owns `Kenf-x/resume-tailor` or one that has access).
2. If asked, **install the Vercel GitHub App** and grant access to your repositories (or only `resume-tailor`).
3. **Add New…** → **Project** → **Import** `Kenf-x/resume-tailor` (search or pick it from the list).
4. Leave **Framework Preset** as **Next.js** and **Root Directory** as **`.`** (project root). Don’t change the default **Build** / **Output** unless you know you need to.
5. **Environment variables** — add these before the first deploy (see table below). You can also add them later under **Project → Settings → Environment Variables**.
6. Click **Deploy**. When the build finishes, open the **Production** URL Vercel shows.
7. **Apply the database schema** to your *production* Postgres (see command below). The app will error on DB until this is done.

## Deploy (Vercel) — reference

1. **Repository** is connected to Vercel (steps above).
2. **Framework:** **Next.js** (auto-detected).
3. **Environment variables** (Production and Preview as needed):

   | Name | Notes |
   |------|--------|
   | `DATABASE_URL` | Hosted Postgres connection string (e.g. [Neon](https://neon.tech), [Supabase](https://supabase.com), [Vercel Postgres](https://vercel.com/storage/postgres)). Must be reachable from Vercel’s network. |
   | `OPENAI_API_KEY` | Your OpenAI API key (optional but recommended). |
   | `DEFAULT_USER_ID` | e.g. `default-user` (single-user MVP). |
   | `UPLOAD_DIR` | Optional. If unset on Vercel, the app uses `/tmp/resume-uploads` (files are **ephemeral** between cold starts). For durable uploads, add **Blob/S3** later or set a persistent mount (not available on standard serverless). |

4. **Build command:** `npm run build` (default). **Install command:** `npm install` (default). The Prisma client is generated via `postinstall` and again in `build`.
5. After the first deploy, apply the schema to the production database (from your machine, with `DATABASE_URL` pointing at production):

   ```bash
   npx prisma db push
   ```

   Or add migrations and use `prisma migrate deploy` in a release step.

6. **CLI deploy** (alternative): install the [Vercel CLI](https://vercel.com/docs/cli), then from this directory:

   ```bash
   npx vercel login
   npx vercel        # preview
   npx vercel --prod # production
   ```

## Push to GitHub

**This has to run on your computer** (the AI cannot log in as you). In Cursor: **Terminal → New Terminal**, then:

```bash
cd "/Users/k/Desktop/APP DEV/WEB BASED RESUME APP"
chmod +x scripts/push-to-github.sh
brew install gh          # once, if you don’t have gh
gh auth login            # once, browser login
./scripts/push-to-github.sh
```

That commits everything except `.env`, creates a **public** repo named `resume-tailor`, and pushes `main`.

**If you still don’t see it on GitHub:**

1. Confirm you’re logged in: `gh auth status` (should show your GitHub username).
2. If the name `resume-tailor` is already taken, use another name:
   ```bash
   GITHUB_REPO_NAME=resume-tailor-myname ./scripts/push-to-github.sh
   ```
3. **Manual push** (no `gh` create): create a **new empty** repo at [github.com/new](https://github.com/new) (any name, no README). Then:
   ```bash
   cd "/Users/k/Desktop/APP DEV/WEB BASED RESUME APP"
   git add -A && git reset -- .env
   git commit -m "feat: Resume Tailor" || true
   git branch -M main
   git remote remove origin 2>/dev/null || true
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```
   Replace `YOUR_USERNAME` and `YOUR_REPO_NAME`. Use **HTTPS** with a [Personal Access Token](https://github.com/settings/tokens) as the password if prompted, or set up SSH and use `git@github.com:USER/REPO.git`.

## Production notes

- Point `DATABASE_URL` at a managed Postgres instance.
- On serverless hosts, local file storage is limited; `UPLOAD_DIR` defaults to `/tmp/...` on Vercel. For durable files, swap `lib/storage.ts` for **S3** / **Vercel Blob**.
- Add authentication and multi-tenant `userId` before exposing publicly.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build (`prisma generate` + `next build`) |
| `npm run start` | Start production server |
| `npm run db:push` | Sync Prisma schema to the database |
| `npm run db:studio` | Prisma Studio |
