---
name: xoch-glossary
description: Add or update project glossary terms and concepts
---

# Xoch - Glossary

{{xoch-partial:workflow-boundary.md}}

{{xoch-partial:managed-workflow.md command="xoch-glossary" pending="continue_glossary"}}

Use this token-light wrapper for normal `xoch-glossary` work.

If any required glossary workflow detail, template, setup behavior, or rule is missing, read and follow:

```text
~/.xoch/prompts/core/glossary-core.md
```

Do not read the core prompt unless it is needed.

This is sidebar work. Do not change active job identity or phase state. When a job is active, only the managed workflow fields change until glossary wrap-up completes.

Find `.xoch/glossaries/`. If it does not exist, ask whether to create it. If it exists, list glossary files and read only the index/target glossary needed.

Ask what term or concept to add/update, gather enough context to define it clearly, choose the best glossary file, then show the proposed entry or update before writing.

Before full glossary reads, run:

```bash
~/.xoch/bin/token-estimator.sh --batch [files...]
```

Use existing glossary formatting. Keep entries concise and focused on terms that reduce confusion.

End with a compact summary and return to the current job when ready.
