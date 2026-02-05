# PRD Creation  -  Product Requirements Document

## Purpose
Create a clear, testable PRD that defines the problem, scope, requirements, and success metrics for a product or feature change.

## When to Use This Skill
Use when:
- Planning a new product, feature, or major workflow change
- Aligning stakeholders on scope, requirements, and success metrics
- Handing off requirements to design, engineering, or QA

Do NOT use when:
- Writing a small bug fix or minor UI tweak (use a ticket or short spec)
- The scope is already captured in a formal roadmap document

## Required Inputs
1. **Problem statement**: What pain or opportunity are we addressing?
2. **Target users**: Who is affected? (personas or segments)
3. **Business goals**: Why now? Expected impact.
4. **Constraints**: Tech, legal/compliance, timeline, budget.
5. **Stakeholders**: Owners, approvers, and dependencies.

Defaults:
- PRD path: `docs/prd/{yyyy-mm-dd}-{feature-slug}.md`
- Requirement language: Must/Should/Could

## Steps

### 1) Confirm scope and context
- Restate the problem in one paragraph.
- Identify the primary user and the primary business outcome.
- Clarify what is in scope vs out of scope.

### 2) Gather constraints and dependencies
- List technical constraints (stack, data sources, existing systems).
- List legal/compliance constraints (PII, security, retention).
- Identify external dependencies (teams, vendors, approvals).

### 3) Define goals and non-goals
- Goals should be measurable and tied to user/business outcomes.
- Non-goals protect scope; explicitly state what will NOT be built.

### 4) Define users and journeys
- Name 1-3 personas or segments.
- Capture the primary user journey (before, during, after).
- Note edge cases or alternative flows.

### 5) Specify requirements
- Split into **Functional** and **Non-Functional**.
- Use Must/Should/Could to reflect priority.
- Keep requirements testable and unambiguous.

### 6) Define UX and content needs
- List screens/states (empty, loading, error, success).
- Reference wireframes or mockups if available (link or placeholder).
- Call out localization, accessibility, and RTL requirements if relevant.

### 7) Define data, APIs, and analytics
- List data inputs/outputs and ownership.
- Note required API endpoints, events, or integrations.
- Define analytics events and success measurement.

### 8) Define rollout and risks
- Rollout plan: feature flag, phased release, or big bang.
- Risks and mitigations (technical, adoption, timeline).
- Open questions that need resolution.

### 9) Draft the PRD using the template
Create `docs/prd/{yyyy-mm-dd}-{feature-slug}.md` with this structure:

```markdown
# {Feature Name}  -  PRD

## Summary
[One paragraph: problem + solution + impact]

## Goals
- [Goal 1]
- [Goal 2]

## Non-Goals
- [Non-goal 1]

## Users
- Primary: [Persona]
- Secondary: [Persona]

## User Stories
- As a [role], I want [capability], so that [benefit].

## Workflows
1. [Workflow name]: [Steps or flow]

## User Journey
1. [Step 1]
2. [Step 2]

## Requirements
### Functional
- Must: ...
- Should: ...
- Could: ...

### Non-Functional
- Performance: ...
- Security/Privacy: ...
- Reliability: ...

## Architecture
- Components/services:
- Data flows:
- Dependencies:

## UX Notes
- Screens/states:
- Copy/labels:
- Accessibility/RTL:

## Data & Integrations
- Inputs:
- Outputs:
- APIs/events:

## Success Metrics
- Metric 1:
- Metric 2:

## Test Strategy
- Unit:
- Integration:
- E2E/UX:
- Monitoring/alerts:

## Production Requirements
- Feature flags:
- Rollback plan:
- SLOs/SLIs:
- Data retention/privacy:

## Rollout Plan
- Plan:
- Risks:
- Mitigations:

## PRFAQ
### Press Release
[Short customer-facing announcement]
### FAQ
- Q: ...
  A: ...

## Path
- Primary doc: `docs/prd/{yyyy-mm-dd}-{feature-slug}.md`
- Related assets: [links to designs/specs]

## TODOs
- [ ] Open item
- [ ] Pending decision

## Open Questions
- [Question]
```

### 10) Review with stakeholders
- Confirm requirements are testable and prioritized.
- Validate non-goals and risks.
- Capture decisions and owners for open questions.

## Expected Outputs
- `docs/prd/{yyyy-mm-dd}-{feature-slug}.md` with aligned scope and requirements
- List of open questions and owners

## Validation
1. Goals and success metrics are measurable.
2. Requirements are testable and unambiguous.
3. Non-goals and constraints are clearly stated.
4. Rollout plan and risks are documented.
5. User stories, workflows, and architecture are documented.
6. Test strategy, production requirements, PRFAQ, path, and TODOs are included.

## Related Skills
- `skills/skill-maker/skill.md`  -  Create or update skills

## See Also
- Details: `./details/README.md`
- Examples: `./details/examples.md`
- Checklist: `./details/checklist.md`
- Anti-Patterns: `./details/anti-patterns.md`
