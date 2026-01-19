# Skill Maker  -  Anti-Patterns

## Anti-Pattern 1: Vague Steps
DON'T: "Set up the system as needed."
DO: "Create `config/app.yml` with X, Y, Z fields."
Why: Vague steps are not reproducible.

## Anti-Pattern 2: Duplicating Policies
DON'T: Copy entire policy rules into a skill.
DO: Link to `.cursor/rules/` and keep skills focused.
Why: Policies change; duplication causes drift.

## Anti-Pattern 3: Missing Index Updates
DON'T: Add a new skill without updating indexes.
DO: Update Codex, Claude, and Gemini index files.
Why: Unindexed skills are effectively invisible.

## Anti-Pattern 4: Overly Broad Skills
DON'T: Combine multiple workflows into one skill.
DO: Split by workflow when steps diverge.
Why: Narrow scope keeps skills usable and clear.
