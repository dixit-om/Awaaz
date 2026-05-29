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

## Repo Structure (Planned / Target)

awaaz/
├── apps/
│ ├── web/ # Citizen-facing web app (Next.js)
│ ├── server/ # Express + tRPC API server
│ └── admin/ # Admin panel (Next.js)
│
├── packages/
│ ├── trpc/ # Shared tRPC routers & AppRouter type
│ ├── db/ # Prisma schema + db client
│ ├── ui/ # Shared UI components
│ ├── validation/ # Zod schemas / validators
│ ├── types/ # Shared types
│ ├── config/ # Environment validation (Zod)
│ ├── utils/ # Shared utilities
│ ├── eslint-config/
│ └── typescript-config/

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

| Command          | Description            |
| ---------------- | ---------------------- |
| `pnpm dev`       | Start all apps (Turbo) |
| `pnpm build`     | Production build       |
| `pnpm typecheck` | TypeScript check       |
| `pnpm lint`      | ESLint across monorepo |
| `pnpm format`    | Format with Prettier   |
| `pnpm db:studio` | Open Prisma Studio     |

## MVP Focus

The first milestone prioritizes the core complaint system:

- **Authentication**
- **Complaint reporting**
- **GPS mapping + constituency detection**
- **Authority/MLA assignment**
- **Status tracking + history**
- **Citizen verification**
- **Public leaderboard**

Advanced AI features and deeper analytics come after the MVP foundation is stable.
