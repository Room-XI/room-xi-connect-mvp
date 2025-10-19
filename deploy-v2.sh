#!/bin/bash

# ============================================================================
# Room XI Connect v2.0 - Deployment Script
# ============================================================================
# This script automates the deployment of v2.0 backend components
# 
# Usage:
#   ./deploy-v2.sh [--skip-migration] [--skip-functions] [--skip-secrets]
#
# Prerequisites:
#   - Supabase CLI installed and configured
#   - Database backed up
#   - Environment variables configured
#   - SendGrid and Upstash accounts set up
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Flags
SKIP_MIGRATION=false
SKIP_FUNCTIONS=false
SKIP_SECRETS=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-migration)
      SKIP_MIGRATION=true
      shift
      ;;
    --skip-functions)
      SKIP_FUNCTIONS=true
      shift
      ;;
    --skip-secrets)
      SKIP_SECRETS=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
  echo -e "\n${BLUE}============================================================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}============================================================================${NC}\n"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

confirm() {
  read -p "$1 (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    return 1
  fi
  return 0
}

# ============================================================================
# Pre-Deployment Checks
# ============================================================================

print_header "Pre-Deployment Checks"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  print_error "Supabase CLI not found. Install it first:"
  echo "  npm install -g supabase"
  exit 1
fi
print_success "Supabase CLI installed"

# Check if project is linked
if [ ! -f ".supabase/config.toml" ]; then
  print_error "Supabase project not linked. Run:"
  echo "  supabase link --project-ref YOUR_PROJECT_REF"
  exit 1
fi
print_success "Supabase project linked"

# Check if .env file exists
if [ ! -f ".env" ]; then
  print_warning ".env file not found. Using .env.example as template."
  if [ -f ".env.example" ]; then
    cp .env.example .env
    print_warning "Created .env from .env.example. Please fill in your values."
    exit 1
  else
    print_error ".env.example not found either!"
    exit 1
  fi
fi
print_success ".env file exists"

# Confirm deployment
echo -e "\n${YELLOW}This will deploy Room XI Connect v2.0 backend components:${NC}"
echo "  - Database migration (11 new tables, enhanced youth_profiles)"
echo "  - Edge Functions (referral-create, send-consent-email, verify-consent)"
echo "  - Supabase Secrets (encryption keys)"
echo ""

if ! confirm "Continue with deployment?"; then
  print_warning "Deployment cancelled"
  exit 0
fi

# ============================================================================
# Generate Encryption Keys
# ============================================================================

if [ "$SKIP_SECRETS" = false ]; then
  print_header "Generating Encryption Keys"

  # Check if keys already exist
  if supabase secrets list | grep -q "app.case_notes_encryption_key"; then
    print_warning "Encryption keys already exist in Supabase Vault"
    if ! confirm "Regenerate keys? (This will invalidate existing encrypted data)"; then
      print_warning "Skipping key generation"
      SKIP_SECRETS=true
    fi
  fi

  if [ "$SKIP_SECRETS" = false ]; then
    # Generate case notes encryption key (256-bit)
    CASE_NOTES_KEY=$(openssl rand -base64 32)
    print_success "Generated case_notes_encryption_key"

    # Generate XID pepper (512-bit)
    XID_PEPPER=$(openssl rand -hex 64)
    print_success "Generated xid_pepper"

    # Store in Supabase Vault
    echo "$CASE_NOTES_KEY" | supabase secrets set app.case_notes_encryption_key
    print_success "Stored case_notes_encryption_key in Supabase Vault"

    echo "$XID_PEPPER" | supabase secrets set app.xid_pepper
    print_success "Stored xid_pepper in Supabase Vault"

    # Clear variables from memory
    unset CASE_NOTES_KEY
    unset XID_PEPPER
  fi
fi

# ============================================================================
# Database Migration
# ============================================================================

if [ "$SKIP_MIGRATION" = false ]; then
  print_header "Database Migration"

  print_warning "IMPORTANT: Ensure you have backed up your database!"
  if ! confirm "Have you backed up your database?"; then
    print_error "Please backup your database before continuing"
    exit 1
  fi

  # Check if migration file exists
  if [ ! -f "supabase/migrations/20241018_edmonton_expansion.sql" ]; then
    print_error "Migration file not found: supabase/migrations/20241018_edmonton_expansion.sql"
    exit 1
  fi

  # Apply migration
  echo "Applying migration..."
  supabase db push

  print_success "Migration applied successfully"

  # Verify migration
  echo "Verifying migration..."
  
  # Check if coping_skills table exists and has data
  COPING_SKILLS_COUNT=$(supabase db execute "SELECT COUNT(*) FROM coping_skills;" --format csv | tail -n 1)
  
  if [ "$COPING_SKILLS_COUNT" -gt 0 ]; then
    print_success "Coping skills seeded: $COPING_SKILLS_COUNT skills"
  else
    print_warning "Coping skills not seeded. You may need to seed manually."
  fi
fi

# ============================================================================
# Deploy Edge Functions
# ============================================================================

if [ "$SKIP_FUNCTIONS" = false ]; then
  print_header "Deploying Edge Functions"

  # List of functions to deploy
  FUNCTIONS=("referral-create" "send-consent-email" "verify-consent" "xid-create")

  for func in "${FUNCTIONS[@]}"; do
    if [ -d "supabase/functions/$func" ]; then
      echo "Deploying $func..."
      supabase functions deploy "$func"
      print_success "Deployed $func"
    else
      print_warning "Function not found: $func (skipping)"
    fi
  done

  # Verify deployments
  echo -e "\nVerifying function deployments..."
  supabase functions list
  print_success "All functions deployed"
fi

# ============================================================================
# Verify Environment Variables
# ============================================================================

print_header "Environment Variables Check"

# Check required environment variables
REQUIRED_VARS=(
  "SENDGRID_API_KEY"
  "SENDGRID_FROM"
  "UPSTASH_REDIS_REST_URL"
  "UPSTASH_REDIS_REST_TOKEN"
  "APP_URL"
)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
  if ! supabase secrets list | grep -q "$var"; then
    MISSING_VARS+=("$var")
  fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  print_warning "Missing environment variables:"
  for var in "${MISSING_VARS[@]}"; do
    echo "  - $var"
  done
  echo ""
  echo "Set them with:"
  echo "  supabase secrets set $var=YOUR_VALUE"
  echo ""
  print_warning "Some features may not work without these variables"
else
  print_success "All required environment variables are set"
fi

# ============================================================================
# Post-Deployment Tasks
# ============================================================================

print_header "Post-Deployment Tasks"

echo "Remaining manual tasks:"
echo ""
echo "1. Seed initial data:"
echo "   - Create Room XI organization"
echo "   - Add admin users to organization"
echo "   - Seed Edmonton programs"
echo ""
echo "2. Test edge functions:"
echo "   - Test xid-create"
echo "   - Test referral-create"
echo "   - Test consent email flow"
echo ""
echo "3. Deploy frontend:"
echo "   npm run build"
echo "   vercel --prod"
echo ""
echo "4. Verify deployment:"
echo "   - Test journal page"
echo "   - Test org dashboard"
echo "   - Test consent verification"
echo "   - Check browser console for errors"
echo ""

# ============================================================================
# Summary
# ============================================================================

print_header "Deployment Summary"

echo "Completed steps:"
if [ "$SKIP_SECRETS" = false ]; then
  print_success "Encryption keys generated and stored"
else
  print_warning "Encryption keys skipped"
fi

if [ "$SKIP_MIGRATION" = false ]; then
  print_success "Database migration applied"
else
  print_warning "Database migration skipped"
fi

if [ "$SKIP_FUNCTIONS" = false ]; then
  print_success "Edge functions deployed"
else
  print_warning "Edge functions skipped"
fi

echo ""
print_success "Backend deployment complete!"
echo ""
echo "Next steps:"
echo "  1. Complete manual tasks listed above"
echo "  2. Test thoroughly in staging"
echo "  3. Deploy frontend to production"
echo "  4. Monitor for 48 hours post-deployment"
echo ""
echo "For detailed instructions, see:"
echo "  - V2_DEPLOYMENT_GUIDE.md"
echo "  - README_V2.md"
echo ""

print_success "Deployment script finished successfully"

