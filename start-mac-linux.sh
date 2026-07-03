#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

clear || true
echo "========================================"
echo " World Cup Predictor - Local Start"
echo "========================================"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed."
  echo "Install Node.js 18 or newer, then run this again."
  echo "After installing Node.js, close and reopen Terminal."
  exit 1
fi

NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "Your Node.js version is too old: $(node -v)"
  echo "Install Node.js 18 or newer."
  exit 1
fi

if [ ! -f ".env" ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
fi

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo ""
echo "Starting server..."
echo "Keep this Terminal window open."
echo "Open this in your browser: http://localhost:3000"
echo ""
npm start
