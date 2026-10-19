## Multi-Project Routing

If the job contains `projects.json`:

- Validate it with `xoch project-scope validate --scope [path]`, then identify the invoked repository and canonical primary job with `xoch project-scope role --scope [path]`.
- Read and write shared job artifacts through the primary job directory, and run relative workflow helpers from the primary project root.
- Make source changes only inside each listed owning repository.
- Run `xoch context-sync sync --scope [primary job]/projects.json` after shared context changes.
- Stop on validation or sync failure. Never copy source files or `current.json` between repositories.
