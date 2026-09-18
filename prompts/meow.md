---
name: xoch-meow
description: Simple test prompt to verify Xoch installation (named after Xoch the cat!)
---

# Xoch Test Prompt 🐱

## Purpose
This is a simple test to verify the prompt system is working correctly. Named after Xoch, the cat who inspired this project!

## Instructions

Please respond with the following:
1. Print "Meow! 🐱"
2. Confirm which agent you are (GitHub Copilot, Codex, Cursor, etc.)
3. Confirm which model you're using
4. Confirm you successfully read this prompt file
5. Run `xoch verify` (via your shell/bash tool) and report its real result -- it checks that the CLI reports a version and that `xoch init` has rendered prompts into `~/.xoch/prompts`, exiting non-zero and printing which check failed if either is missing. Report success only when `xoch verify` itself exits 0; if it fails, show the engineer its output rather than declaring success anyway.

That's it! This is just a test to make sure Xoch is purring along nicely.
