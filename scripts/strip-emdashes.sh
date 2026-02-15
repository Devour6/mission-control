#!/bin/bash

# strip-emdashes.sh - Automated emdash stripping post-processor
# Replaces all emdashes (—) in body text with " - " (spaced hyphens)
# Preserves markdown headers (lines starting with #)

set -e

# Check if file path argument is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <file_path>"
    echo "Example: $0 drafts/linkedin/2026-02-14.md"
    exit 1
fi

FILE_PATH="$1"

# Check if file exists
if [ ! -f "$FILE_PATH" ]; then
    echo "Error: File '$FILE_PATH' does not exist"
    exit 1
fi

# Check if file is readable
if [ ! -r "$FILE_PATH" ]; then
    echo "Error: File '$FILE_PATH' is not readable"
    exit 1
fi

# Create a temporary file for processing
TEMP_FILE=$(mktemp)
trap 'rm -f "$TEMP_FILE"' EXIT

echo "Processing file: $FILE_PATH"

# Process the file line by line
while IFS= read -r line; do
    # Check if line starts with # (markdown header)
    if [[ "$line" =~ ^[[:space:]]*# ]]; then
        # Preserve header lines as-is
        echo "$line" >> "$TEMP_FILE"
    else
        # Replace emdashes with spaced hyphens in body text
        # Using sed to replace — with " - "
        processed_line=$(echo "$line" | sed 's/—/ - /g')
        echo "$processed_line" >> "$TEMP_FILE"
    fi
done < "$FILE_PATH"

# Replace original file with processed content
mv "$TEMP_FILE" "$FILE_PATH"

echo "✓ Emdashes replaced with spaced hyphens in: $FILE_PATH"
echo "✓ Markdown headers preserved"