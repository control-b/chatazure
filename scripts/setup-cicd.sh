#!/bin/bash
# Setup script for GitHub Actions CI/CD Pipeline

set -e

echo "🚀 Setting up CI/CD Pipeline for Trucking Platform"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check prerequisites
print_info "Checking prerequisites..."

if ! command -v az &> /dev/null; then
    print_error "Azure CLI is not installed. Please install it first."
    exit 1
fi

if ! command -v gh &> /dev/null; then
    print_error "GitHub CLI is not installed. Please install it first."
    exit 1
fi

print_status "Prerequisites check passed"

# Login to Azure (if not already logged in)
print_info "Checking Azure login status..."
if ! az account show &> /dev/null; then
    print_warning "Please log in to Azure"
    az login
fi

# Get Azure subscription details
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)

print_status "Using Azure subscription: $SUBSCRIPTION_ID"

# Create Azure AD App for GitHub Actions
print_info "Creating Azure AD application for GitHub Actions..."

APP_NAME="GitHubActions-TruckingPlatform"
APP_ID=$(az ad app list --display-name "$APP_NAME" --query "[0].appId" -o tsv)

if [ -z "$APP_ID" ]; then
    print_info "Creating new Azure AD application..."
    APP_ID=$(az ad app create --display-name "$APP_NAME" --query appId -o tsv)
    print_status "Created Azure AD app: $APP_ID"
else
    print_status "Using existing Azure AD app: $APP_ID"
fi

# Create service principal
PRINCIPAL_ID=$(az ad sp list --filter "appId eq '$APP_ID'" --query "[0].id" -o tsv)

if [ -z "$PRINCIPAL_ID" ]; then
    print_info "Creating service principal..."
    PRINCIPAL_ID=$(az ad sp create --id "$APP_ID" --query id -o tsv)
    print_status "Created service principal: $PRINCIPAL_ID"
else
    print_status "Using existing service principal: $PRINCIPAL_ID"
fi

# Assign Contributor role to service principal
print_info "Assigning Contributor role..."
az role assignment create \
    --assignee "$APP_ID" \
    --role "Contributor" \
    --scope "/subscriptions/$SUBSCRIPTION_ID" \
    --output none

print_status "Assigned Contributor role"

# Setup federated identity for GitHub Actions
print_info "Setting up federated identity credential..."

# For main branch
CREDENTIAL_NAME="github-main"
az ad app federated-credential create \
    --id "$APP_ID" \
    --parameters '{
        "name": "'$CREDENTIAL_NAME'",
        "issuer": "https://token.actions.githubusercontent.com",
        "subject": "repo:Control-B/ChatAzure:ref:refs/heads/main",
        "description": "GitHub Actions - Main branch",
        "audiences": ["api://AzureADTokenExchange"]
    }' --output none 2>/dev/null || print_warning "Federated credential for main branch may already exist"

# For pull requests
CREDENTIAL_NAME="github-pr"
az ad app federated-credential create \
    --id "$APP_ID" \
    --parameters '{
        "name": "'$CREDENTIAL_NAME'",
        "issuer": "https://token.actions.githubusercontent.com",
        "subject": "repo:Control-B/ChatAzure:pull_request",
        "description": "GitHub Actions - Pull requests",
        "audiences": ["api://AzureADTokenExchange"]
    }' --output none 2>/dev/null || print_warning "Federated credential for PR may already exist"

print_status "Federated identity credentials configured"

# Generate secrets
print_info "Generating application secrets..."

# Generate random secrets
NEXTAUTH_SECRET=$(openssl rand -base64 32)
SECRET_KEY_BASE=$(openssl rand -base64 64)
POSTGRES_ADMIN_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-15)

print_status "Generated application secrets"

# Setup GitHub repository secrets
print_info "Setting up GitHub repository secrets..."

# Check if logged into GitHub
if ! gh auth status &> /dev/null; then
    print_warning "Please log in to GitHub"
    gh auth login
fi

# Set secrets
gh secret set AZURE_CLIENT_ID --body "$APP_ID"
gh secret set AZURE_TENANT_ID --body "$TENANT_ID"
gh secret set AZURE_SUBSCRIPTION_ID --body "$SUBSCRIPTION_ID"
gh secret set NEXTAUTH_SECRET --body "$NEXTAUTH_SECRET"
gh secret set SECRET_KEY_BASE --body "$SECRET_KEY_BASE"
gh secret set POSTGRES_ADMIN_PASSWORD --body "$POSTGRES_ADMIN_PASSWORD"

# Set NEXTAUTH_URL (will be updated after first deployment)
gh secret set NEXTAUTH_URL --body "https://trucking-platform.azurecontainerapps.io"
gh secret set PHX_HOST --body "trucking-platform-api.azurecontainerapps.io"

print_status "GitHub secrets configured"

# Setup GitHub variables
print_info "Setting up GitHub variables..."

gh variable set AZURE_ENV_NAME --body "trucking-platform"
gh variable set AZURE_LOCATION --body "eastus2"

print_status "GitHub variables configured"

# Create development environment secrets
print_info "Setting up development environment..."

# Environment-specific secrets for development VM
cat > .env.development << EOF
# Development Environment Configuration
AZURE_CLIENT_ID=$APP_ID
AZURE_TENANT_ID=$TENANT_ID
AZURE_SUBSCRIPTION_ID=$SUBSCRIPTION_ID
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
SECRET_KEY_BASE=$SECRET_KEY_BASE
POSTGRES_ADMIN_PASSWORD=$POSTGRES_ADMIN_PASSWORD
NEXTAUTH_URL=http://localhost:3000
PHX_HOST=localhost
PHX_SERVER=true
PORT=4000
EOF

print_status "Development environment file created (.env.development)"

# Create production checklist
cat > DEPLOYMENT_CHECKLIST.md << 'EOF'
# Deployment Checklist

## Prerequisites ✅
- [x] Azure CLI installed and configured
- [x] GitHub CLI installed and configured  
- [x] Azure AD application created
- [x] Service principal configured with Contributor role
- [x] Federated identity credentials for GitHub Actions
- [x] GitHub repository secrets configured

## GitHub Secrets Configured ✅
- [x] `AZURE_CLIENT_ID` - Azure AD App ID
- [x] `AZURE_TENANT_ID` - Azure Tenant ID  
- [x] `AZURE_SUBSCRIPTION_ID` - Azure Subscription ID
- [x] `NEXTAUTH_SECRET` - NextAuth.js secret
- [x] `SECRET_KEY_BASE` - Phoenix secret key base
- [x] `POSTGRES_ADMIN_PASSWORD` - PostgreSQL admin password
- [x] `NEXTAUTH_URL` - NextAuth callback URL
- [x] `PHX_HOST` - Phoenix host configuration

## GitHub Variables Configured ✅
- [x] `AZURE_ENV_NAME` - Environment name (trucking-platform)
- [x] `AZURE_LOCATION` - Azure region (eastus2)

## Deployment Steps

### 1. Deploy Development VM (Optional)
```bash
# Run the setup-vm workflow manually with your SSH key
gh workflow run setup-vm.yml \
  --field ssh_public_key="$(cat ~/.ssh/id_rsa.pub)" \
  --field allowed_source_ip="$(curl -s ifconfig.me)" \
  --field github_token="YOUR_GITHUB_TOKEN"
```

### 2. Deploy Production Infrastructure
```bash
# Push to main branch to trigger deployment
git add .
git commit -m "feat: deploy to Azure Container Apps"
git push origin main
```

### 3. Monitor Deployment
- Check GitHub Actions workflow progress
- Verify Azure resources in portal
- Test application endpoints

## Post-Deployment

### Update URLs
After first deployment, update the following secrets with actual URLs:
- `NEXTAUTH_URL` - Update with actual web frontend URL
- `PHX_HOST` - Update with actual Phoenix backend host

### Performance Testing
The CI/CD pipeline includes automatic performance testing with k6.

### Monitoring
- Azure Application Insights configured
- Log Analytics workspace for centralized logging
- Azure Monitor for infrastructure metrics

## Troubleshooting

### Common Issues
1. **Docker build failures**: Check Dockerfile syntax and dependencies
2. **Azure quota limits**: Verify quota in East US 2 region
3. **Network connectivity**: Ensure Container Apps can communicate
4. **Environment variables**: Verify all secrets are properly set

### Support
- Check GitHub Actions logs for detailed error messages
- Monitor Azure Activity Log for infrastructure issues
- Review Container Apps logs in Azure portal
EOF

print_status "Deployment checklist created (DEPLOYMENT_CHECKLIST.md)"

# Summary
echo ""
echo "🎉 CI/CD Pipeline Setup Complete!"
echo "================================="
echo ""
echo "📋 Summary:"
echo "   ✅ Azure AD application created: $APP_ID"
echo "   ✅ Service principal configured with Contributor role"
echo "   ✅ Federated identity for GitHub Actions"
echo "   ✅ GitHub secrets and variables configured"
echo "   ✅ Development environment file created"
echo "   ✅ Deployment checklist created"
echo ""
echo "🚀 Next Steps:"
echo "   1. Review DEPLOYMENT_CHECKLIST.md"
echo "   2. Optionally deploy development VM using GitHub Actions"
echo "   3. Push to main branch to trigger production deployment"
echo "   4. Monitor deployment in GitHub Actions"
echo ""
echo "🔗 Useful Commands:"
echo "   # Deploy development VM"
echo "   gh workflow run setup-vm.yml"
echo ""
echo "   # Trigger deployment"
echo "   git push origin main"
echo ""
echo "   # Monitor workflows"
echo "   gh run list"
echo ""
print_status "Setup completed successfully!"
EOF
