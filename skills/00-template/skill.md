# Skill Template

## Purpose

This template provides a standardized structure for creating autonomous, execution-focused skills. Skills are step-by-step guides that enable AI assistants and developers to complete specific tasks without endless questions or ambiguity.

**Key Principles:**
- **Autonomous**: Proceed with sensible defaults; only ask when blocked
- **Actionable**: Clear, numbered steps with copy/paste-ready commands
- **Complete**: Cover happy path, edge cases, and validation
- **Concise**: 120-250 lines; link to details/ for deep dives

## When to Use This Skill

Use this template when creating a new skill for:
- Implementing a technical feature (UI component, API endpoint, database migration)
- Executing a workflow (deployment, testing, code review)
- Configuring a tool or service (CI/CD, monitoring, security)
- Performing a maintenance task (refactoring, optimization, cleanup)

**Do NOT use** for:
- Conceptual documentation (use README.md instead)
- Policy definitions (use .cursor/rules/ instead)
- One-off scripts or notes

## Required Inputs

Before creating a skill, gather:

1. **Skill Name**: Descriptive, kebab-case (e.g., `api-express`, `testing-e2e`)
2. **Purpose Statement**: 1-2 sentences explaining what the skill accomplishes
3. **Related Cursor Rules**: Which policy files in `.cursor/rules/` apply?
4. **Required Tools**: Dependencies, libraries, or services needed
5. **Expected Inputs**: What parameters or context does the user provide?
6. **Expected Outputs**: What artifacts are created or modified?

## Steps

### 1. Create Skill Directory Structure

```bash
mkdir -p skills/{skill-name}/details
```

Create 5 required files:
- `skills/{skill-name}/skill.md` — Main execution guide (this file structure)
- `skills/{skill-name}/details/README.md` — Theory and best practices
- `skills/{skill-name}/details/examples.md` — Code examples
- `skills/{skill-name}/details/checklist.md` — Acceptance criteria
- `skills/{skill-name}/details/anti-patterns.md` — Common mistakes

### 2. Write skill.md (Main Execution Guide)

**Structure (120-250 lines):**

```markdown
# {Skill Name}

## Purpose
[1-2 sentences: what this skill accomplishes]

## When to Use This Skill
- Use when: [scenario 1]
- Use when: [scenario 2]
- Do NOT use when: [anti-scenario]

## Required Inputs
1. Input 1: Description
2. Input 2: Description

## Steps

### 1. First Major Step
[Clear instruction with code example]

### 2. Second Major Step
[Clear instruction with code example]

[... 8-12 more numbered steps ...]

## Expected Outputs
- File created/modified: path/to/file
- Service configured: description
- Tests passing: specific test suites

## Validation
1. Verify: [check 1]
2. Test: [check 2]
3. Confirm: [check 3]

## Related Skills
- `/skills/related-skill/` — Description
- `/skills/another-skill/` — Description

## See Also
- [Cursor Rule](../../.cursor/rules/{number}-{name}.md)
- [Details: Theory](./details/README.md)
- [Details: Examples](./details/examples.md)
- [Details: Checklist](./details/checklist.md)
- [Details: Anti-Patterns](./details/anti-patterns.md)
```

### 3. Write details/README.md (Theory and Best Practices)

**Structure (500+ lines):**

- **Overview**: What problem does this solve?
- **Architecture**: How does it fit into the system?
- **Core Concepts**: Key terminology and mental models
- **Best Practices**: Industry standards and recommendations
- **Common Patterns**: Reusable solutions
- **Edge Cases**: How to handle unusual scenarios
- **Performance**: Optimization considerations
- **Security**: Relevant security concerns
- **Maintenance**: Long-term care and updates
- **References**: Links to official docs, RFCs, or articles

### 4. Write details/examples.md (Code Examples)

**Structure (300+ lines):**

Provide 5-10 real-world examples with:
- **Example title**: What scenario does it cover?
- **Context**: When would you use this?
- **Code**: Full, copy/paste-ready implementation
- **Explanation**: Line-by-line or section-by-section breakdown
- **Variations**: Alternative approaches or configurations

### 5. Write details/checklist.md (Acceptance Criteria)

**Structure (50-100 lines):**

```markdown
# {Skill Name} — Checklist

## Definition of Done

### Functional Requirements
- [ ] Requirement 1
- [ ] Requirement 2

### Code Quality
- [ ] Follows naming conventions
- [ ] No linting errors
- [ ] No compiler warnings

### Testing
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] E2E tests passing (if applicable)

### Documentation
- [ ] Code comments for complex logic
- [ ] README updated (if new feature)
- [ ] API docs updated (if API changes)

### Security
- [ ] No hardcoded secrets
- [ ] Input validation implemented
- [ ] Error handling in place

### Performance
- [ ] No N+1 queries
- [ ] Efficient algorithms used
- [ ] Load tested (if critical path)

### Accessibility (if UI)
- [ ] WCAG AA contrast ratios
- [ ] Keyboard navigable
- [ ] Screen reader tested
```

### 6. Write details/anti-patterns.md (Common Mistakes)

**Structure (100-200 lines):**

Use ❌/✅ format for clarity:

```markdown
# {Skill Name} — Anti-Patterns

## Anti-Pattern 1: [Name]

### ❌ DON'T: [What to avoid]
```code
// Bad example
```

### ✅ DO: [What to do instead]
```code
// Good example
```

**Why**: Explanation of the problem and solution.

[... Repeat for 8-12 anti-patterns ...]
```

### 7. Link to Related Cursor Rules

In the skill.md file, reference relevant policy files:

```markdown
## See Also
- [Code Style](./../.cursor/rules/010-code-style-js.md)
- [UI Patterns](./../.cursor/rules/020-ui-react-scss-a11y.md)
```

### 8. Add Skill to Main README

Update `/skills/README.md` with:

```markdown
## {Skill Category}

### {Skill Name} (`{skill-name}/`)
{One-sentence description}

**Use for**: {Primary use case}
```

### 9. Validate Against Checklist

Ensure your skill meets these criteria:
- [ ] skill.md is 120-250 lines
- [ ] All sections present (Purpose, When, Inputs, Steps, Outputs, Validation)
- [ ] Steps are numbered and actionable
- [ ] No open-ended questions (autonomous execution)
- [ ] details/README.md is 500+ lines
- [ ] details/examples.md has 5-10 examples
- [ ] details/checklist.md is 50-100 lines
- [ ] details/anti-patterns.md has 8-12 ❌/✅ comparisons
- [ ] Links to related Cursor Rules
- [ ] Added to main skills/README.md

### 10. Test the Skill

Execute the skill yourself or with an AI assistant:
1. Follow steps exactly as written
2. Note any ambiguities or missing information
3. Verify expected outputs match actual outputs
4. Update skill based on findings

## Expected Outputs

After completing these steps, you will have:

1. **Directory**: `skills/{skill-name}/` with proper structure
2. **Main Guide**: `skill.md` (120-250 lines, execution-focused)
3. **Theory**: `details/README.md` (500+ lines, comprehensive)
4. **Examples**: `details/examples.md` (300+ lines, 5-10 examples)
5. **Checklist**: `details/checklist.md` (50-100 lines, acceptance criteria)
6. **Anti-Patterns**: `details/anti-patterns.md` (100-200 lines, ❌/✅ examples)
7. **Integration**: Updated main `/skills/README.md`

## Validation

After creating a skill, verify:

1. **Structure**: All 5 files exist with correct names
2. **Length**: Each file meets line count requirements
3. **Completeness**: No "TODO" or placeholder sections
4. **Clarity**: Steps are numbered, actionable, and unambiguous
5. **Autonomy**: No open-ended questions; uses sensible defaults
6. **Links**: References to Cursor Rules and related skills work
7. **Testing**: Skill has been executed end-to-end successfully

## Related Skills

This is the meta-skill for creating skills. Once you've created a skill, consider:
- Reviewing existing skills for consistency
- Updating the main README with new skill
- Creating related skills that reference each other

## See Also

- [Details: Creating Great Skills](./details/README.md)
- [Details: Skill Examples](./details/examples.md)
- [Details: Skill Checklist](./details/checklist.md)
- [Details: Skill Anti-Patterns](./details/anti-patterns.md)
- [Skills Library Overview](../README.md)
- [Cursor Rules Overview](../../.cursor/rules/000-overview.md)

---

**Last Updated**: 2025-12-31
**Version**: 1.0.0
**Maintained by**: Development Policy Library Project
