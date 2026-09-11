# Lead Console — Web Scraping SaaS (MVP scaffold)

A LeadScrapy-style lead-generation platform: point it at a public URL, define
what to extract, get back structured leads you can manage and export.

## Architecture

```
backend/    FastAPI + PostgreSQL + Celery/Redis
  app/core/      config, JWT + password hashing
  app/models/    SQLAlchemy models (User, Team, ScrapeJob, Lead, ScrapeTemplate)
  app/schemas/   Pydantic request/response models
  app/api/       route modules (auth, jobs, leads, templates, export, usage, admin)
  app/services/  scraper_engine (crawler + extraction), url_safety (SSRF guard),
                 robots (robots.txt compliance), email_service
  app/workers/   Celery app + the background task that runs a scrape job
  migrations/    Alembic

frontend/   Next.js 14 (App Router) + TypeScript + Tailwind
  src/app/                    landing, login, signup, forgot-password, terms, privacy
  src/app/(dashboard)/        protected shell: dashboard, scrape, jobs, leads,
                               templates, usage, team, billing, settings
  src/lib/                    typed API client, auth guard hook
```

## Responsible scraping, by design

- **SSRF protection** (`app/services/url_safety.py`) — resolves every hostname
  and blocks private/internal IP ranges and cloud metadata endpoints before
  any request goes out.
- **robots.txt compliance** (`app/services/robots.py`) — checked before every
  fetch, on by default, and it also honors any `Crawl-delay` directive.
- **No auth/paywall/CAPTCHA bypass** — the crawler only ever does a plain GET;
  there's nowhere in the codebase that injects cookies, session tokens, or
  solves challenges.
- **Rate limiting** — a minimum request delay is enforced per host, floored
  server-side so a client can't set it to zero.
- **Server-side plan caps** — `max_pages` and concurrent job limits are
  clamped by plan tier in `routes_jobs.py`, not just in the UI.

## Running locally

```bash
cp backend/.env.example backend/.env
docker compose up --build
```

This starts Postgres, Redis, the FastAPI API (`:8000`), a Celery worker, and
the Next.js frontend (`:3000`).

First-time database setup (run once, inside the `api` container or locally
with `DATABASE_URL` pointed at your Postgres):

```bash
cd backend
alembic revision --autogenerate -m "init"
alembic upgrade head
```

## What's wired up

**Core:** signup/login/JWT auth, job creation with plan/credit enforcement,
the Celery-backed crawler with SSRF + robots.txt checks, CSS/regex field
extraction, leads search/filter/tag/bulk-delete, CSV/XLSX/JSON export, usage
analytics, admin user management.

**Billing (Stripe):** `app/services/stripe_service.py` + `routes_billing.py`.
Checkout Session for upgrading, Billing Portal Session for managing/canceling,
and a webhook (`POST /api/billing/webhook`) that is the *only* place a plan
actually changes — the post-checkout redirect never grants a plan by itself,
only the webhook does, so a user can't spoof an upgrade by hitting the
success URL directly.

**Email (SMTP):** `app/services/email_service.py` sends over real SMTP via
`smtplib` — works with SES's SMTP interface, Postmark, Mailgun, or any
standard provider. Falls back to logging if `SMTP_HOST` is unset, so local
dev without credentials doesn't crash.

**Team invites:** `app/models/user.py::TeamInvite` + `routes_team.py`. Create
a team, invite by email (token expires in 7 days), accept via
`/accept-invite?token=...`, list/remove members. Only team owner/admin can
invite or remove.

**Job pause/resume:** cooperative, not `SIGKILL`-based — the Celery task
checks the job's DB status between page fetches (`should_stop` in
`scraper_engine.crawl`) and, when paused, checkpoints its crawl frontier
(visited URLs + pending queue) into `ScrapeJob.crawl_state`. Resume passes
that checkpoint back in so the crawl continues from the same frontier instead
of restarting. Good enough for a single worker; if you scale to multiple
Celery workers later, add a distributed lock so a resume can't race a
still-running pause on the same job.

## Setting up Stripe

1. In the Stripe dashboard, create three recurring Prices (Starter, Pro,
   Business) and copy their `price_...` IDs into `.env`.
2. Set `STRIPE_SECRET_KEY` from your API keys page.
3. Point a webhook endpoint at `https://your-api-domain/api/billing/webhook`
   listening for `checkout.session.completed`,
   `customer.subscription.updated`, `customer.subscription.deleted` — copy
   the signing secret into `STRIPE_WEBHOOK_SECRET`.
4. For local testing, use the Stripe CLI: `stripe listen --forward-to
   localhost:8000/api/billing/webhook`.

## Still worth doing before launch

- xpath selector support in the extraction engine (css + regex are
  implemented; xpath would need `lxml.etree`)
- Rate-limit the auth endpoints (login/signup/forgot-password) — not done yet
- Move `visited_urls`/`crawl_state` off a JSON column onto a proper table if
  you expect crawls in the tens of thousands of pages (JSON column will get
  large)

## Next steps

1. Run `npm install` in `frontend/` and `pip install -r requirements.txt` in
   `backend/` to pull dependencies.
2. Fill in `.env` (Stripe keys, SMTP credentials).
3. Deploy: frontend → Vercel, API + worker → Railway/Fly/Render, Postgres +
   Redis → managed services.
