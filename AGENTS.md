<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Repo facts

- Single Next.js App Router app at the repo root. No `src/`, workspace packages, or monorepo tooling.
- `@/*` maps to the repo root via `tsconfig.json`, not to `src/`.
- Runtime dependencies are only `next`, `react`, and `react-dom`; no DB, auth, state, or test libraries are installed yet.

## Commands

- `npm run dev` — Turbopack dev server. If one is already running, Next reports its URL/PID via `.next/dev/lock`; reuse it instead of killing the session.
- `npm run lint` — ESLint flat config. `next build` does **not** lint (Next 16 removed `next lint`).
- `npx next typegen`, then `npx tsc --noEmit` — focused typecheck. `next-env.d.ts` and `.next/types` are generated and gitignored, so run `typegen` first on a clean checkout.
- `npm run build` — production build; includes TypeScript checking.
- No test runner or `test` script exists. No CI/pre-commit config either, so verification is manual.

## Next.js 16 / Cache Components

- `next.config.ts` enables `cacheComponents` and `partialPrefetching`. Data is dynamic by default; use `"use cache"` + `cacheLife`/`cacheTag` to cache, or wrap uncached/runtime-data UI in `<Suspense>` (or a `loading.js` boundary). Uncached data outside a boundary fails `next build`.
- Do not add `runtime`, `dynamic`, `dynamicParams`, `revalidate`, or `fetchCache` exports under `cacheComponents`; they are removed. Cache Components is Node-only, and GET route handlers follow the same prerender rules as pages.
- Use the globally generated `PageProps<'/route'>`, `LayoutProps<'/route'>`, and `RouteContext<'/route'>` helpers instead of hand-written params types. Re-run `next typegen` after adding routes.
- Tailwind is v4, wired through the `@tailwindcss/turbopack` loader in `next.config.ts` and configured CSS-first with `@theme` in `app/globals.css`. Don't add a Tailwind v3 config or a PostCSS setup for it.
- Automatic prefetching does not run in `next dev`; verify `<Link>` prefetch/instant-navigation behavior by running `npm run build`, then `npm start`.
- `experimental.agentFeedback` is enabled, so `next dev` may inject/restore a managed `nextjs-agent-feedback` block here. Keep `nextjs-*` managed blocks intact and commit this file with your changes.

## Workflow

- README prescribes spec-driven development via the external `/spec` and `/spec-impl` skills from `Klerith/fernando-skills`; they are not vendored in this repo. Use them for non-trivial features when available.
