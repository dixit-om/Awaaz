## AWAAZ — Civic Engagement & Governance Transparency Platform

AWAAZ is a citizen-driven GovTech + CivicTech platform that enables people to report local civic issues and track resolution progress with public transparency and accountability. It bridges the gap between citizens and government authorities by making complaints visible, trackable, and measurable.

## Why AWAAZ

Traditional civic complaint systems often suffer from:

- **Low transparency**: citizens can’t clearly see what’s happening after reporting
- **Weak accountability**: performance of authorities is hard to measure publicly
- **Poor tracking**: limited structured status history and progress visibility
- **Low public trust**: no community verification and open reporting signals

AWAAZ is designed to solve these gaps with a modern, scalable, data-driven platform.

## Vision

To create a transparent, scalable, and technology-driven civic ecosystem where every citizen’s voice contributes toward better governance and smarter cities.

## Mission

- **Empower citizens** through technology
- **Improve governance transparency** and accountability
- **Enable faster issue resolution** with real-time tracking
- **Build data-driven civic intelligence** through analytics and public dashboards

## Core Goals

- **Centralized civic issue reporting**
- **Public transparency and accountability**
- **Real-time complaint tracking**
- **Authority/MLA performance analytics**
- **Community participation and trust**
- **Scalable civic intelligence platform**

## Key Features (MVP + Platform Core)

### Citizen

- **OTP-based authentication**
- **Complaint reporting** with image/video upload
- **GPS capture + geo mapping**
- **Complaint status tracking**
- **Notifications & real-time updates**
- **Citizen verification** (confirm resolution / feedback)

### MLA / Authority

- **Assigned complaints view**
- **Status updates** across the complaint lifecycle
- **Area-wise monitoring** and dashboard insights

### Admin

- **User and complaint moderation**
- **Fake/spam control**
- **Escalation handling**
- **System analytics**

### Public Transparency

- **Public dashboards**
- **MLA/authority leaderboard**
- **Resolution metrics**
- **Heatmaps and geo analytics**

## High-Level Complaint Flow

Citizen Login → Report Issue → Upload Image/Video → Capture GPS Location → Complaint Created → Geo Mapping → MLA/Authority Assigned → Status Tracking → Citizen Verification → Leaderboard Updated

## Architecture

- **Monorepo** using **Turborepo**
- **Modular monolith** approach (module boundaries inside a single system, structured for scale)
- **Shared packages** for UI, validation, types, config, and utilities

## Tech Stack (Finalized)

### Frontend

- **Next.js**, **TypeScript**
- **Tailwind CSS**
- **Redux Toolkit**
- **TanStack Query**
- **tRPC client**
- (Planned UI/Visualization) **Framer Motion**, **Recharts**
- (Maps) **Mapbox**

### Backend

- **Node.js**, **TypeScript**
- **tRPC**, **Zod**
- **Socket.IO** (real-time updates)
- **BullMQ + Redis** (background jobs)

### Database & GIS

- **PostgreSQL**
- **Prisma ORM**
- **PostGIS** (geo queries, mapping, heatmaps)

### Cloud & External Services

- **Cloudinary** (media storage)
- **Firebase Cloud Messaging** (push notifications)
- **Mapbox APIs** (maps / geo utilities)

### Future AI Scope (Post-MVP)

- **OpenAI**, **LangChain**, **Pinecone**
- AI classification, duplicate detection, civic assistant chatbot, predictive analytics, escalation intelligence

## Repo Structure

```
awaaz/
├── apps/
│   ├── web/              # Citizen-facing web app (Next.js)
│   ├── server/           # Express + tRPC API server
│   └── admin/            # Admin panel (Next.js)
│
└── packages/
    ├── auth/             # OTP, JWT, refresh-token logic
    ├── complaints/       # Complaint service, repository, constants
    ├── trpc/             # Root router, tRPC middleware, AppRouter type
    ├── db/               # Prisma schema, client singleton, seed
    ├── types/            # Shared domain types & enums
    ├── validation/       # Zod input schemas
    ├── config/           # Environment variable validation
    ├── ui/               # Shared React UI components
    ├── utils/            # Shared utilities
    ├── eslint-config/
    └── typescript-config/
```

## Core Backend Modules (Planned / Target)

- **Authentication**
- **Users & RBAC** (citizen / mla-authority / admin)
- **Complaints** (creation, assignment, lifecycle)
- **Geo Mapping** (constituency mapping, reverse geocoding, nearby issues)
- **Notifications** (push + in-app, realtime)
- **Leaderboard** (performance scoring, public ranking)
- **Analytics** (heatmaps, trends, resolution performance)
- **MLA/Authority management**

## Database Core Entities (Planned / Target)

### User

- roles: **citizen**, **mla/authority**, **admin**

### Complaint

- **title**, **description**, **category**
- **media** (image/video)
- **location** (GPS / GeoJSON)
- **status**
- **assigned authority/MLA**

### StatusHistory

Tracks the full complaint lifecycle history (status changes over time).

### Leaderboard

Stores authority/MLA rankings and computed performance scores.

## Authentication Strategy (Planned / Target)

- **OTP-based login**
- **JWT access tokens**
- **Refresh tokens**
- **Role-based access control (RBAC)**

## GIS / Geo Features (Planned / Target)

Powered by **PostGIS** and Geo tooling:

- **GeoJSON** storage and queries
- **Reverse geocoding**
- **Constituency detection**
- **Nearby issues map**
- **Heatmaps and geo analytics**

## Engineering Tooling

- **Turborepo** + **pnpm workspaces**
- **ESLint**, **Prettier**
- **Husky**, **lint-staged**
- (Future) **Docker**, **GitHub Actions**

## Development Setup

### Prerequisites

- Node.js **20+**
- pnpm **9+**
- PostgreSQL with **PostGIS** extension
- Redis (optional for foundation; required for BullMQ later)

### Quick start

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Generate Prisma client
pnpm db:generate

# Push schema to database (requires PostgreSQL running)
pnpm db:push

# Start all apps in dev mode
pnpm dev
```

### Apps & ports

| App    | Package         | URL                   |
| ------ | --------------- | --------------------- |
| Web    | `@awaaz/web`    | http://localhost:3000 |
| Admin  | `@awaaz/admin`  | http://localhost:3001 |
| Server | `@awaaz/server` | http://localhost:4000 |

### Useful commands

| Command          | Description                       |
| ---------------- | --------------------------------- |
| `pnpm dev`       | Start all apps (Turbo)            |
| `pnpm build`     | Production build                  |
| `pnpm typecheck` | TypeScript check                  |
| `pnpm lint`      | ESLint across monorepo            |
| `pnpm format`    | Format with Prettier              |
| `pnpm db:studio` | Open Prisma Studio                |
| `pnpm db:seed`   | Seed users + complaint categories |

## Authentication (Phase 1 — Complete)

- **OTP login** via Indian mobile (`+91XXXXXXXXXX`)
- **JWT access token** (15 min) + **opaque refresh token** (7 days, rotation on refresh)
- **RBAC roles:** `citizen`, `mla`, `admin`
- **tRPC namespace:** `auth.*`

| Procedure             | Access    | Description                       |
| --------------------- | --------- | --------------------------------- |
| `auth.sendOTP`        | Public    | Send OTP to phone                 |
| `auth.verifyOTP`      | Public    | Verify OTP, returns tokens + user |
| `auth.refreshToken`   | Public    | Rotate refresh token              |
| `auth.logout`         | Protected | Revoke refresh token              |
| `auth.getCurrentUser` | Protected | Current user profile              |

**Local dev:** set `OTP_DEV_MODE=true` in `.env` — OTP is printed to the server console.

**Seeded users** (after `pnpm db:push` + `pnpm db:seed`):

- Admin: `+919876543210`
- MLA: `+919876543211`
- Citizen: `+919876543212`

**Seeded complaint categories** (same command):

| Slug             | Name                  |
| ---------------- | --------------------- |
| `garbage`        | Garbage Issues        |
| `road`           | Road Issues           |
| `water`          | Water Problems        |
| `electricity`    | Electricity Problems  |
| `drainage`       | Drainage Problems     |
| `infrastructure` | Public Infrastructure |

## Complaint Management (Phase 2)

The complaint module is the core domain of AWAAZ. It handles the full lifecycle of a civic issue from submission through resolution.

### Complaint Lifecycle

```
SUBMITTED → ASSIGNED → IN_PROGRESS → RESOLVED → VERIFIED
                                              ↘ REJECTED
```

Every status transition is recorded in an immutable `ComplaintStatusHistory` table — providing a full, auditable trail for every complaint.

### Status Transition Rules

| From          | Allowed Next Statuses     | Who can trigger              |
| ------------- | ------------------------- | ---------------------------- |
| `SUBMITTED`   | `ASSIGNED`, `REJECTED`    | Admin                        |
| `ASSIGNED`    | `IN_PROGRESS`, `REJECTED` | Admin, MLA                   |
| `IN_PROGRESS` | `RESOLVED`                | Admin, MLA                   |
| `RESOLVED`    | `VERIFIED`, `REJECTED`    | Citizen (own complaint only) |
| `VERIFIED`    | — (terminal)              | —                            |
| `REJECTED`    | — (terminal)              | —                            |

### tRPC Procedures — `complaints.*`

| Procedure                          | Access     | Description                             |
| ---------------------------------- | ---------- | --------------------------------------- |
| `complaints.listCategories`        | Public     | All active complaint categories         |
| `complaints.createComplaint`       | Citizen    | Submit a new civic complaint            |
| `complaints.getComplaintById`      | Protected  | Full detail + media + status history    |
| `complaints.listComplaints`        | Protected  | Role-scoped list (own / assigned / all) |
| `complaints.updateComplaintStatus` | Protected  | Advance lifecycle with optional remarks |
| `complaints.deleteComplaint`       | Admin only | Soft-delete a complaint                 |

### Role-based Visibility

| Role      | `listComplaints` scope | Can create | Can update status                                      |
| --------- | ---------------------- | ---------- | ------------------------------------------------------ |
| `citizen` | Own complaints only    | Yes        | Only `VERIFIED` / `REJECTED` on own resolved complaint |
| `mla`     | Assigned complaints    | No         | `IN_PROGRESS`, `RESOLVED`                              |
| `admin`   | All complaints         | No         | All transitions + soft delete                          |

### Complaint Categories (seeded)

| Slug             | Name                  |
| ---------------- | --------------------- |
| `garbage`        | Garbage Issues        |
| `road`           | Road Issues           |
| `water`          | Water Problems        |
| `electricity`    | Electricity Problems  |
| `drainage`       | Drainage Problems     |
| `infrastructure` | Public Infrastructure |

### Database Models

- **`Complaint`** — core entity with title, description, category, GPS coordinates, address, priority, status, and optional authority assignment
- **`ComplaintMedia`** — stores media metadata (URL, type, upload status) — actual upload via Cloudinary in a later phase
- **`ComplaintStatusHistory`** — immutable record of every status change (who changed it, when, and why)
- **`ComplaintCategory`** — lookup table for civic issue categories

### Media Strategy (Current MVP)

Media metadata is stored in `ComplaintMedia` (URL, type, upload status). File uploads via **Cloudinary** and background processing via **BullMQ** are prepared in the schema and will be wired in the media upload phase.

### Geo Strategy (Current MVP)

Raw `latitude`, `longitude`, and `address` are stored on every complaint. **PostGIS**-based constituency detection, nearby-issue queries, and heatmaps are designed in the schema and will be activated in the GIS phase.

---

## Development Progress

| Phase      | Module                                                | Status      |
| ---------- | ----------------------------------------------------- | ----------- |
| Foundation | Turborepo, pnpm, TypeScript, ESLint, Prettier, Husky  | ✅ Complete |
| Foundation | PostgreSQL + Prisma + PostGIS schema                  | ✅ Complete |
| Foundation | Shared packages (types, validation, config, utils)    | ✅ Complete |
| Phase 1    | Authentication (OTP, JWT, refresh tokens, RBAC)       | ✅ Complete |
| Phase 2    | Complaint management (lifecycle, history, categories) | ✅ Complete |
| Phase 3    | Media upload (Cloudinary + BullMQ)                    | Planned     |
| Phase 3    | GIS + constituency mapping (PostGIS)                  | Planned     |
| Phase 4    | Notifications (FCM + Socket.IO)                       | Planned     |
| Phase 4    | MLA assignment engine                                 | Planned     |
| Phase 5    | Leaderboard + analytics dashboards                    | Planned     |
| Phase 6    | Frontend (web + admin)                                | Planned     |
| Future     | AI classification, duplicate detection, civic chatbot | Future      |

## MVP Focus

The first milestone covers the backend complaint system foundation:

- ✅ **Authentication** — OTP login, JWT, refresh tokens, RBAC
- ✅ **Complaint reporting** — create, list, detail, status updates, soft delete
- ✅ **Status lifecycle** — immutable history for full auditability
- ✅ **Role-based access** — citizen / mla / admin scoping
- ⬜ **Media upload** — Cloudinary integration
- ⬜ **GPS mapping** — PostGIS constituency detection
- ⬜ **Authority assignment** — MLA area mapping
- ⬜ **Citizen verification** — confirm resolution feedback
- ⬜ **Public leaderboard** — authority performance scoring

Advanced AI features and deeper analytics come after the MVP foundation is stable.
