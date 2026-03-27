#!/bin/bash
set -e

# Build a Synology .spk package from the pre-built app
# Usage: ./build-spk.sh [version] [arch]
#   version: semver string (default: from package.json)
#   arch:    x86_64 or aarch64 (default: x86_64)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
VERSION="${1:-$(node -p "require('$PROJECT_DIR/package.json').version")}"
ARCH="${2:-x86_64}"
SPK_NAME="reprint-sheets-${VERSION}-${ARCH}.spk"

echo "Building SPK: $SPK_NAME"
echo "  Version: $VERSION"
echo "  Arch:    $ARCH"

BUILD_DIR=$(mktemp -d)
trap "rm -rf $BUILD_DIR" EXIT

# --- Create package.tgz (the app files) ---
echo "Packaging app files..."
PKG_DIR="$BUILD_DIR/pkg"
mkdir -p "$PKG_DIR"

cd "$PROJECT_DIR"

# Copy runtime files
cp -r .next "$PKG_DIR/"
cp -r node_modules "$PKG_DIR/"
cp -r public "$PKG_DIR/"
cp package.json "$PKG_DIR/"

# Copy prisma schema (needed for db push)
mkdir -p "$PKG_DIR/prisma"
cp prisma/schema.prisma "$PKG_DIR/prisma/"
cp prisma.config.ts "$PKG_DIR/"

# Copy generated prisma client (needed at runtime)
mkdir -p "$PKG_DIR/src/generated"
cp -r src/generated/prisma "$PKG_DIR/src/generated/"

# Create uploads placeholder
mkdir -p "$PKG_DIR/uploads"

# Create package.tgz
cd "$PKG_DIR"
tar czf "$BUILD_DIR/package.tgz" .

# --- Build INFO file ---
echo "Creating INFO..."
sed -e "s/\${SPK_VERSION}/$VERSION/g" \
    -e "s/\${SPK_ARCH}/$ARCH/g" \
    "$SCRIPT_DIR/INFO" > "$BUILD_DIR/INFO"

# --- Copy scripts ---
echo "Copying scripts..."
mkdir -p "$BUILD_DIR/scripts"
cp "$SCRIPT_DIR/scripts/postinst" "$BUILD_DIR/scripts/"
cp "$SCRIPT_DIR/scripts/preuninst" "$BUILD_DIR/scripts/"
cp "$SCRIPT_DIR/scripts/start-stop-status" "$BUILD_DIR/scripts/"
chmod +x "$BUILD_DIR/scripts/"*

# --- Copy conf ---
mkdir -p "$BUILD_DIR/conf"
cp "$SCRIPT_DIR/conf/privilege" "$BUILD_DIR/conf/"

# --- Generate icons (red square with RS text) ---
echo "Generating icons..."
if command -v convert > /dev/null 2>&1; then
    convert -size 72x72 xc:'#CC0000' -fill white -gravity center \
        -font Helvetica-Bold -pointsize 28 -annotate 0 'RS' \
        "$BUILD_DIR/PACKAGE_ICON.PNG" 2>/dev/null || \
    convert -size 72x72 xc:'#CC0000' -fill white -gravity center \
        -pointsize 28 -annotate 0 'RS' \
        "$BUILD_DIR/PACKAGE_ICON.PNG"
    convert -size 256x256 xc:'#CC0000' -fill white -gravity center \
        -font Helvetica-Bold -pointsize 96 -annotate 0 'RS' \
        "$BUILD_DIR/PACKAGE_ICON_256.PNG" 2>/dev/null || \
    convert -size 256x256 xc:'#CC0000' -fill white -gravity center \
        -pointsize 96 -annotate 0 'RS' \
        "$BUILD_DIR/PACKAGE_ICON_256.PNG"
else
    echo "  ImageMagick not found — using placeholder icons"
    # Create minimal 1x1 red PNG as fallback (base64 decoded)
    echo "iVBORw0KGgoAAAANSUhEUgAAAEgAAABICAIAAADajyQQAAAAIklEQVR4nO3BAQ0AAADCoPd" \
         "PbQ43oAAAAAAAAAAAAAAA3wZBSAAB5rydswAAAABJRU5ErkJggg==" | \
         base64 -d > "$BUILD_DIR/PACKAGE_ICON.PNG" 2>/dev/null || true
    cp "$BUILD_DIR/PACKAGE_ICON.PNG" "$BUILD_DIR/PACKAGE_ICON_256.PNG" 2>/dev/null || true
fi

# --- Assemble SPK (tar archive) ---
echo "Assembling SPK..."
cd "$BUILD_DIR"
tar cf "$SCRIPT_DIR/$SPK_NAME" \
    INFO \
    package.tgz \
    scripts/ \
    conf/ \
    PACKAGE_ICON.PNG \
    PACKAGE_ICON_256.PNG 2>/dev/null || \
tar cf "$SCRIPT_DIR/$SPK_NAME" \
    INFO \
    package.tgz \
    scripts/ \
    conf/

echo ""
echo "Done! SPK created at:"
echo "  $SCRIPT_DIR/$SPK_NAME"
echo ""
ls -lh "$SCRIPT_DIR/$SPK_NAME"
