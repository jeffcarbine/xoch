Draft the commit message from the phase's spec/plan text, its description in the phases document, and the acceptance criteria and evidence it covers. Never include the job ID, phase number, arc name, or other Xoch identifiers; a reader with no knowledge of Xoch should understand the change from the message alone. Do not add attribution to the model used or the company that provides it, such as `Co-Authored-By` trailers or `Generated with` lines. Don't add hard returns in the middle of sentences. Shape: an imperative, present-tense summary line, then an optional body explaining what changed and why, not a diff recap. Example:

```text
Add rate limiting to the webhook ingestion endpoint

Bursts of retried webhooks from upstream were occasionally overwhelming the queue consumer. Cap accepted requests per source IP over a rolling window and return 429 past that limit.
```
