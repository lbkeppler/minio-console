#!/usr/bin/env bash
# Download MinIO Client (mc) binaries for Tauri sidecar bundling.
# Usage: ./scripts/download-mc.sh [target]
# If no target specified, downloads all platforms.

set -euo pipefail

BINARIES_DIR="$(cd "$(dirname "$0")/../src-tauri/binaries" && pwd)"
mkdir -p "$BINARIES_DIR"

# MinIO download base URL
BASE_URL="https://dl.min.io/client/mc/release"

declare -A TARGETS=(
    ["x86_64-pc-windows-msvc"]="windows-amd64/mc.exe"
    ["aarch64-pc-windows-msvc"]="windows-arm64/mc.exe"
    ["x86_64-apple-darwin"]="darwin-amd64/mc"
    ["aarch64-apple-darwin"]="darwin-arm64/mc"
    ["x86_64-unknown-linux-gnu"]="linux-amd64/mc"
    ["aarch64-unknown-linux-gnu"]="linux-arm64/mc"
)

download_target() {
    local target="$1"
    local url_path="${TARGETS[$target]}"
    local ext=""

    if [[ "$target" == *"windows"* ]]; then
        ext=".exe"
    fi

    local output="$BINARIES_DIR/mc-${target}${ext}"
    local url="$BASE_URL/$url_path"

    echo "Downloading mc for $target..."
    echo "  URL: $url"
    echo "  Output: $output"

    curl -fSL "$url" -o "$output"
    chmod +x "$output"
    echo "  Done."
}

if [ $# -ge 1 ]; then
    target="$1"
    if [ -z "${TARGETS[$target]+x}" ]; then
        echo "Unknown target: $target"
        echo "Available targets: ${!TARGETS[*]}"
        exit 1
    fi
    download_target "$target"
else
    echo "Downloading mc for all platforms..."
    for target in "${!TARGETS[@]}"; do
        download_target "$target"
    done
fi

echo ""
echo "All downloads complete. Binaries in: $BINARIES_DIR"
ls -la "$BINARIES_DIR"/mc-*
