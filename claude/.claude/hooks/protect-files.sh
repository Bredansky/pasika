#!/bin/bash
# protect-files.sh - Block edits to sensitive files

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

PROTECTED_PATTERNS=(
  "/\.env$|^\.env$"
  "package-lock\.json$"
  "/\.git/|^\.git/"
)

for pattern in "${PROTECTED_PATTERNS[@]}"; do
  if echo "$FILE_PATH" | grep -qE "$pattern"; then
    echo "Blocked: Cannot edit protected file '$FILE_PATH'" >&2
    echo "Reason: This is a sensitive/generated file that should not be manually edited" >&2
    exit 2
  fi
done

exit 0
