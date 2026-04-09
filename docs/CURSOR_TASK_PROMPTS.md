# CURSOR_TASK_PROMPTS.md

## 1. Create Architecture Documents
```text
Read AGENT.md, REQUIREMENTS.md, ARCHITECTURE.md, TEST_STRATEGY.md and DELIVERY_PLAN.md.

Task:
Review the document set for consistency.
Identify contradictions, gaps, and risky ambiguities.
Do not implement code.
Return a concise findings list grouped by severity: critical, medium, low.
Suggest precise doc changes where needed.
```

## 2. Turn Delivery Plan into Stories
```text
Use AGENT.md, REQUIREMENTS.md, ARCHITECTURE.md, TEST_STRATEGY.md and DELIVERY_PLAN.md as binding context.

Task:
Expand DELIVERY_PLAN.md into a backlog of implementable stories using STORY_TEMPLATE.md.
Keep stories small and vertically sliceable.
Do not write code.
```

## 3. Implement a Story
```text
Read AGENT.md, REQUIREMENTS.md, ARCHITECTURE.md, TEST_STRATEGY.md, ACCEPTANCE_CHECKLIST.md and the selected story.

Task:
Implement only the selected story.
Before coding, list assumptions and impacted files.
Respect the modular monolith architecture.
Do not perform unrelated refactors.
After implementation, list tests added or updated and verify against ACCEPTANCE_CHECKLIST.md.
```

## 4. Review an Existing Change
```text
Read AGENT.md, REQUIREMENTS.md, ARCHITECTURE.md, TEST_STRATEGY.md and ACCEPTANCE_CHECKLIST.md.

Task:
Review the current branch or change set.
Check for architectural violations, requirement mismatches, missing tests, and reliability risks.
Do not rewrite large sections unless required.
Return findings with severity and exact file references.
```

## 5. Create Test Cases for a Story
```text
Read TEST_STRATEGY.md and the selected story.

Task:
Produce a test plan for the story.
Split into unit, integration, and e2e tests.
Focus on business-critical risks and regressions.
Do not implement tests yet.
```
