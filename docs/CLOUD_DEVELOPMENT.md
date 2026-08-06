# Cloud Development and Builds

## Short Answer

Yes. Builds, tests, previews, and even the complete development workspace can run in the cloud. Local `node_modules`, `.next`, browser binaries, and build caches are then unnecessary.

The repository already has a cloud CI foundation:

- GitHub Actions runs security scans, dependency audit, lint, typecheck, unit tests, integration tests, production build, Playwright E2E, and Lighthouse.
- Vercel can build every pushed branch and pull request remotely through Git integration and provide a preview URL.

Step-by-step GitHub + Vercel linking: [VERCEL_GITHUB_SETUP.md](./VERCEL_GITHUB_SETUP.md).

GitHub Codespaces: use [.devcontainer/devcontainer.json](../.devcontainer/devcontainer.json) (**Code → Codespaces**).

## Recommended Workflow

### Normal Feature Development

1. Develop on a feature branch.
2. Run only the smallest relevant local test when rapid feedback is needed.
3. Push the branch.
4. GitHub Actions runs the complete quality pipeline on hosted runners.
5. Vercel creates a remote preview build.
6. Review the preview URL and CI results.
7. Merge only after required checks pass.

With this workflow the local machine needs the source checkout, but a local production build is not required.

### Zero-Local-Build Workflow

Use a remote development workspace such as GitHub Codespaces, Cursor Cloud Agents, or a team-managed remote machine:

- repository checkout and `node_modules` live remotely
- development server and tests run remotely
- browser preview is forwarded over HTTPS
- commits and pull requests remain the handoff mechanism
- Vercel still creates the deployable preview artifact

This is the best option when the goal is to avoid local dependency and build storage entirely.

## Storage Impact

The largest local consumers are normally:

- `node_modules`
- `.next`
- Playwright browser downloads
- npm and Prisma caches

Cloud CI and Vercel do not require these directories locally. A developer who relies on remote checks can remove generated local directories when they are no longer needed; source files and the Git checkout remain local unless a fully remote workspace is used.

Do not commit generated build output, caches, `.vercel`, or environment files.

## Responsibilities by Platform

### GitHub Actions

- authoritative quality gates
- security and secret scans
- database-backed integration/E2E tests with disposable PostgreSQL
- reproducible build verification

### Vercel

- Next.js remote build
- branch and pull-request preview URLs
- production deployment and rollback
- environment-specific runtime variables

### Remote Development Workspace

- interactive editor, terminal, dependency installation, and dev server
- optional replacement for local Node.js and browser tooling

CI and Vercel are not a convenient interactive development environment by themselves; use a Codespace, Cloud Agent, or remote machine when live development must also leave the laptop.

## Guardrails

- Preview and CI use sandbox credentials and synthetic data, never production customer data.
- Production secrets remain in Vercel or the provider secret store, not GitHub logs or repository files.
- Pin Node.js and package-lock versions so cloud and local results remain reproducible.
- Keep required CI checks branch-protected.
- Cache dependencies only by lockfile hash; do not cache secrets or mutable database state.
- Database migrations are tested in CI/staging but promoted through the controlled process in `OPERATIONS.md`.
- Vercel builds the source commit. Avoid local `vercel deploy --prebuilt` unless a deliberate CI-owned artifact promotion workflow is introduced.

## Optional Follow-up

If fully remote interactive development is selected, add one reviewed environment definition:

- GitHub Codespaces: `.devcontainer/devcontainer.json`
- team remote machine: documented bootstrap and access controls
- Cursor Cloud Agent: repository access, sandbox credentials, and pull-request handoff rules

Choose one primary remote workspace to avoid maintaining several divergent development environments.
