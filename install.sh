#!/bin/bash
set -e

INSTALL_DIR="/volume1/reprint-sheets"
NODE_VERSION="22.16.0"
REPO="https://github.com/scgranger1995/reprint-sheets-v2"

echo ""
echo "========================================="
echo "  Reprint Sheets — Installer"
echo "========================================="
echo ""

# --- Detect architecture ---
ARCH=$(uname -m)
case "$ARCH" in
  x86_64)  NODE_ARCH="x64" ;;
  aarch64) NODE_ARCH="arm64" ;;
  *)       echo "ERROR: Unsupported architecture: $ARCH"; exit 1 ;;
esac

# --- Install Node.js if missing ---
export PATH="/usr/local/lib/nodejs/bin:/usr/local/bin:$PATH"

if ! command -v node > /dev/null 2>&1; then
  echo "[1/6] Installing Node.js v${NODE_VERSION}..."
  wget -q "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" -O /tmp/node.tar.xz
  mkdir -p /usr/local/lib/nodejs
  tar -xJf /tmp/node.tar.xz -C /usr/local/lib/nodejs --strip-components=1
  rm -f /tmp/node.tar.xz
  ln -sf /usr/local/lib/nodejs/bin/node /usr/local/bin/node
  ln -sf /usr/local/lib/nodejs/bin/npm /usr/local/bin/npm
  ln -sf /usr/local/lib/nodejs/bin/npx /usr/local/bin/npx
else
  echo "[1/6] Node.js already installed — $(node -v)"
fi

# --- Download / update the app ---
if [ -d "$INSTALL_DIR/.git" ]; then
  echo "[2/6] Pulling latest changes..."
  cd "$INSTALL_DIR"
  git pull
elif [ -d "$INSTALL_DIR/package.json" ] && command -v git > /dev/null 2>&1; then
  echo "[2/6] Pulling latest changes..."
  cd "$INSTALL_DIR"
  git pull 2>/dev/null || true
else
  echo "[2/6] Downloading app..."
  # Download as tarball — no git needed
  wget -q "${REPO}/archive/refs/heads/master.tar.gz" -O /tmp/reprint-app.tar.gz
  mkdir -p "$INSTALL_DIR"
  # Save existing data
  if [ -f "$INSTALL_DIR/prisma/dev.db" ]; then
    cp "$INSTALL_DIR/prisma/dev.db" /tmp/reprint-dev.db.bak
  fi
  if [ -d "$INSTALL_DIR/uploads" ]; then
    cp -r "$INSTALL_DIR/uploads" /tmp/reprint-uploads-bak
  fi
  rm -rf "$INSTALL_DIR"
  mkdir -p "$INSTALL_DIR"
  tar -xzf /tmp/reprint-app.tar.gz -C "$INSTALL_DIR" --strip-components=1
  rm -f /tmp/reprint-app.tar.gz
  # Restore data
  if [ -f /tmp/reprint-dev.db.bak ]; then
    cp /tmp/reprint-dev.db.bak "$INSTALL_DIR/prisma/dev.db"
    rm -f /tmp/reprint-dev.db.bak
  fi
  if [ -d /tmp/reprint-uploads-bak ]; then
    rm -rf "$INSTALL_DIR/uploads"
    mv /tmp/reprint-uploads-bak "$INSTALL_DIR/uploads"
  fi
  cd "$INSTALL_DIR"
fi

mkdir -p uploads

# --- Install dependencies ---
echo "[3/6] Installing dependencies..."
npm install 2>&1 | tail -3

# --- Database ---
echo "[4/6] Setting up database..."
npx prisma generate 2>&1 | tail -1
npx prisma db push 2>&1 | tail -1

# --- Build ---
echo "[5/6] Building app (this takes a minute)..."
npm run build 2>&1 | tail -3

# --- Start with pm2 ---
echo "[6/6] Starting app..."
if ! command -v pm2 > /dev/null 2>&1; then
  npm install -g pm2
  ln -sf /usr/local/lib/nodejs/bin/pm2 /usr/local/bin/pm2 2>/dev/null || true
fi

pm2 delete reprint-sheets 2>/dev/null || true
pm2 start npm --name "reprint-sheets" -- start -- -p 3001 --hostname 0.0.0.0
pm2 save

# --- Get NAS IP ---
IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "YOUR_NAS_IP")

echo ""
echo "========================================="
echo "  DONE! Reprint Sheets is running at:"
echo ""
echo "  http://${IP}:3001"
echo ""
echo "  Open that URL on your iPad and tap"
echo "  Share > Add to Home Screen"
echo "========================================="
echo ""
