#!/bin/bash

# Xoch Task ID Generator
# Generates unique task IDs for Xoch work/task directories

# Usage modes:
# 1. With user-provided ID: generateTaskId.sh --id "my-task-id"
# 2. Auto-generate: generateTaskId.sh

# Check for user-provided ID
if [ "$1" == "--id" ] && [ -n "$2" ]; then
  # User provided an ID - validate and return it
  USER_ID="$2"
  
  # Clean the ID: lowercase, replace spaces/special chars with hyphens
  CLEAN_ID=$(echo "$USER_ID" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//')
  
  echo "$CLEAN_ID"
  exit 0
fi

# Auto-generate mode
# Get project folder name from current directory
PROJECT_NAME=$(basename "$PWD" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g')

# Generate timestamp-based unique suffix (YYYYMMDD-HHMM)
TIMESTAMP=$(date +%Y%m%d-%H%M)

# Generate random 4-character suffix for additional uniqueness
RANDOM_SUFFIX=$(cat /dev/urandom | LC_ALL=C tr -dc 'a-z0-9' | fold -w 4 | head -n 1)

# Combine: projectname-YYYYMMDD-HHMM-xxxx
TASK_ID="${PROJECT_NAME}-${TIMESTAMP}-${RANDOM_SUFFIX}"

echo "$TASK_ID"
