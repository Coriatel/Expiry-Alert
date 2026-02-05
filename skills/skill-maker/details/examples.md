# Skill Maker  -  Examples

## Example 1: Creating a "support-triage" Skill

### Context
Support incidents need a consistent intake and triage workflow.

### Steps
1. Create `skills/support-triage/` with `skill.md` and `details/` files.
2. In `skill.md`, define required inputs (ticket ID, customer impact, severity).
3. Add a checklist for severity classification and escalation.
4. Update all index files and `.cursor/rules/120-skills-index.md`.

---

## Example 2: Updating an Existing Skill

### Context
The API patterns changed to require new auth headers.

### Steps
1. Update `skills/api-express/skill.md` to include the new header.
2. Add an example in `skills/api-express/details/examples.md`.
3. Update `skills/INDEX.md`, `skills/INDEX-CLAUDE.md`, and `skills/INDEX-GEMINI.md` if the scenarios changed.
4. Update `.cursor/rules/120-skills-index.md` if the skill picker text needs changes.
