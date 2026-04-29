#!/bin/bash

# Usage: ./scripts/smoke-test.sh [base_url]
# Default base_url: http://localhost:5000
#
# This script validates that the Room XI Connect application is working correctly
# by testing critical endpoints across all major sections of the API.

set -e

BASE_URL="${1:-http://localhost:5000}"
PASS=0
FAIL=0
RESULTS=""

check() {
  local name="$1"
  local url="$2"
  local expected_status="${3:-200}"
  local method="${4:-GET}"
  
  local status
  if [ "$method" = "GET" ]; then
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  else
    status=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" 2>/dev/null || echo "000")
  fi
  
  if [ "$status" = "$expected_status" ]; then
    RESULTS="$RESULTS\n  ✅ $name (HTTP $status)"
    PASS=$((PASS + 1))
  else
    RESULTS="$RESULTS\n  ❌ $name (Expected $expected_status, got $status)"
    FAIL=$((FAIL + 1))
  fi
}

echo "🔍 Room XI Connect - Smoke Test"
echo "================================"
echo "Target: $BASE_URL"
echo ""

# Health / Basic endpoints
echo "1. Core Health Checks..."
check "App loads" "$BASE_URL/" 200
check "Health endpoint" "$BASE_URL/api/health" 200

# Auth endpoints (should return 401 when not logged in)
echo "2. Auth Endpoints..."
check "Youth auth status" "$BASE_URL/api/auth/status" 200
check "Admin status" "$BASE_URL/api/admin/status" 200
check "Org status" "$BASE_URL/api/org/status" 401
check "Worker me (no auth)" "$BASE_URL/api/youth-workers/me" 401
check "Parent status (no auth)" "$BASE_URL/api/parent-auth/status" 401

# API endpoints (may need auth)
echo "3. Public API Endpoints..."
check "Programs list" "$BASE_URL/api/programs" 200
check "Events list" "$BASE_URL/api/events" 200

# Compliance endpoint (needs admin auth)
echo "4. Admin Endpoints (expect 401 without auth)..."
check "Compliance status (no auth)" "$BASE_URL/api/admin/compliance/status" 401
check "System status (no auth)" "$BASE_URL/api/admin/system-status" 401
check "Admin stats (no auth)" "$BASE_URL/api/admin/stats" 401

# Export endpoints (need org auth)
echo "5. Org Endpoints (expect 401 without auth)..."
check "Org dashboard stats (no auth)" "$BASE_URL/api/org/dashboard/stats" 401
check "Attendance export (no auth)" "$BASE_URL/api/org/attendance/export" 401
check "Participants export (no auth)" "$BASE_URL/api/org/participants/export" 401
check "Reports stats (no auth)" "$BASE_URL/api/org/reports/stats" 401

# Static assets
echo "6. Static Assets..."
check "Manifest" "$BASE_URL/manifest.json" 200

echo ""
echo "================================"
echo -e "$RESULTS"
echo ""
echo "Results: $PASS passed, $FAIL failed"
echo "================================"

if [ $FAIL -gt 0 ]; then
  exit 1
fi

echo "🎉 All smoke tests passed!"
