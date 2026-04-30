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
- [Screenshots](#screenshots)
- [Design Decisions](#design-decisions)
- [Future Improvements](#future-improvements)

---

## Overview

Taskify lets teams create projects, manage tasks, and collaborate with role-based access control. Every user is verified via email before accessing the app. Team members can be invited by email — whether or not they already have an account — and are onboarded directly into the relevant project.

**Key capabilities:**

- Project and task management with status tracking
- Per-project role-based access control (admin / member)
- JWT authentication with email verification
- Email invite flow for existing and new users
- Personal dashboard with task stats and overdue tracking
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

- The React frontend proxies all `/api/*` requests to the FastAPI backend via Vite's dev proxy (or a reverse proxy in production).
- FastAPI handles all business logic, auth, and database access via SQLAlchemy + Alembic.
- ZeptoMail delivers transactional emails (verification, invites).

**RBAC model:**

Roles are scoped per project, not globally. A user can be an `admin` on one project and a `member` on another.

| Role   | Permissions                                              |
|--------|----------------------------------------------------------|
| admin  | Add/invite members, create tasks, manage project         |
| member | View project, create and update tasks assigned to them   |

---

## Features

### Authentication
- Signup with name, email, and password (strength-validated)
- Email verification required before first login (token expires in 30 min)
- Resend verification email from the `/verify` page
- JWT-based session (stored in `localStorage`, sent as `Authorization: Bearer`)

### Project Management
- Create projects; creator is automatically assigned as admin
- View all projects you are a member of
- Per-project member list with roles

### Task Management
- Create tasks within a project (title, assignee, due date, status)
- Update task status: `todo` → `in_progress` → `done`
- Filter tasks by project

### Dashboard
- Total task count across all your projects
- Breakdown by status (todo / in progress / done)
- Overdue task list

### Invite Flow
- Admins invite team members by email
- Existing users receive an email and are added to the project on login
- New users receive an email, sign up via a pre-filled form, and are added automatically — no separate email verification required for this path

### Role-Based Access
- Only project admins can invite or add members
- All project data is scoped to members only — non-members cannot access project resources

---

## Project Structure

```
team-task-manager/
├── apps/
│   ├── api/                        # FastAPI backend
│   │   ├── alembic/                # Database migrations
│   │   │   └── versions/
│   │   ├── app/
│   │   │   ├── core/               # Config, JWT, password hashing
│   │   │   ├── db/                 # SQLAlchemy base, session, schema
│   │   │   ├── dependencies/       # Auth dependency (get_current_user)
│   │   │   ├── models/             # ORM models (User, Project, Task, Invite)
│   │   │   ├── routes/             # API route handlers
│   │   │   ├── schemas/            # Pydantic request/response schemas
│   │   │   ├── services/           # Business logic layer
│   │   │   └── templates/email/    # HTML email templates
│   │   ├── .env
│   │   ├── Dockerfile
│   │   ├── entrypoint.sh           # Runs alembic upgrade then uvicorn
│   │   └── requirements.txt
│   │
│   └── web/                        # React frontend (Vite + TypeScript)
│       ├── src/
│       │   ├── components/         # Shared UI components + shadcn/ui
│       │   ├── contexts/           # AuthContext, ThemeContext
│       │   ├── layouts/            # AppLayout (sidebar + topbar)
│       │   ├── lib/                # API client, utilities
│       │   ├── pages/              # Route-level page components
│       │   └── App.tsx             # Router + route guards
│       ├── public/
│       ├── .env
│       └── Dockerfile
│
├── docker-compose.yml
└── README.md
```

---

## Local Setup

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### 1. Clone the repository

```bash
git clone https://github.com/your-username/taskify.git
cd taskify
```

### 2. Configure environment variables

**Backend** — copy and edit:

```bash
cp apps/api/.env.example apps/api/.env
```

**Frontend** — the default `.env` works out of the box for Docker:

```bash
cp apps/web/.env.example apps/web/.env
```

See [Environment Variables](#environment-variables) for all required values.

### 3. Start the stack

```bash
docker compose up --build
```

This will:
1. Start PostgreSQL and wait for it to be healthy
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

---

## Environment Variables

### Backend — `apps/api/.env`

| Variable                  | Description                                      | Example                                      |
|---------------------------|--------------------------------------------------|----------------------------------------------|
| `DATABASE_URL`            | PostgreSQL connection string                     | `postgresql://user:password@db:5432/taskify` |
| `SECRET_KEY`              | JWT signing secret (use a long random string)    | `change-me-to-a-long-random-secret`          |
| `ALGORITHM`               | JWT algorithm                                    | `HS256`                                      |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime in minutes                   | `60`                                         |
| `ZEPTO_API_KEY`           | ZeptoMail API key (without the `Zoho-enczapikey` prefix) | `PHtE6r0P...`                     |
| `ZEPTO_FROM_EMAIL`        | Verified sender email address                    | `noreply@yourdomain.com`                     |
| `ZEPTO_FROM_NAME`         | Sender display name                              | `Taskify`                                    |
| `FRONTEND_URL`            | Base URL used in email links                     | `http://localhost:3003`                      |

> If `ZEPTO_API_KEY` is left empty, the app runs in dev mode — email content is printed to the API logs instead of being sent.

### Frontend — `apps/web/.env`

The frontend communicates with the backend via Vite's proxy — no `VITE_API_URL` is needed in development. The proxy is configured in `vite.config.ts`:

```
/api/* → http://api:8000/*
```

---

## API Reference

All protected endpoints require:

```
Authorization: Bearer <access_token>
```

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
| GET    | `/projects/{id}/members`        | Yes  | List project members                     |

### Members & Invites

| Method | Endpoint                        | Auth | Description                              |
|--------|---------------------------------|------|------------------------------------------|
| POST   | `/projects/{id}/members`        | Yes  | Add member by user ID (admin only)       |
| POST   | `/projects/{id}/invite`         | Yes  | Invite member by email (admin only)      |
| GET    | `/projects/invites/info`        | No   | Get invite metadata by token             |
| POST   | `/projects/invites/accept`      | Yes  | Accept an invite, join the project       |

### Tasks

| Method | Endpoint                        | Auth | Description                              |
|--------|---------------------------------|------|------------------------------------------|
| POST   | `/tasks`                        | Yes  | Create a task                            |
| GET    | `/tasks?project_id=`            | Yes  | List tasks for a project                 |
| GET    | `/tasks/{id}`                   | Yes  | Get a single task                        |
| PATCH  | `/tasks/{id}/status`            | Yes  | Update task status                       |

### Dashboard

| Method | Endpoint                        | Auth | Description                              |
|--------|---------------------------------|------|------------------------------------------|
| GET    | `/dashboard`                    | Yes  | Task stats + overdue list for current user |

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

User opens invite link:

  Case 1 — User already has an account:
    → Login form shown with email pre-filled
    → After login → POST /projects/invites/accept
    → Redirected to project page

  Case 2 — User does not have an account:
    → Signup form shown with email (readonly) + name pre-filled
    → After signup → auto-login via /auth/login-invite (skips email verification)
    → POST /projects/invites/accept
    → Redirected to project page

  Case 3 — User is already logged in:
    → Invite accepted immediately
    → Redirected to project page
```

**Security:**
- Tokens are SHA-256 hashed before storage; only the raw token is sent in emails
- Verification tokens expire in 30 minutes; invite tokens expire in 24 hours
- Expired or invalid tokens return a clear error — no sensitive data is exposed

---

## Deployment

Taskify is designed to deploy on [Railway](https://railway.app) using Docker.

### Services to create on Railway

| Service  | Source              | Port |
|----------|---------------------|------|
| db       | Railway PostgreSQL  | 5432 |
| api      | `apps/api` Dockerfile | 8000 |
| web      | `apps/web` Dockerfile | 3003 |

### Steps

1. Create a new Railway project
2. Add a PostgreSQL plugin — Railway provides `DATABASE_URL` automatically
3. Deploy the `api` service from the `apps/api` directory; set all environment variables from the [Backend env table](#backend--appsapienv)
4. Set `FRONTEND_URL` to your deployed frontend URL
5. Deploy the `web` service from the `apps/web` directory; configure the Vite proxy target to point to the deployed API URL
6. Set `RAILWAY_DOCKERFILE_PATH` for each service if needed

### Port reference

| Service  | Internal | Exposed (local) |
|----------|----------|-----------------|
| web      | 3003     | 3003            |
| api      | 8000     | 8003            |
| db       | 5432     | 5434            |

---

## Screenshots

### Dashboard
> _Task summary, status breakdown, overdue tasks_

### Project Page
> _Task list, member management, invite by email_

### Authentication
> _Signup with live password validation, email verification screen_

### Invite Flow
> _Pre-filled login / signup form from invite link_

---

## Design Decisions

**No organization layer**
Taskify uses a flat project-based model. Users belong to projects directly, without an intermediate organization or workspace layer. This keeps the data model simple and avoids the complexity of multi-tenant isolation for a v1 product.

**Project-scoped RBAC**
Roles (`admin` / `member`) are assigned per project membership, not globally. This gives fine-grained control without requiring a complex permission system. A user can hold different roles across different projects.

**Minimal UI**
The interface uses a black-and-white design system with dark mode support. The goal is to keep the UI out of the way and let the content — tasks, projects, people — be the focus. No color-coded priority labels, no complex kanban boards in v1.

**Token hashing**
Verification and invite tokens are SHA-256 hashed before being stored in the database. Only the raw token is sent in emails. This means a database breach does not expose usable tokens.

**Email dev mode**
If `ZEPTO_API_KEY` is not set, the app prints email content (including verification URLs) to the API logs. This makes local development possible without a real email provider.

---

## Future Improvements

- **Real-time updates** — WebSocket or SSE support for live task status changes across team members
- **Notifications** — In-app notification center for task assignments, status changes, and mentions
- **Organization layer** — Multi-tenant workspace model with organization-level billing, SSO, and member management
- **Task comments** — Threaded comments and activity log per task
- **File attachments** — Attach files to tasks via S3-compatible storage
- **Audit log** — Track all project and task changes with timestamps and actor info
- **Mobile app** — React Native client using the same REST API
