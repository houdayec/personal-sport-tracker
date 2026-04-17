# Commit Cheatsheet for Codex

Use this guide to produce clean, reviewable, low-risk commits.

## 1. Golden Rules

- Only one commit
- Keep diffs focused: avoid unrelated file changes.
- Explain why, not only what.
- Verify before commit.
- Never include secrets or generated noise.
- Always give commit title and description in separated code snippets.

## 2. Preferred Commit Size

- Target: 3 to 15 files when possible.
- Split when:
  - You changed unrelated modules.
  - You mixed refactor and feature behavior.
  - You mixed infra/config and product logic.

## 3. Commit Message Format

Use Conventional Commits:

```text
<type>(<scope>): <short summary>

<why>

<what changed>

<validation>
