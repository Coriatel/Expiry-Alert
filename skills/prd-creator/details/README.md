# PRD Creation  -  Patterns and Guidance

## Overview
A PRD aligns stakeholders on what to build, why it matters, and how success is measured. It should be clear, scoped, and testable. Write for both product and engineering audiences.

## Core Principles
- Focus on the problem first; the solution serves the problem.
- Prefer measurable goals over vague intentions.
- Keep scope tight; use non-goals to prevent drift.
- Make requirements testable and traceable to goals.
- Document risks and dependencies early.

## Recommended Structure
1. Summary
2. Goals
3. Non-Goals
4. Users
5. User Journey
6. User Stories
7. Workflows
8. Requirements (Functional and Non-Functional)
9. Architecture
10. UX Notes
11. Data and Integrations
12. Success Metrics
13. Test Strategy
14. Production Requirements
15. Rollout Plan
16. PRFAQ
17. Path
18. TODOs
19. Open Questions

## Goals and Success Metrics
- Use outcomes (e.g., reduce churn by 5 percent) over outputs (e.g., ship feature X).
- Tie each metric to the user problem or business impact.
- Define how metrics will be measured (event names, dashboards, source of truth).

## Requirements Guidance
- Use Must/Should/Could to express priority.
- Keep each requirement independent and testable.
- Avoid implementation detail unless necessary (APIs, data constraints, compliance).
- Separate functional behavior from non-functional constraints.

## User Stories
- Use the format: As a [role], I want [capability], so that [benefit].
- Keep them outcome-focused; avoid implementation details.

## Workflows
- Capture the primary and secondary workflows as step-by-step flows.
- Call out decision points, error paths, and alternate paths.

## Architecture
- Summarize components, data flows, and integrations.
- Include a simple diagram link if available.

## UX and Content Notes
- Capture screens, states, and flows in plain text.
- Include accessibility and localization requirements.
- Link to wireframes or mockups if available.

## Data, APIs, and Integrations
- Identify data owners and sources.
- Document required inputs/outputs and any schema changes.
- Note third-party systems and failure modes.

## Test Strategy
- Define unit, integration, and E2E coverage expectations.
- Include data seeding and test accounts if required.
- Specify monitoring/alerting for production.

## Production Requirements
- Define feature flag strategy and rollback plan.
- Capture SLO/SLI targets when relevant.
- Note data retention/privacy requirements.

## PRFAQ
- Write a short press release in plain language.
- Add FAQs for common objections or edge cases.

## Path and TODOs
- Document the canonical PRD path and related assets.
- Track follow-up items and owners in TODOs.

## Rollout and Risk Management
- Choose a rollout strategy (feature flag, phased rollout, beta).
- List top risks and mitigations.
- Include an adoption and comms plan if needed.

## Common Edge Cases
- Users without required permissions
- Partial data or missing fields
- High latency or offline conditions
- Legacy compatibility requirements

## Change Control
- Track decisions and changes to scope.
- Use a short decision log for major updates.

## Review Tips
- Read the PRD with a developer mindset: can this be built and tested?
- Read with a QA mindset: are the acceptance criteria clear?
- Read with a product mindset: does this solve the right problem?

## References
- Internal roadmap or strategy documents
- Research summaries and user interviews
- Relevant compliance requirements
