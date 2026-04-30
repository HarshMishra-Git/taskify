# Taskify

A full-stack team task management SaaS. Organize work into projects, assign tasks, manage team members with role-based access, and onboard collaborators via email invites — all in a minimal, focused interface.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Project Structure](#project-structure)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Email Flows](#email-flows)
- [Deployment](#deployment)
- [CI/CD](#cicd)
- [Design Decisions](#design-decisions)
- [Future Improvements](#future-improvements)

---

## Overview

Taskify lets teams create projects, manage tasks, and collaborate with role-based access control. Every user is verified via email before accessing the app. Team members can be invited by email — whether or not they already have an account — and are onboarded directly into the relevant project.

**Key capabilities:**

- Project and task management with status tracking and due dates
- Per-project role-based access control (admin / member)
- JWT authentication with email verification
- Email invite flow for existing and new users
- Pending invite tracking — invited users appear in the member list before they accept
- Admin can remove members and revoke pending invites
- Personal dashboard with task stats and overdue tracking
- Responsive UI — desktop sidebar + mobile bottom navigation
- Minimal black-and-white UI, dark mode supported

---

## Architecture

```
┌─────────────────┐        ┌─────────────────┐        ┌──────────────────┐
│   React (Vite)  │ ──────▶│  FastAPI (REST) │ ──────▶│  PostgreSQL 16   │
│   Port 3003     │  /api  │   Port 8000     │        │   Port 5432      │
└─────────────────┘        └────────┬────────┘        └──────────────────┘
                                    │
                                    ▼
                           ┌─────────────────┐
                           │   ZeptoMail     │
                           │  (Email API)    │
                           └─────────────────┘
```

- The React frontend proxies all `/api/*` requests to the FastAPI backend via Vite's dev proxy (local) or nginx reverse proxy (production).
- FastAPI handles all business logic, auth, and database access via SQLAlchemy + Alembic.
- ZeptoMail delivers transactional emails (verification, invites).

**RBAC model:**

Roles are scoped per project, not globally. A user can be an `admin` on one project and a `member` on another.

| Role   | Permissions                                                        |
|--------|--------------------------------------------------------------------|
| admin  | Invite/remove members, revoke invites, create tasks, manage project |
| member | View project, create and update tasks assigned to them             |

---

## Features

### Authentication
- Signup with name, email, and password (live strength validation: 8+ chars, uppercase, number/symbol)
- Email verification required before first login (token expires in 30 min)
- Resend verification email from the `/verify` page
- JWT-based session (stored in `localStorage`, sent as `Authorization: Bearer`)

### Project Management
- Create projects; creator is automatically assigned as admin
- View all projects you are a member of
- Per-project member list with roles

### Task Management
- Create tasks within a project (title, assignee, due date via calendar picker, status)
- Update task status: `todo` → `in_progress` → `done`
- Members can only update tasks assigned to them; admins can update any task

### Dashboard
- Total task count across all your projects
- Breakdown by status (todo / in progress / done)
- Overdue task list — includes tasks assigned to you and unassigned overdue tasks in your projects

### Invite & Member Management
- Admins invite team members by email via `POST /projects/{id}/invite`
- Existing users are added directly and receive a notification email
- New users receive an invite email, sign up via a pre-filled form, skip email verification
- Pending invites appear in the member list with a "Pending" badge until accepted
- Admins can remove active members (trash icon)
- Admins can revoke pending invites (trash icon)

### Role-Based Access
- Only project admins can invite, remove members, or revoke invites
- All project data is scoped to members only — non-members cannot access project resources

### Responsive UI
- Desktop: collapsible sidebar navigation
- Mobile: top branding bar + fixed bottom navigation (context-aware: shows Dashboard on project pages, Projects elsewhere)

---

## Project Structure

```
team-task-manager/
├── apps/
│   ├── api/                        # FastAPI backend
│   │   ├── alembic/                # Database migrations
│   │   │   └── versions/
│   │   │       ├── 0001_initial_schema.py
│   │   │       └── 0002_add_verification_invite.py
│   │   ├── app/
│   │   │   ├── core/               # Config, JWT, password hashing
│   │   │   ├── db/                 # SQLAlchemy base, session
│   │   │   ├── dependencies/       # Auth dependency (get_current_user)
│   │   │   ├── models/             # ORM models (User, Project, Task, Invite)
│   │   │   ├── routes/             # API route handlers
│   │   │   ├── schemas/            # Pydantic request/response schemas
│   │   │   ├── services/           # Business logic layer
│   │   │   └── templates/email/    # HTML email templates
│   │   ├── .env
│   │   ├── .env.example
│   │   ├── Dockerfile
│   │   ├── railway.toml
│   │   ├── entrypoint.sh           # Runs alembic upgrade then uvicorn
│   │   └── requirements.txt
│   │
│   └── web/                        # React frontend (Vite + TypeScript)
│       ├── src/
│       │   ├── components/         # Shared UI components + shadcn/ui
│       │   ├── contexts/           # AuthContext, ThemeContext
│       │   ├── layouts/            # AppLayout (sidebar + mobile nav)
│       │   ├── lib/                # API client, utilities
│       │   ├── pages/              # Route-level page components
│       │   └── App.tsx             # Router + route guards
│       ├── public/
│       │   └── favicon.svg         # Taskify icon
│       ├── .env
│       ├── .env.example
│       ├── Dockerfile              # Dev server (Vite)
│       ├── Dockerfile.prod         # Production (nginx)
│       ├── nginx.conf              # nginx config for production
│       ├── start.sh                # nginx startup script
│       └── railway.toml
│
├── .github/
│   └── workflows/
│       └── deploy.yml              # CI/CD — path-filtered deploys to Railway
├── docker-compose.yml
└── README.md
```

---

## Local Setup

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### 1. Clone the repository

```bash
git clone https://github.com/HarshMishra-Git/taskify.git
cd taskify
```

### 2. Configure environment variables

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Edit `apps/api/.env` — see [Environment Variables](#environment-variables).

### 3. Start the stack

```bash
docker compose up --build
```

This will:
1. Start PostgreSQL and wait for it to be healthy (healthcheck built in)
2. Run `alembic upgrade head` to apply all migrations
3. Start the FastAPI server on port `8000` (mapped to `8003`)
4. Start the Vite dev server on port `3003`

### 4. Open the app

```
http://localhost:3003
```

API docs (Swagger UI):

```
http://localhost:8003/docs
```

> If `ZEPTO_API_KEY` is left empty, the app runs in dev mode — verification URLs and invite links are printed to the API logs instead of being sent by email.

---

## Environment Variables

### Backend — `apps/api/.env`

| Variable                      | Description                                              | Example                                        |
|-------------------------------|----------------------------------------------------------|------------------------------------------------|
| `DATABASE_URL`                | PostgreSQL connection string                             | `postgresql://user:password@db:5432/taskify`   |
| `SECRET_KEY`                  | JWT signing secret (min 32 chars)                        | `your-long-random-secret`                      |
| `ALGORITHM`                   | JWT algorithm                                            | `HS256`                                        |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime in minutes                                | `60`                                           |
| `ZEPTO_API_KEY`               | ZeptoMail API key — **without** the `Zoho-enczapikey` prefix | `PHtE6r0P...`                              |
| `ZEPTO_FROM_EMAIL`            | Verified sender email address                            | `noreply@yourdomain.com`                       |
| `ZEPTO_FROM_NAME`             | Sender display name                                      | `Taskify`                                      |
| `FRONTEND_URL`                | Base URL used in email links                             | `https://taskify-web-production.up.railway.app`|

> **Railway note:** `DATABASE_URL` from Railway Postgres starts with `postgres://` — the app automatically rewrites it to `postgresql://` for SQLAlchemy compatibility.

### Frontend — `apps/web/.env`

In development, Vite proxies `/api/*` to the API container — no URL variable needed.

In production (Railway), nginx proxies `/api/*` to the API service URL configured in `nginx.conf`.

---

## API Reference

All protected endpoints require:

```
Authorization: Bearer <access_token>
```

### Health

| Method | Endpoint    | Auth | Description        |
|--------|-------------|------|--------------------|
| GET    | `/health`   | No   | Health check       |

### Auth

| Method | Endpoint                        | Auth | Description                              |
|--------|---------------------------------|------|------------------------------------------|
| POST   | `/auth/signup`                  | No   | Register a new user                      |
| POST   | `/auth/login`                   | No   | Login, returns JWT                       |
| GET    | `/auth/verify?token=`           | No   | Verify email, returns JWT                |
| POST   | `/auth/resend-verification`     | No   | Resend verification email                |
| POST   | `/auth/login-invite`            | No   | Login + auto-verify for invite signups   |

### Projects

| Method | Endpoint                        | Auth | Description                              |
|--------|---------------------------------|------|------------------------------------------|
| POST   | `/projects`                     | Yes  | Create a project                         |
| GET    | `/projects`                     | Yes  | List all projects for current user       |
| GET    | `/projects/{id}`                | Yes  | Get a single project                     |
| GET    | `/projects/{id}/members`        | Yes  | List members + pending invites           |

### Members & Invites

| Method | Endpoint                            | Auth | Description                              |
|--------|-------------------------------------|------|------------------------------------------|
| POST   | `/projects/{id}/members`            | Yes  | Add member by user ID (admin only)       |
| POST   | `/projects/{id}/invite`             | Yes  | Invite member by email (admin only)      |
| DELETE | `/projects/{id}/members/{user_id}`  | Yes  | Remove active member (admin only)        |
| DELETE | `/projects/{id}/invites?email=`     | Yes  | Revoke pending invite (admin only)       |
| GET    | `/projects/invites/info?token=`     | No   | Get invite metadata by token             |
| POST   | `/projects/invites/accept?token=`   | Yes  | Accept an invite, join the project       |

### Tasks

| Method | Endpoint                        | Auth | Description                              |
|--------|---------------------------------|------|------------------------------------------|
| POST   | `/tasks`                        | Yes  | Create a task                            |
| GET    | `/tasks?project_id=`            | Yes  | List tasks for a project                 |
| GET    | `/tasks/{id}`                   | Yes  | Get a single task                        |
| PATCH  | `/tasks/{id}/status`            | Yes  | Update task status                       |

### Dashboard

| Method | Endpoint      | Auth | Description                                        |
|--------|---------------|------|----------------------------------------------------|
| GET    | `/dashboard`  | Yes  | Task stats + overdue list for current user         |

---

## Email Flows

### Verification Flow

```
User signs up
    → Account created (is_verified = false)
    → Verification email sent (token valid 30 min)
    → User clicks link → GET /auth/verify?token=
    → Token validated, is_verified = true
    → JWT returned → user auto-logged in → redirected to /
```

### Invite Flow

```
Admin invites email via POST /projects/{id}/invite
    → ProjectInvite record created (token valid 24 hrs)
    → Invite email sent with link: /invite?token=
    → Invited user appears in member list as "Pending"

User opens invite link:

  Case 1 — Already logged in:
    → Invite accepted immediately
    → Redirected to project page

  Case 2 — User has an account, not logged in:
    → Login form shown with email pre-filled
    → After login → POST /projects/invites/accept
    → Redirected to project page

  Case 3 — New user (no account):
    → Signup form shown with email (readonly) + name pre-filled
    → After signup → auto-login via /auth/login-invite (skips email verification)
    → POST /projects/invites/accept
    → Redirected to project page
```

**Security:**
- Tokens are SHA-256 hashed before storage; only the raw token is sent in emails
- Verification tokens expire in 30 minutes; invite tokens expire in 24 hours
- Expired or invalid tokens return a clear error — no sensitive data is exposed
- `postgres://` URLs are auto-rewritten to `postgresql://` for Railway compatibility

---

## Deployment

Taskify is deployed on [Railway](https://railway.app) using Docker.

### Services

| Service  | Source                  | Internal Port | Public Port |
|----------|-------------------------|---------------|-------------|
| db       | Railway PostgreSQL       | 5432          | —           |
| api      | `apps/api/Dockerfile`   | 8000          | 8000        |
| web      | `apps/web/Dockerfile.prod` | 8080       | 8080        |

### Steps

1. Create a new Railway project
2. Add a **PostgreSQL** database — Railway provides `DATABASE_URL` automatically
3. Deploy the **API service** from `apps/api`:
   - Set root directory to `apps/api`
   - Add all variables from the [Backend env table](#backend--appsapienv)
   - Set `FRONTEND_URL` to your web service's public URL
   - Railway uses `railway.toml` — healthcheck at `/health`, timeout 300s
4. Deploy the **Web service** from `apps/web`:
   - Set root directory to `apps/web`
   - Railway uses `Dockerfile.prod` (nginx serving static build)
   - Set networking port to `8080`
5. Update `apps/web/nginx.conf` with your API service's public URL in `proxy_pass`

### Port reference (local Docker)

| Service  | Internal | Exposed |
|----------|----------|---------|
| web      | 3003     | 3003    |
| api      | 8000     | 8003    |
| db       | 5432     | 5434    |

---

## CI/CD

GitHub Actions workflow at `.github/workflows/deploy.yml` uses path-based filtering via `dorny/paths-filter`:

```
push to main
      │
      ▼
  [changes]  ← detects which paths changed
      │
      ├── apps/api/**  →  test-api  →  deploy-api
      │
      └── apps/web/**  →  test-web  →  deploy-web
```

- API changes only → only API is tested and deployed
- Web changes only → only Web is tested and deployed
- Both changed → both run in parallel

### Required GitHub Secrets

| Secret                    | Where to get it                                      |
|---------------------------|------------------------------------------------------|
| `RAILWAY_TOKEN`           | Railway → Account Settings → Tokens → New Token     |
| `RAILWAY_API_SERVICE_ID`  | Railway → API service → Settings → Service ID       |
| `RAILWAY_WEB_SERVICE_ID`  | Railway → Web service → Settings → Service ID       |

---

## Design Decisions

**No organization layer**
Taskify uses a flat project-based model. Users belong to projects directly, without an intermediate organization or workspace layer. This keeps the data model simple for a v1 product.

**Project-scoped RBAC**
Roles (`admin` / `member`) are assigned per project membership, not globally. A user can hold different roles across different projects.

**Pending invite visibility**
When an admin invites a user, a `ProjectInvite` record is created immediately. The `GET /projects/{id}/members` endpoint returns both active members and pending (unaccepted, non-expired) invites in a single response, so admins can see who has been invited and who hasn't accepted yet.

**Token hashing**
Verification and invite tokens are SHA-256 hashed before being stored in the database. Only the raw token is sent in emails. A database breach does not expose usable tokens.

**Email dev mode**
If `ZEPTO_API_KEY` is not set, the app prints email content (including verification URLs and invite links) to the API logs. This makes local development possible without a real email provider.

**Minimal UI**
Black-and-white design system with dark mode. No color-coded priority labels or kanban boards in v1 — the interface stays out of the way.

**Mobile navigation**
Context-aware bottom nav bar: shows "Dashboard" when on a project page, "Projects" when on the dashboard. Separate dropdown state for mobile and desktop prevents shared ref conflicts.

---

## Future Improvements

- **Real-time updates** — WebSocket or SSE for live task status changes
- **Notifications** — In-app notification center for assignments and mentions
- **Organization layer** — Multi-tenant workspace model with org-level billing and SSO
- **Task comments** — Threaded comments and activity log per task
- **File attachments** — Attach files to tasks via S3-compatible storage
- **Audit log** — Track all project and task changes with timestamps
- **Mobile app** — React Native client using the same REST API
