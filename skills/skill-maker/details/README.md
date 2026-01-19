# Skill Maker  -  Patterns and Guidance

## Overview
A good skill is a short execution guide that removes ambiguity and keeps the work repeatable. It should be clear enough for another agent or developer to follow without extra back-and-forth.

## Naming and Scope
- Use kebab-case names.
- Keep scope narrow; one workflow per skill.
- Prefer updating an existing skill instead of creating a near-duplicate.

## Skill Content Guidelines
- Use imperative language.
- Keep steps actionable and ordered.
- Include defaults to reduce questions.
- Separate policy guidance into `.cursor/rules/`.

## Details Files
- README: concepts, patterns, edge cases.
- examples: real scenarios, not placeholders.
- checklist: clear acceptance criteria.
- anti-patterns: common mistakes with fixes.

## Index Hygiene
Every new skill must be added to all model indexes:
- `skills/INDEX.md`
- `skills/INDEX-CLAUDE.md`
- `skills/INDEX-GEMINI.md`

For Codex, also update `.cursor/rules/120-skills-index.md` to keep the skill picker current.

## Consistency Checks
- Use consistent headings across skills.
- Keep references to files or policies accurate.
- Avoid large blocks of untested or speculative content.
