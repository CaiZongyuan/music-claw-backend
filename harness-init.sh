#!/bin/bash
set -e

npm install 2>/dev/null || bun install 2>/dev/null || true
npm test -- --bail --silent 2>/dev/null || bun test 2>/dev/null || echo "WARN: Smoke test failed"
echo "Environment health check complete"
