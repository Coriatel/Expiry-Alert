# Cursor Rules — Development Policy Library Overview

## Purpose

This directory contains modular, reusable Cursor Rules that enforce consistent architecture, coding standards, and workflow patterns across projects.

## How to Use These Rules

### Option 1: Copy to Your Project
Copy this entire `.cursor/rules/` directory into your project's `.cursor/` folder.

### Option 2: Reference from Root
Cursor automatically loads `.cursorrules` from your project root. You can combine these modular rules into a single `.cursorrules` file.

### Option 3: Use the Apply Script
Run the provided script to copy or symlink these rules into your project:
```bash
# From this repo
./scripts/apply-policies.sh /path/to/your/project

# On Windows
.\scripts\apply-policies.ps1 C:\path\to\your\project
```

## Rules Structure

Rules are numbered for logical loading order:

- **000-overview.md** — This file (overview and usage)
- **010-code-style-js.md** — JavaScript/ES6+ style conventions
- **020-ui-react-scss-a11y.md** — React UI, SCSS, accessibility patterns
- **030-rtl-hebrew.md** — RTL support and Hebrew-first UI policies
- **040-tables-forms.md** — Data tables, forms, sorting, filtering, pagination
- **050-api-express.md** — Express API patterns, REST conventions, validation
- **060-auth-rbac.md** — Authentication and role-based access control
- **070-prisma-postgres.md** — Prisma ORM with PostgreSQL best practices
- **080-testing-e2e.md** — Unit, integration, and E2E testing policies
- **090-git-workflow.md** — Git commit style, branching, PR conventions
- **100-security-secrets.md** — Security best practices, secrets handling, logging
- **110-hostinger-vps-compliance.md** — Hostinger VPS ToS compliance, AI agent safety

## Core Philosophy

### Autonomous by Default
All rules instruct AI assistants and developers to:
- **Proceed without endless questions** — Use sensible defaults
- **Only ask when blocked** — Destructive actions, secrets, or true blockers
- **Document assumptions** — Make decisions transparent

### Project-Agnostic
These rules are intentionally generic and portable. Customize them by:
1. Copying to your project
2. Adding project-specific overrides
3. Creating a local `.cursor/rules/999-project-overrides.md` file

### Definition of Done
Each rule category includes:
- ✅ Clear acceptance criteria
- 🚫 Anti-patterns to avoid
- 📝 Concrete examples
- 🔗 Links to related skills and documentation

## Integration with Claude Skills

These rules work hand-in-hand with the `/skills/` library:
- **Rules** define policies and constraints
- **Skills** provide step-by-step execution guides

Example workflow:
1. Developer requests: "Add a new API endpoint"
2. AI reads: `.cursor/rules/050-api-express.md` (policy)
3. AI executes: `/skills/api-express/skill.md` (step-by-step)

## Customization Guidelines

### Adding Project-Specific Rules
Create additional numbered files:
```
.cursor/rules/110-project-db-schema.md
.cursor/rules/120-project-deployment.md
```

### Overriding Default Rules
Create a high-numbered override file:
```
.cursor/rules/999-overrides.md
```

Example override:
```markdown
# Project-Specific Overrides

## Code Style Exception
This project uses TypeScript instead of JavaScript.
See: 010-code-style-js.md for base patterns, adapted to TS.
```

### Disabling Rules
If a rule doesn't apply to your project:
1. Delete the file from your local `.cursor/rules/`
2. Document the decision in your project README
3. Or add a comment at the top: `<!-- DISABLED: Not applicable to this project -->`

## Maintenance

When extending this library:
1. Keep rules **modular** — one concern per file
2. Keep rules **portable** — no hardcoded project names
3. Keep rules **actionable** — clear do's and don'ts
4. Add examples for clarity

## See Also

- [Cursor Rules Root Fallback](/RULES_CURSOR.md) — Summary of all rules
- [Skills Library](/skills/README.md) — Step-by-step execution guides
- [Usage with Cursor](/docs/USAGE_WITH_CURSOR.md) — Integration guide
- [Usage with Claude Code](/docs/USAGE_WITH_CLAUDE_CODE.md) — CLI integration guide
- [Architecture of Policies](/docs/ARCHITECTURE_OF_POLICIES.md) — How rules and skills relate

---

**Last Updated**: 2025-12-31
**License**: MIT
**Maintained by**: Development Policy Library Project
