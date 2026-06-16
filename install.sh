#!/bin/bash
# install.sh — Symlink this extension into the per-user extensions directory.
#
# Usage:
#   ./install.sh          # install (or update existing symlink)
#   ./install.sh --remove # remove the symlink

set -euo pipefail

UUID="ctrlalt-drag@user"
TARGET_DIR="${HOME}/.local/share/gnome-shell/extensions/${UUID}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ "${1:-}" = "--remove" ]; then
    if [ -L "$TARGET_DIR" ] || [ -d "$TARGET_DIR" ]; then
        echo "Removing ${TARGET_DIR} …"
        rm -rf "$TARGET_DIR"
        echo "Done.  Restart GNOME Shell (Alt+F2 → r) or log out/in to unload."
    else
        echo "Extension not found at ${TARGET_DIR} — nothing to remove."
    fi
    exit 0
fi

# If an actual *directory* exists (not a symlink) refuse to overwrite silently.
if [ -d "$TARGET_DIR" ] && [ ! -L "$TARGET_DIR" ]; then
    echo "Error: ${TARGET_DIR} already exists as a real directory."
    echo "Remove it manually first, then re-run this script."
    exit 1
fi

mkdir -p "$(dirname "$TARGET_DIR")"

# Remove old symlink (or stale directory entry) before creating the new one.
rm -f "$TARGET_DIR"
ln -sf "$SCRIPT_DIR" "$TARGET_DIR"

echo "Installed extension “${UUID}” (symlink: ${TARGET_DIR} → ${SCRIPT_DIR})."
echo ""
echo "Now restart GNOME Shell:"
echo "  - X11:  Alt+F2, type “r”, press Enter"
echo "  - Wayland:  log out and back in"
echo ""
echo "Then enable the extension via gnome-extensions-app or:"
echo "  gnome-extensions enable ${UUID}"
