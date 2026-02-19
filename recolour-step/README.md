# Recolour Step

A photo-recolouring workflow tool. Operators create tickets for photosets, send them to retouching partners, and managers approve or reject the results.

---

## Table of Contents

- [Assumptions](#assumptions)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Running Locally (without Docker)](#running-locally-without-docker)
- [Running with Docker](#running-with-docker)
- [Running Tests](#running-tests)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Ticket Lifecycle](#ticket-lifecycle)
- [Role System](#role-system)

---

## Assumptions

The following assumptions were made during the design and implementation of this project:

- **Single database node.** SQLite is used for simplicity. In a production system a multi-writer-capable database (e.g. PostgreSQL) would be used instead.
- **Single backend instance.** The `QueueWorker` runs in-process. Scaling to multiple backend instances would require an external job queue (e.g. BullMQ, SQS) to avoid duplicate job processing.
- **Photo assets are pre-existing.** The `recolour-case/` directory and its subfolders (`Ticket 1/`, `Ticket 2/`, etc.) must be present before the backend starts. The application does not upload or manage photo files itself.
- **Photoset = one ticket at a time.** No validation prevents the same photoset from being used in multiple open tickets simultaneously; that constraint is assumed to be enforced by the operator workflow.
- **Partner processing is simulated.** The `QueueWorker` does not call a real external partner API. It simulates processing with a random 20 % failure rate and a configurable delay.
- **No pagination.** All list endpoints return the full result set. This is acceptable for the expected data volume in this exercise but would need pagination in a real system.
- **Role is supplied by the frontend for this project.** In a real production application the authenticated user's role would be resolved server-side (e.g. from a JWT claim or session), and the frontend would never be trusted to declare its own role. Because this project has no authentication layer, the role is passed by the frontend via the `X-Role` request header as a pragmatic stand-in. See [Role System](#role-system) for details.

---

## Architecture

```
recolour-step/
├── backend/    Express + TypeScript + SQLite (better-sqlite3)
└── frontend/   Vue 3 + TypeScript + Vite
```

The **backend** is a REST API server that manages tickets, partners, and a job queue. A background `QueueWorker` polls the jobs table every 500 ms and simulates partner processing (with a configurable 20% random failure rate and exponential backoff retries).

The **frontend** is a Vue 3 SPA that communicates with the backend over HTTP. The active role (operator/manager) is stored in `localStorage` and sent as an `X-Role` header on every request, which the backend validates and enforces.

Photo assets are served as static files from the `recolour-case/` directory (one subfolder per ticket, e.g. `Ticket 1/`, `Ticket 2/`).

---

## Project Structure

```
recolour-step/
├── docker-compose.yml
├── backend/
│   ├── src/
│   │   ├── index.ts                  Entry point — starts server + worker
│   │   ├── app.ts                    Express app factory
│   │   ├── db/
│   │   │   ├── db.ts                 SQLite connection singleton
│   │   │   └── schema.ts             Schema init + seed data
│   │   ├── middleware/
│   │   │   └── role.ts               X-Role header extraction + requireRole guard
│   │   ├── queue/
│   │   │   └── worker.ts             Background QueueWorker (partner simulation)
│   │   ├── repositories/
│   │   │   ├── jobs.repo.ts          Job CRUD + claim/reset logic
│   │   │   ├── partners.repo.ts      Partner list + lookup
│   │   │   └── tickets.repo.ts       Ticket CRUD + status updates
│   │   ├── routes/
│   │   │   ├── library.ts            GET /api/library/approved
│   │   │   ├── overview.ts           GET /api/overview/partners (manager only)
│   │   │   ├── photosets.ts          GET /api/photosets
│   │   │   └── tickets.ts            Full ticket CRUD + action endpoint
│   │   ├── services/
│   │   │   └── photosets.service.ts  Reads photoset folders from disk
│   │   └── types/
│   │       └── models.ts             Shared TypeScript interfaces
│   ├── test/
│   │   └── queue/
│   │       └── tickets.queue.test.ts Integration tests (in-memory SQLite)
│   ├── jest.config.js
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── main.ts                   App entry point
    │   ├── App.vue                   Shell: topbar, nav, role selector
    │   ├── api.ts                    Typed API client
    │   ├── role.ts                   Role type + injection key
    │   ├── style.css                 Global CSS (layout, buttons, badges, tables)
    │   ├── router/
    │   │   └── index.ts              Vue Router routes
    │   └── pages/
    │       ├── TicketQueue.vue       View + manage all tickets
    │       ├── CreateTicket.vue      Create a new ticket from a photoset
    │       ├── ApprovedLibrary.vue   Browse approved tickets
    │       └── PartnerOverview.vue   Per-partner ticket counts (manager only)
    ├── index.html
    ├── vite.config.ts
    ├── package.json
    └── tsconfig.json
```

---

## Prerequisites

- **Node.js** 18+ and **npm**
- **Docker** and **Docker Compose** (for the Docker path)
- The `recolour-case/` directory must exist at `../recolour-case` relative to `recolour-step/` (i.e. as a sibling folder). It contains the ticket photo subfolders (`Ticket 1/`, `Ticket 2/`, etc.).

---

## Running Locally (without Docker)

### 1. Backend

```bash
cd backend
npm install
npm run dev
```

The server starts on **http://localhost:3000**.

The SQLite database file is created automatically at `backend/data/db.sqlite` on first run. Two partners (`Partner A` and `Partner B`) are seeded automatically.

**Environment variables (optional):**

| Variable    | Default                                   | Description                            |
|-------------|-------------------------------------------|----------------------------------------|
| `PORT`      | `3000`                                    | Port the server listens on             |
| `ASSETS_DIR`| `../../recolour-case` (relative to cwd)   | Path to the photo assets directory     |
| `DB_PATH`   | `./data/db.sqlite`                        | Path to the SQLite database file       |

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server starts on **http://localhost:5173**.

**Environment variables (optional):**

| Variable        | Default                   | Description              |
|-----------------|---------------------------|--------------------------|
| `VITE_API_BASE` | `http://localhost:3000`   | Backend API base URL     |

Create a `.env` file in `frontend/` to override:

```env
VITE_API_BASE=http://localhost:3000
```

---

## Running with Docker

From the `recolour-step/` directory:

```bash
docker compose up --build -d
```

| Service    | URL                        |
|------------|----------------------------|
| Frontend   | http://localhost:5173       |
| Backend    | http://localhost:3000       |

The backend mounts `../recolour-case` as a read-only volume at `/workspace/recolour-case`. SQLite data is persisted in the `backend_data` named volume.

To stop and remove containers:

```bash
docker compose down
```

To also remove the persistent database volume:

```bash
docker compose down -v
```

---

## Running Tests

Tests are in the backend only. They use an in-memory SQLite database so no setup is required.

```bash
cd backend
npm install
npm test
```

The test suite covers:

| Test | Description |
|------|-------------|
| Sending a ticket twice | Verifies idempotency — only one job is created |
| Approve before ready | Verifies a 400 is returned if ticket is not `awaiting_approval` |
| Full approval flow | Sends a ticket, waits for the worker to process it, approves it, and confirms it appears in the library |

Tests run with `--runInBand` (serially) because they share an in-memory database.

---

## Database Schema

The backend uses a single SQLite file with five tables:

### `partners`

| Column        | Type    | Description                                |
|---------------|---------|--------------------------------------------|
| `id`          | TEXT PK | e.g. `p1`, `p2`                            |
| `name`        | TEXT    | Display name, e.g. `Partner A`             |
| `concurrency` | INTEGER | Max parallel jobs this partner can handle  |

Seeded with two partners on first run.

### `tickets`

| Column               | Type    | Description                                  |
|----------------------|---------|----------------------------------------------|
| `id`                 | TEXT PK | e.g. `t_1234567890_abc`                      |
| `photoSetId`         | TEXT    | Name of the photoset folder, e.g. `Ticket 1` |
| `priority`           | TEXT    | `low` \| `medium` \| `high`                  |
| `partnerId`          | TEXT FK | References `partners.id`                     |
| `status`             | TEXT    | See [Ticket Lifecycle](#ticket-lifecycle)     |
| `referenceImagePath` | TEXT    | URL path to the reference image              |
| `createdAt`          | TEXT    | ISO 8601 timestamp                           |
| `updatedAt`          | TEXT    | ISO 8601 timestamp                           |

### `ticket_photos`

| Column     | Type    | Description                          |
|------------|---------|--------------------------------------|
| `ticketId` | TEXT FK | References `tickets.id` (cascade)    |
| `path`     | TEXT    | URL path to the product photo        |

Composite PK on `(ticketId, path)`.

### `ticket_history`

| Column     | Type    | Description                          |
|------------|---------|--------------------------------------|
| `id`       | TEXT PK |                                      |
| `ticketId` | TEXT FK | References `tickets.id` (cascade)    |
| `at`       | TEXT    | ISO 8601 timestamp of the event      |
| `action`   | TEXT    | Human-readable description           |

### `jobs`

| Column        | Type    | Description                                         |
|---------------|---------|-----------------------------------------------------|
| `id`          | TEXT PK |                                                     |
| `ticketId`    | TEXT FK | References `tickets.id` (cascade). Unique.          |
| `partnerId`   | TEXT FK | References `partners.id`                            |
| `status`      | TEXT    | `queued` \| `running` \| `done` \| `failed`         |
| `attempts`    | INTEGER | Number of attempts made so far                      |
| `maxAttempts` | INTEGER | Max attempts before marking as permanently failed   |
| `lastError`   | TEXT    | Error message from the last failed attempt          |
| `runAfter`    | TEXT    | ISO 8601 — job will not be claimed before this time |
| `createdAt`   | TEXT    | ISO 8601 timestamp                                  |
| `updatedAt`   | TEXT    | ISO 8601 timestamp                                  |

**Indexes:** `idx_tickets_status`, `idx_tickets_partner`, `idx_jobs_status_runAfter`

---

## API Reference

All endpoints are prefixed with `/api`.

### Partners

| Method | Path            | Role | Description         |
|--------|-----------------|------|---------------------|
| GET    | `/partners`     | any  | List all partners   |

### Photosets

| Method | Path            | Role | Description                                   |
|--------|-----------------|------|-----------------------------------------------|
| GET    | `/photosets`    | any  | List photoset folders from disk with photo URLs |

### Tickets

| Method | Path                     | Role     | Description                              |
|--------|--------------------------|----------|------------------------------------------|
| GET    | `/tickets`               | any      | List tickets (filterable by `status`, `partnerId`, `priority`) |
| GET    | `/tickets/:id`           | any      | Get a single ticket with photos + history |
| POST   | `/tickets`               | operator | Create a ticket (`photoSetId`, `priority`, `partnerId`) |
| POST   | `/tickets/:id/action`    | varies   | Perform an action on a ticket (see below) |

**Actions** (`POST /tickets/:id/action` with body `{ "action": "..." }`):

| Action            | Required role | Valid from status              |
|-------------------|---------------|--------------------------------|
| `send_to_partner` | operator      | `pending`, `rejected`          |
| `approve`         | manager       | `awaiting_approval`            |
| `reject`          | manager       | `awaiting_approval`            |

### Library

| Method | Path                   | Role | Description                 |
|--------|------------------------|------|-----------------------------|
| GET    | `/library/approved`    | any  | List approved tickets       |

### Overview

| Method | Path                   | Role    | Description                              |
|--------|------------------------|---------|------------------------------------------|
| GET    | `/overview/partners`   | manager | Per-partner ticket counts by status      |

### Jobs

| Method | Path     | Role | Description        |
|--------|----------|------|--------------------|
| GET    | `/jobs`  | any  | List all jobs      |

### Static Assets

Photo files are served from `GET /assets/:folder/:file` (e.g. `/assets/Ticket%201/photo.jpg`).

---

## Ticket Lifecycle

```
                    [operator: send_to_partner]
pending ──────────────────────────────────────► queued
   ▲                                               │
   │                                               │ worker claims job
   │                                               ▼
rejected ◄────────────────────────────────── in_progress
   │          worker: max attempts reached         │
   │                                               │ worker: success
   │  [operator: send_to_partner]                  ▼
   └───────────────────────────────────── awaiting_approval
                                               │         │
                               [manager: approve]       [manager: reject]
                                               │         │
                                               ▼         ▼
                                           approved   rejected
```

**Retry backoff:** on failure the job is re-queued with a delay of 2 s (attempt 1), 5 s (attempt 2), or 10 s (attempt 3+). After `maxAttempts` (default 3) the ticket moves to `rejected`.

Tickets are listed ordered by priority: **high → medium → low**.

---

## Role System

> **Note — production vs. this project**
>
> In a production system the user's role should **never** be determined by the frontend. It should be resolved server-side from a trusted identity source (e.g. a JWT claim, an OAuth token, or a session cookie) so that clients cannot self-elevate privileges. Because this project has **no authentication layer**, the role is handled as a UI-level convenience instead: the user picks their role from a dropdown, and every request carries it in the `X-Role` header. The backend validates and enforces the header value, but it trusts the client to supply it honestly. This is a shortcut for a demo/exercise context and is explicitly **not** recommended for production use.

The role is selected in the UI (top-right dropdown) and stored in `localStorage`. It is sent on every API request as the `X-Role` header. The backend validates the header and enforces access:

| Role       | Can do                                                      |
|------------|-------------------------------------------------------------|
| `operator` | Create tickets, send tickets to partner, view queue         |
| `manager`  | Approve/reject tickets, view partner overview               |
| both       | View ticket queue, approved library, photosets, partners    |

The Overview nav item is hidden from operators in the UI.
