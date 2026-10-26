```bash
xoch file write --job "[job-id]" --path conventions-check.md <<'XOCHEOF'
# Conventions Check - [job-id]

**Run**: [timestamp]
**Source**: {{source}}
**Files checked**: [paths]
**Rules applied**: [rule IDs]

## Findings

| Rule | Status | Severity | Location | Finding | Fix | Resolution |
|---|---|---|---|---|---|---|
| CV-004 | confirmed | minor | src/a.js:12 | [what differs] | [fix] | open |
XOCHEOF
```

Write `No findings.` in place of the table when there are none. Every resolution starts `open`; later work sets `fixed`, or `accepted` when the engineer keeps the code as it is.
