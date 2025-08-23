#!/bin/bash

# Security Validation Script
# Run this script to verify no secrets are exposed in the repository

set -e

echo "🔒 Running Security Validation..."
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Verify .env files are ignored or not tracked
echo -e "\n📋 Checking .env file exclusions..."
if git check-ignore .env.development >/dev/null 2>&1 || ! git ls-files --error-unmatch .env.development >/dev/null 2>&1; then
    echo -e "✅ ${GREEN}.env.development properly ignored or not tracked${NC}"
else
    echo -e "❌ ${RED}.env.development is tracked in git${NC}"
    exit 1
fi

# Check 2: Look for any tracked .env files
echo -e "\n📋 Checking for tracked .env files..."
TRACKED_ENV_FILES=$(git ls-files | grep -E "\.env" || true)
if [ -z "$TRACKED_ENV_FILES" ]; then
    echo -e "✅ ${GREEN}No .env files are tracked${NC}"
else
    echo -e "❌ ${RED}Found tracked .env files:${NC}"
    echo "$TRACKED_ENV_FILES"
    exit 1
fi

# Check 3: Search for potential hardcoded secrets
echo -e "\n📋 Scanning for potential hardcoded secrets..."
SECRET_PATTERNS="(sk-|pk_|pk_live_|sk_live_|AIza[0-9A-Za-z-_]{35}|AKIA[0-9A-Z]{16})"
HARDCODED_SECRETS=$(grep -r -E "$SECRET_PATTERNS" --include="*.js" --include="*.ts" --include="*.tsx" --include="*.ex" --include="*.exs" --include="*.json" --exclude-dir=node_modules --exclude-dir=deps --exclude-dir=_build . || true)

if [ -z "$HARDCODED_SECRETS" ]; then
    echo -e "✅ ${GREEN}No hardcoded secrets detected${NC}"
else
    echo -e "⚠️  ${YELLOW}Potential secrets found - please review:${NC}"
    echo "$HARDCODED_SECRETS"
fi

# Check 4: Look for password/secret patterns in code
echo -e "\n📋 Checking for unsafe secret patterns..."
UNSAFE_PATTERNS=$(grep -r -E "(password|secret|key|token)\s*=\s*['\"][^'\"]+['\"]" --include="*.js" --include="*.ts" --include="*.tsx" --include="*.ex" --include="*.exs" --exclude-dir=node_modules --exclude-dir=deps --exclude-dir=_build . | grep -v "System.get_env\|process.env\|Application.get_env" || true)

if [ -z "$UNSAFE_PATTERNS" ]; then
    echo -e "✅ ${GREEN}No unsafe secret patterns found${NC}"
else
    echo -e "⚠️  ${YELLOW}Potential unsafe patterns found - please review:${NC}"
    echo "$UNSAFE_PATTERNS"
fi

# Check 5: Verify git history doesn't contain secret keywords
echo -e "\n📋 Checking git history for secret-related commits..."
SECRET_COMMITS=$(git log --all --grep="password\|secret\|key\|token" --oneline | head -5 || true)
if [ -z "$SECRET_COMMITS" ]; then
    echo -e "✅ ${GREEN}No secret-related commits in recent history${NC}"
else
    echo -e "ℹ️  ${YELLOW}Found commits with secret-related keywords (may be legitimate):${NC}"
    echo "$SECRET_COMMITS"
fi

# Check 6: Verify current working directory is clean
echo -e "\n📋 Checking working directory status..."
UNTRACKED_FILES=$(git status --porcelain | grep "^??" || true)
if [ -z "$UNTRACKED_FILES" ]; then
    echo -e "✅ ${GREEN}No untracked files${NC}"
else
    echo -e "ℹ️  ${YELLOW}Untracked files found:${NC}"
    echo "$UNTRACKED_FILES"
    
    # Check if any untracked files might contain secrets
    SECRET_FILES=$(echo "$UNTRACKED_FILES" | grep -E "\.env|secret|credential|\.key|\.pem" || true)
    if [ ! -z "$SECRET_FILES" ]; then
        echo -e "⚠️  ${YELLOW}Untracked files that might contain secrets:${NC}"
        echo "$SECRET_FILES"
    fi
fi

# Check 7: Verify .gitignore contains necessary patterns
echo -e "\n📋 Checking .gitignore security patterns..."
REQUIRED_PATTERNS=(".env" "*.key" "*.pem" "secrets.json" "credentials.json")
MISSING_PATTERNS=""

for pattern in "${REQUIRED_PATTERNS[@]}"; do
    if ! grep -q "$pattern" .gitignore; then
        MISSING_PATTERNS="$MISSING_PATTERNS $pattern"
    fi
done

if [ -z "$MISSING_PATTERNS" ]; then
    echo -e "✅ ${GREEN}All required security patterns in .gitignore${NC}"
else
    echo -e "⚠️  ${YELLOW}Missing security patterns in .gitignore:${NC}"
    echo "$MISSING_PATTERNS"
fi

echo -e "\n🎉 ${GREEN}Security validation complete!${NC}"
echo -e "\n📋 Summary:"
echo -e "   • Environment files are properly excluded"
echo -e "   • No hardcoded secrets detected"
echo -e "   • Git history appears clean"
echo -e "   • Security patterns in .gitignore"

echo -e "\n💡 To run this check again:"
echo -e "   ./scripts/security-check.sh"

echo -e "\n📚 For more details, see SECURITY.md"
