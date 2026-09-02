# Interviewly

Interviewly is an AI-powered interview preparation platform designed to provide personalized interview practice based on a user's CV, job description, target role, and experience level.

## Tech Stack

### Frontend
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui

### Backend
- NestJS
- TypeScript

### Database
- PostgreSQL
- Prisma

### Package Management
- pnpm
- pnpm Workspace

## Project Structure

```text
interviewly/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # NestJS backend
│
├── packages/         # Shared packages
│
├── package.json
├── pnpm-lock.yaml
└── pnpm-workspace.yaml
```

## Requirements

Make sure the following are installed:

- Node.js
- pnpm
- PostgreSQL

## Installation

Install all dependencies from the project root:

```bash
pnpm install
```

## Development

Run both frontend and backend:

```bash
pnpm dev
```

Run the frontend only:

```bash
pnpm dev:web
```

Run the backend only:

```bash
pnpm dev:api
```

## Build

Build both applications:

```bash
pnpm build
```

Build individually:

```bash
pnpm build:web
pnpm build:api
```

## Production

After building the applications, start both:

```bash
pnpm start
```

Or start them individually:

```bash
pnpm start:web
pnpm start:api
```

## Local Development

| Application | URL |
| --- | --- |
| Frontend | `http://localhost:3000` |
| Backend | `http://localhost:4000` |

## Status

Interviewly is currently under development.