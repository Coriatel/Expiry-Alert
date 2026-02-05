# Skill Maker  -  Create or Update a Skill in This Library

## Purpose
Create a new skill (or update an existing one) that provides a repeatable, step-by-step execution guide in this repository.

## When to Use This Skill
Use when:
- No existing skill fits the task or workflow
- A repeatable process needs a standard playbook
- You need to update a skill after new learnings

Do NOT use when:
- Writing policies (use `.cursor/rules/`)
- Writing one-off notes or internal memos

## Required Inputs
1. **Skill name**: Kebab-case (e.g., `prd-creator`, `api-express`)
2. **Purpose**: 1-2 sentences describing the task
3. **Target scenarios**: 3-6 concrete use cases
4. **Required inputs**: What the user must provide
5. **Outputs**: Files or artifacts produced
6. **Related policies**: Which `.cursor/rules/` apply (if any)

Defaults:
- Skill location: `skills/{skill-name}/`
- Main file: `skills/{skill-name}/skill.md`
- Details files in `skills/{skill-name}/details/`

## Steps

### 1) Confirm scope and reuse
- Check `skills/INDEX.md` and existing skills for overlap.
- If a skill is close, update it instead of creating a new one.

### 2) Create the skill structure
Create the directory and details files:

```bash
mkdir -p skills/{skill-name}/details
```

Required files:
- `skills/{skill-name}/skill.md`
- `skills/{skill-name}/details/README.md`
- `skills/{skill-name}/details/examples.md`
- `skills/{skill-name}/details/checklist.md`
- `skills/{skill-name}/details/anti-patterns.md`

### 3) Write `skill.md`
Use this structure:

- Purpose
- When to Use / Do NOT Use
- Required Inputs
- Steps (clear, numbered)
- Expected Outputs
- Validation
- Related Skills
- See Also (details files)

Keep it concise and execution-focused.

### 4) Write details files
- README: guidance, patterns, and edge cases
- examples: 2-5 practical examples
- checklist: definition of done
- anti-patterns: common mistakes and fixes

### 5) Link to policies
- Reference relevant `.cursor/rules/` in the skill or details.
- Keep policies in `.cursor/rules/`; do not duplicate them in skills.

### 6) Update model skill indexes (required)
After creating or updating a skill, update all model indexes:
- Codex: `skills/INDEX.md`
- Claude: `skills/INDEX-CLAUDE.md`
- Gemini: `skills/INDEX-GEMINI.md`

Also update:
- `skills/README.md` (new skill entry)
- `.cursor/rules/120-skills-index.md` (Codex skill picker)

### 7) Validate
- Paths and filenames are correct.
- No secrets or credentials are stored.
- Steps are clear and testable.
- Indexes and README include the new skill.

## Expected Outputs
- New or updated `skills/{skill-name}/` directory
- Updated skill indexes for Codex, Claude, and Gemini
- Updated `skills/README.md` and `.cursor/rules/120-skills-index.md`

## Validation
1. Skill is discoverable from all index files.
2. Steps are actionable without extra clarification.
3. Details files are present and consistent.

## Related Skills
- `skills/00-template/skill.md`  -  Template for skill structure

## See Also
- Details: `./details/README.md`
- Examples: `./details/examples.md`
- Checklist: `./details/checklist.md`
- Anti-Patterns: `./details/anti-patterns.md`
