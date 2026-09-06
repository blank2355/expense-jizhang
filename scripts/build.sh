#!/bin/bash
set -Eeuo pipefail

cd ""

echo "Installing dependencies..."
pnpm install --prefer-frozen-lockfile --prefer-offline --loglevel warn

echo "Building the Next.js project..."
pnpm next build

echo "Build completed successfully!"
