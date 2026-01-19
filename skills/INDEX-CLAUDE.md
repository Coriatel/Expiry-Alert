# Claude Skills & Policy Index

Single place to pick the right skill or reference when working in this repo. Paths are workspace-relative.

## How to Use
- Read the relevant policy in `.cursor/rules/` before executing a skill.
- Paste the chosen `skill.md` into Claude, then follow it step by step.
- Open `details/` files only when needed.
- If no skill fits, use `skills/skill-maker/skill.md` to create one and update all model indexes.

## Skill Picker (with scenarios and policy pairs)
- UI components/layouts: `skills/ui/skill.md`  -  React + SCSS + a11y. Scenarios: new component/page, interactive widget, layout update, accessibility fix. Policies: `020-ui-react-scss-a11y.md`, add `030-rtl-hebrew.md` for RTL, `040-tables-forms.md` when form/table UX applies.
- Data tables: `skills/tables/skill.md`  -  sortable/filterable/paginated tables. Scenarios: admin grids, searchable lists (>20 rows), paginated dashboards. Policies: `040-tables-forms.md`, plus `020-ui-react-scss-a11y.md`.
- React page scaffold: `skills/add-react-page.md`  -  new page, routing, i18n. Scenarios: adding profile/about/dashboard pages, wiring nav links, i18n text. Policies: `020-ui-react-scss-a11y.md`, `030-rtl-hebrew.md`.
- API endpoint: `skills/add-api-route.md`  -  REST route with validation/RBAC. Scenarios: new CRUD route, feature-specific endpoint, secured POST with schema validation. Policies: `050-api-express.md`, `060-auth-rbac.md`, `070-prisma-postgres.md`.
- Database migration: `skills/database-migration.md`  -  Prisma/Postgres schema changes. Scenarios: new table/column/index, relation change, backfill-safe migration. Policy: `070-prisma-postgres.md`.
- RBAC setup: `skills/rbac-setup.md`  -  role-based access control wiring. Scenarios: new roles/permissions, protecting routes/actions, audits of existing guards. Policy: `060-auth-rbac.md`.
- Testing: `skills/testing.md`  -  unit/integration/E2E. Scenarios: covering new feature, regression repro, API test, UI flow test. Policies: `080-testing-e2e.md`, `010-code-style-js.md`.
- Deployment: `skills/deployment.md`  -  ship CRM to production. Scenarios: main release, hotfix push, verifying post-deploy health. Policies: `090-git-workflow.md`, `100-security-secrets.md`, add `110-hostinger-vps-compliance.md` if deploying to Hostinger.
- Local setup: `skills/getting-started.md`  -  bootstrap dev env. Scenarios: first-time setup, broken local env, onboarding new machine. Policies: `000-overview.md`, `010-code-style-js.md`.
- Terminal/SSH ops: `skills/terminal-ssh-vps/skill.md`  -  safe server commands. Scenarios: inspecting logs, restarting services, disk/CPU checks, controlled edits on remote. Policies: `110-hostinger-vps-compliance.md`, `100-security-secrets.md`.
- Hostinger ops: `skills/hostinger-vps-ops/skill.md`  -  Hostinger-specific hardening/deploy. Scenarios: new Hostinger VPS setup, malware notice response, WordPress deploy with compliance. Policy: `110-hostinger-vps-compliance.md`.
- n8n automations: `skills/n8n-automation/skill.md`  -  build/extend n8n workflows (webhooks, schedules, queues) with validation and alerts. Scenarios: new webhook automation, scheduled sync, queue consumer with idempotency, adding retries/alerts to flaky flow. Policies: `100-security-secrets.md`, `090-git-workflow.md`, add `110-hostinger-vps-compliance.md` if hosted on Hostinger.
- PRD creation: `skills/prd-creator/skill.md`  -  draft Product Requirements Documents. Scenarios: new feature, major workflow change, stakeholder alignment on scope. Policies: `000-overview.md`.
- Skill authoring: `skills/skill-maker/skill.md`  -  create/update skills and update model indexes. Scenarios: new skills, skill revisions after learnings. Policies: `090-git-workflow.md`.
- Skill template: `skills/00-template/skill.md`  -  use with `skills/README.md` for structure guidance. Scenarios: when no existing skill fits, author a new one to standardize a workflow.

## Reference Packs (details only, pair with above)
- Express API patterns: `skills/api-express/details/`
- Auth/RBAC patterns: `skills/auth-rbac/details/`
- Prisma/Postgres patterns: `skills/prisma-postgres/details/`
- CI/CD patterns: `skills/ci-cd/details/`
- Testing patterns: `skills/testing-e2e/details/`
- UI patterns: `skills/ui/details/`

## Policy Map (quick lookup)
- UI/React: `.cursor/rules/020-ui-react-scss-a11y.md`
- RTL/Hebrew: `.cursor/rules/030-rtl-hebrew.md`
- Tables/Forms: `.cursor/rules/040-tables-forms.md`
- API/Express: `.cursor/rules/050-api-express.md`
- Auth/RBAC: `.cursor/rules/060-auth-rbac.md`
- Prisma/Postgres: `.cursor/rules/070-prisma-postgres.md`
- Testing: `.cursor/rules/080-testing-e2e.md`
- Git workflow: `.cursor/rules/090-git-workflow.md`
- Security/Secrets: `.cursor/rules/100-security-secrets.md`
- Hostinger compliance: `.cursor/rules/110-hostinger-vps-compliance.md`
