#!/bin/bash

# sync-drafts-to-mc.sh - Sync Rachel's drafts to Mission Control with automated post-processing
# Automatically strips emdashes before syncing

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MISSION_CONTROL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DRAFTS_DIR="$MISSION_CONTROL_ROOT/drafts"

echo "Mission Control Drafts Sync"
echo "============================"

# Check if drafts directory exists
if [ ! -d "$DRAFTS_DIR" ]; then
    echo "Creating drafts directory: $DRAFTS_DIR"
    mkdir -p "$DRAFTS_DIR"
fi

echo "Drafts directory: $DRAFTS_DIR"

# Function to process a single file
process_file() {
    local file_path="$1"
    local relative_path="${file_path#$DRAFTS_DIR/}"
    
    echo "Processing: $relative_path"
    
    # Strip emdashes using our post-processor
    "$SCRIPT_DIR/strip-emdashes.sh" "$file_path"
    
    echo "✓ Post-processed: $relative_path"
}

# Find and process all markdown files in drafts directory
if [ -d "$DRAFTS_DIR" ]; then
    echo ""
    echo "Searching for markdown files in drafts..."
    
    # Find all .md files in drafts directory
    found_files=false
    while IFS= read -r -d '' file; do
        found_files=true
        process_file "$file"
    done < <(find "$DRAFTS_DIR" -name "*.md" -type f -print0 2>/dev/null)
    
    if [ "$found_files" = false ]; then
        echo "No markdown files found in drafts directory."
        echo "Add .md files to $DRAFTS_DIR to process them."
    else
        echo ""
        echo "✓ All drafts processed successfully!"
        echo ""
        echo "Files have been automatically post-processed:"
        echo "  - Emdashes (—) replaced with spaced hyphens ( - )"
        echo "  - Markdown headers preserved"
    fi
else
    echo "Drafts directory not found: $DRAFTS_DIR"
    exit 1
fi

echo ""
echo "Sync complete!"