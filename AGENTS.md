# Interviewly Codex Working Agreement

This file defines durable repository-level instructions for Codex. More specific
`AGENTS.md` files override it within their directories. In particular, read
`apps/web/AGENTS.md` before changing the Next.js application.

## Sources of truth

Use evidence in this order when sources disagree:

1. Current source code, database schema, migrations, package scripts, and Git diff.
2. `docs/ai/PROJECT_CONTEXT.md` and `docs/ai/CURRENT_TASK.md`.
3. Other repository documentation.
4. Conversation history and assumptions.

State uncertainty explicitly. Do not turn an old prompt, mockup, or compacted
conversation detail into a repository fact without checking it.

## Required startup routine

Before starting a task:

1. Read this file completely.
2. Read `docs/ai/PROJECT_CONTEXT.md` and `docs/ai/CURRENT_TASK.md` when present.
3. Read the nearest nested `AGENTS.md` for every area that may be changed.
4. Inspect targeted `git status` and `git diff`; preserve all user changes.
5. Read only the files needed for the active task and their direct dependencies.

Before beginning a new phase, summarize your understanding, intended scope,
likely files, validation plan, and unresolved assumptions. Wait for the user's
confirmation before implementing that phase.

## Scope and repository safety

- Work only within the requested task. Do not opportunistically refactor adjacent
  modules or redesign established architecture.
- Do not scan the whole repository when targeted searches and direct imports are
  sufficient.
- Treat the working tree as shared and potentially dirty. Never discard, overwrite,
  or reformat unrelated changes.
- Do not run destructive Git commands. Do not commit, push, reset, or amend unless
  the user explicitly requests it.
- Do not create parallel implementations when an equivalent service, hook, query
  key, component, DTO, or utility already exists.
- Prefer small, reversible patches. Report every file changed for the task.

## Verified repository architecture

- pnpm monorepo with `apps/web` and `apps/api`.
- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS 4, TanStack Query,
  Axios, React Hook Form, Zod, Radix/shadcn components, and Tiptap where rich text
  is needed.
- Backend: NestJS 12, Prisma 7, PostgreSQL, Zod/class-validator, JWT/Passport,
  Swagger, Cloudflare R2 through the S3 SDK, and Google GenAI integrations.
- Browser authentication uses HttpOnly cookies. The established current-user
  source of truth is the TanStack Query-backed `/auth/me` flow; do not duplicate
  authenticated user state in another store.

## Frontend conventions

- Follow `apps/web/AGENTS.md`. This Next.js version has breaking changes; consult
  the matching local Next.js documentation before relying on remembered APIs.
- Reuse the existing Axios client, service layer, query keys, TanStack hooks,
  shared UI components, dialogs/drawers, pagination, and data-state components.
- Keep server data in TanStack Query. Do not introduce duplicate Zustand/Redux
  server-state caches.
- Preserve Vietnamese product copy unless the task explicitly changes locale.
- Use the product's primary purple consistently. Avoid arbitrary off-palette colors,
  excessive pill shapes, and one-off component styling.
- Buttons are generally compact, bold, and `rounded-sm` unless a shared component
  or approved design requires otherwise.
- Authenticated page content targets a maximum width of 1600px.
- Header illustrations are decorative/absolute and must not consume layout space.
- Mobile drawers must scroll internally, lock background scrolling, and respect
  safe-area insets. Avoid hidden actions behind browser chrome.
- Responsive behavior must be checked at mobile, tablet, laptop, and desktop widths;
  do not solve overflow by hiding required information.
- Preserve accessibility: semantic headings, labels, keyboard operation, focus
  visibility, dialog focus management, and meaningful empty/error states.

## Backend conventions

- Keep NestJS module boundaries and existing dependency-injection patterns.
- Validate request contracts in DTOs/schemas and keep API response conventions
  consistent with the existing global wrapper.
- User-owned resources must be queried with the authenticated `userId` and relevant
  soft-delete constraints; never trust a URL id alone.
- Prisma schema and migration history are authoritative. Do not edit an applied
  migration; add a new migration for new invariants.
- Keep provider/internal errors out of public responses while retaining useful
  structured error codes and server logs.
- Avoid `any` as a shortcut around contract or Prisma typing issues.

## Validation and testing

- Read the actual package scripts before choosing commands; do not invent commands.
- Start with focused tests for changed behavior, then proportionate typecheck/lint
  or build validation when needed.
- Do not run the entire test suite or production build unless the task warrants it
  or the user requests it.
- Do not add a new test framework when an application already has one.
- Frontend test tooling already includes Node tests, Vitest, and Playwright.
  Backend test tooling uses Jest and e2e scripts.
- Report exact commands, results, skipped checks, and remaining risk.

## Handoff discipline

At the end of meaningful work, update `docs/ai/CURRENT_TASK.md` only when the user
asks for handoff documentation or the task explicitly includes it. Keep it factual,
short, and aligned with current Git state. Move durable facts to
`docs/ai/PROJECT_CONTEXT.md`; do not copy the conversation transcript.
