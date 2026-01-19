# Skill Template — Checklist

Use this checklist when creating a new skill to ensure completeness and quality.

---

## Skill Creation Checklist

### File Structure

- [ ] Created `skills/{skill-name}/` directory
- [ ] Created `skills/{skill-name}/skill.md` (main execution guide)
- [ ] Created `skills/{skill-name}/details/` directory
- [ ] Created `skills/{skill-name}/details/README.md` (theory and best practices)
- [ ] Created `skills/{skill-name}/details/examples.md` (code examples)
- [ ] Created `skills/{skill-name}/details/checklist.md` (this file)
- [ ] Created `skills/{skill-name}/details/anti-patterns.md` (common mistakes)

---

## skill.md Quality Standards

### Structure

- [ ] **Purpose section**: 1-3 sentences clearly stating what the skill accomplishes
- [ ] **When to Use section**: 3+ use cases and 2+ anti-use cases
- [ ] **Required Inputs section**: All necessary parameters listed with types/formats
- [ ] **Steps section**: 8-15 numbered steps (atomic, ordered, complete)
- [ ] **Expected Outputs section**: All created/modified files listed
- [ ] **Validation section**: 3+ verification steps with expected results
- [ ] **Related Skills section**: Links to 2+ complementary skills
- [ ] **See Also section**: Links to Cursor Rules, details, and external docs

### Length

- [ ] Total length: 120-250 lines
- [ ] Not too short (< 100 lines = incomplete)
- [ ] Not too long (> 300 lines = needs refactoring or splitting)

### Content Quality

- [ ] Steps are **numbered** (1, 2, 3...)
- [ ] Steps are **actionable** (clear commands or code)
- [ ] Code blocks are **complete** (no "..." or snippets)
- [ ] File paths are **specific** (e.g., `src/routes/users.js`, not "in your routes folder")
- [ ] Commands are **copy/paste ready** (exact syntax, no placeholders)
- [ ] **No open-ended questions** (autonomous execution)
- [ ] **Sensible defaults** stated explicitly (e.g., "Defaults to port 3000")
- [ ] **Assumptions** documented (e.g., "Assumes Node.js 18+")

### Code Examples

- [ ] Every code block has a **language tag** (```javascript, ```bash, etc.)
- [ ] Code blocks are **syntactically correct** (no typos)
- [ ] Code blocks include **error handling** where appropriate
- [ ] Code blocks follow **project conventions** (from Cursor Rules)

### Links

- [ ] All internal links use **correct paths** (../../.cursor/rules/, ../README.md)
- [ ] All internal links are **tested and working**
- [ ] External links are to **official documentation** (not blog posts)
- [ ] External links are **HTTPS** where available

---

## details/README.md Quality Standards

### Length and Depth

- [ ] Total length: 500+ lines (comprehensive theory)
- [ ] Covers **all major concepts** related to the skill
- [ ] Provides **context and rationale** (why, not just what)
- [ ] Includes **best practices** from industry standards

### Structure

- [ ] **Table of Contents** at the top
- [ ] **Overview section**: High-level explanation
- [ ] **Architecture section**: How it fits in the system
- [ ] **Core Concepts section**: Key terminology and mental models
- [ ] **Best Practices section**: Industry recommendations
- [ ] **Common Patterns section**: Reusable solutions
- [ ] **Advanced Techniques section**: Optional optimizations
- [ ] **References section**: Links to RFCs, official docs, articles

### Content Quality

- [ ] Explains **why**, not just **how** (skill.md is for "how")
- [ ] Uses **diagrams or examples** to illustrate concepts
- [ ] Covers **edge cases** and unusual scenarios
- [ ] Addresses **performance considerations**
- [ ] Addresses **security considerations**
- [ ] Addresses **accessibility** (for UI skills)
- [ ] Addresses **testing strategies**

---

## details/examples.md Quality Standards

### Quantity

- [ ] Contains **5-10 complete examples**
- [ ] Examples cover **range of complexity** (simple to advanced)
- [ ] Examples demonstrate **different scenarios** (not repetitive)

### Quality

- [ ] Each example has a **clear title** and **context**
- [ ] Code is **complete and runnable** (not snippets)
- [ ] Code is **well-commented** (explains complex parts)
- [ ] Each example includes **explanation** after the code
- [ ] Examples follow **project style guide** (Cursor Rules)
- [ ] Examples include **realistic data** (not foo/bar)

### Coverage

- [ ] Basic example (minimal viable implementation)
- [ ] Intermediate example (common production use case)
- [ ] Advanced example (complex or optimized solution)
- [ ] Error handling example
- [ ] Testing example
- [ ] Integration example (how it works with other code)

### Format

- [ ] Consistent structure across all examples
- [ ] Language tags on all code blocks
- [ ] Headings clearly separate examples

---

## details/checklist.md Quality Standards

### Structure

- [ ] **File Structure** section
- [ ] **Functional Requirements** section
- [ ] **Code Quality** section
- [ ] **Testing** section
- [ ] **Documentation** section
- [ ] **Security** section (if applicable)
- [ ] **Performance** section (if applicable)
- [ ] **Accessibility** section (for UI skills)

### Length

- [ ] Total length: 50-100 lines
- [ ] Focused on **Definition of Done** (not process)

### Content

- [ ] All items are **checkable** (binary yes/no)
- [ ] All items are **specific** (not vague)
- [ ] All items are **verifiable** (can be tested)
- [ ] Covers **happy path** and **edge cases**

---

## details/anti-patterns.md Quality Standards

### Quantity

- [ ] Contains **8-12 anti-patterns**
- [ ] Each anti-pattern has **❌ DON'T** and **✅ DO** examples

### Quality

- [ ] Anti-patterns are **real mistakes** developers make
- [ ] Anti-patterns are **skill-specific** (not generic advice)
- [ ] Code examples are **complete** (not snippets)
- [ ] Explanations clarify **why** it's wrong and **why** the alternative is better

### Coverage

- [ ] Common beginner mistakes
- [ ] Performance anti-patterns
- [ ] Security anti-patterns
- [ ] Accessibility anti-patterns (for UI)
- [ ] Maintainability anti-patterns

### Format

- [ ] Consistent ❌/✅ format throughout
- [ ] Code blocks have language tags
- [ ] Each anti-pattern has a **name/title**

---

## Integration

### Main Skills README

- [ ] Skill added to `/skills/README.md`
- [ ] Entry includes skill name, path, and one-sentence description

### Cross-References

- [ ] Related skills link to this skill
- [ ] Relevant Cursor Rules mention this skill
- [ ] This skill links to relevant Cursor Rules

---

## Testing

### Manual Execution

- [ ] Skill has been **executed end-to-end** by creator
- [ ] All commands run without errors
- [ ] All code compiles/runs without errors
- [ ] Expected outputs match actual outputs
- [ ] Validation steps confirm success

### Review

- [ ] Skill reviewed by another developer (if team environment)
- [ ] No typos or grammatical errors
- [ ] No broken links
- [ ] No placeholder text (e.g., "TODO", "FIXME")

---

## Maintenance

### Version Information

- [ ] **Last Updated** date at bottom of skill.md
- [ ] **Version numbers** for key dependencies (Node, React, etc.)
- [ ] **Compatibility notes** if version-specific

### Documentation

- [ ] Changelog created (if skill is updated over time)
- [ ] Deprecation warnings added (if old approach is replaced)

---

## Final Checks

- [ ] Skill is **autonomous** (makes decisions, doesn't ask 20 questions)
- [ ] Skill is **actionable** (copy/paste ready commands)
- [ ] Skill is **complete** (covers setup, execution, validation)
- [ ] Skill is **concise** (120-250 lines in main file)
- [ ] Skill is **maintainable** (versioned, linked, updatable)
- [ ] Skill is **tested** (executed successfully at least once)
- [ ] Skill follows **project conventions** (Cursor Rules)
- [ ] Skill provides **value** (solves a real problem)

---

## Definition of Done

A skill is **complete** when:

1. ✅ All 5 required files exist and meet length requirements
2. ✅ All checklist items above are checked
3. ✅ Skill has been executed successfully end-to-end
4. ✅ All links work correctly
5. ✅ No placeholder or TODO content remains
6. ✅ Skill is integrated into main README
7. ✅ Skill follows autonomous, actionable, complete principles

---

**Last Updated**: 2025-12-31
**Version**: 1.0.0
**Maintained by**: Development Policy Library Project
