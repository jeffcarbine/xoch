#!/bin/bash

# Xoch Token Estimator
# Estimates token count for a file without loading it into AI context

# Check for batch mode
if [ "$1" == "--batch" ]; then
  shift
  TOTAL_TOKENS=0
  TOTAL_CHARS=0
  FILE_COUNT=0
  
  echo "📊 Batch Token Estimate"
  echo "======================="
  echo ""
  
  for FILE in "$@"; do
    if [ ! -f "$FILE" ]; then
      echo "⚠️  Skipping (not found): $FILE"
      continue
    fi
    
    FILE_COUNT=$((FILE_COUNT + 1))
    CHARS=$(wc -m < "$FILE" | tr -d ' ')
    TOKENS=$(echo "scale=0; $CHARS / 3.5" | bc)
    TOTAL_CHARS=$(echo "$TOTAL_CHARS + $CHARS" | bc)
    TOTAL_TOKENS=$(echo "$TOTAL_TOKENS + $TOKENS" | bc)
    
    FILENAME=$(basename "$FILE")
    printf "  %-40s %6d tokens\n" "$FILENAME" "$TOKENS"
  done
  
  echo ""
  echo "---"
  echo "Files: $FILE_COUNT"
  echo "Total Characters: $TOTAL_CHARS"
  echo "Total Estimated Tokens: ~$TOTAL_TOKENS"
  echo ""
  
  exit 0
fi

# Single file mode
FILE_PATH="$1"
MODE="${2:-report}"  # report, check, or json

if [ -z "$FILE_PATH" ]; then
  echo "Usage: token-estimator.sh <file_path> [mode]"
  echo "       token-estimator.sh --batch <file1> <file2> ..."
  echo "Modes: report (default), check, json"
  exit 1
fi

if [ ! -f "$FILE_PATH" ]; then
  echo "Error: File not found: $FILE_PATH"
  exit 1
fi

# Count characters (including spaces, newlines, everything)
CHAR_COUNT=$(wc -m < "$FILE_PATH" | tr -d ' ')

# Calculate estimated tokens (using conservative estimate: char_count / 3.5)
ESTIMATED_TOKENS=$(echo "scale=0; $CHAR_COUNT / 3.5" | bc)

# Determine file type for appropriate limits
FILENAME=$(basename "$FILE_PATH")
if [[ "$FILENAME" == "README.md" ]]; then
  # Check parent directory to determine if app or feature level
  PARENT_DIR=$(dirname "$FILE_PATH")
  if [[ -f "$PARENT_DIR/package.json" ]] || [[ -f "$PARENT_DIR/pom.xml" ]] || [[ -f "$PARENT_DIR/build.gradle" ]]; then
    # Application-level README (has build file in same directory)
    LIMIT_CHARS=10500
    LIMIT_TOKENS=3000
    TYPE="Application"
  else
    # Feature-level README (subdirectory)
    LIMIT_CHARS=10500
    LIMIT_TOKENS=3000
    TYPE="Feature"
  fi
else
  # Generic file, use feature limit
  LIMIT_CHARS=10500
  LIMIT_TOKENS=3000
  TYPE="File"
fi

# Calculate percentage
PERCENTAGE=$(echo "scale=0; ($ESTIMATED_TOKENS * 100) / $LIMIT_TOKENS" | bc)

# Determine status
if [ "$ESTIMATED_TOKENS" -lt "$((LIMIT_TOKENS * 9 / 10))" ]; then
  STATUS="✅ PASS"
  STATUS_CODE=0
elif [ "$ESTIMATED_TOKENS" -le "$LIMIT_TOKENS" ]; then
  STATUS="⚠️ WARN"
  STATUS_CODE=1
else
  STATUS="🚫 FAIL"
  STATUS_CODE=2
fi

# Output based on mode
if [ "$MODE" == "json" ]; then
  echo "{\"chars\": $CHAR_COUNT, \"tokens\": $ESTIMATED_TOKENS, \"limit\": $LIMIT_TOKENS, \"percentage\": $PERCENTAGE, \"status\": $STATUS_CODE}"
elif [ "$MODE" == "check" ]; then
  echo "$STATUS - $ESTIMATED_TOKENS / $LIMIT_TOKENS tokens ($PERCENTAGE%)"
  exit $STATUS_CODE
else
  # Report mode (default)
  echo "📄 Token Estimate"
  echo "===================="
  echo ""
  echo "File: $FILENAME"
  echo "Type: $TYPE README"
  echo ""
  echo "Characters: $CHAR_COUNT"
  echo "Estimated Tokens: ~$ESTIMATED_TOKENS"
  echo "Limit: $LIMIT_TOKENS tokens"
  echo "Usage: $PERCENTAGE%"
  echo ""
  echo "Status: $STATUS"
  
  if [ "$STATUS_CODE" -eq 2 ]; then
    OVER=$((ESTIMATED_TOKENS - LIMIT_TOKENS))
    echo ""
    echo "⚠️  Over limit by ~$OVER tokens"
    echo "Consider breaking this into smaller sections or features"
  elif [ "$STATUS_CODE" -eq 1 ]; then
    REMAINING=$((LIMIT_TOKENS - ESTIMATED_TOKENS))
    echo ""
    echo "⚠️  Approaching limit (~$REMAINING tokens remaining)"
  fi
  
  exit $STATUS_CODE
fi
