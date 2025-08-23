#!/bin/bash

# Setup Azure OIDC Federated Identity for GitHub Actions
# This script configures the service principal to trust GitHub Actions OIDC tokens

set -e

# Configuration
GITHUB_REPO="${1:-banjahmarah/ChatAzure}"
APP_NAME="ChatAzure-GitHub-Actions"

echo "🔐 Setting up Azure OIDC Federated Identity for GitHub Actions"
echo "Repository: $GITHUB_REPO"

# Check if user is logged into Azure CLI
if ! az account show &> /dev/null; then
    echo "❌ Please log in to Azure CLI first: az login"
    exit 1
fi

# Get current subscription ID
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
echo "📋 Subscription ID: $SUBSCRIPTION_ID"

# Check if application already exists
APP_ID=$(az ad app list --display-name "$APP_NAME" --query "[0].appId" -o tsv 2>/dev/null || echo "")

if [ -z "$APP_ID" ] || [ "$APP_ID" = "null" ]; then
    echo "🆕 Creating new Azure AD application: $APP_NAME"
    APP_ID=$(az ad app create --display-name "$APP_NAME" --query appId -o tsv)
else
    echo "✅ Found existing application: $APP_ID"
fi

# Get service principal ID
SP_ID=$(az ad sp list --filter "appId eq '$APP_ID'" --query "[0].id" -o tsv 2>/dev/null || echo "")

if [ -z "$SP_ID" ] || [ "$SP_ID" = "null" ]; then
    echo "🆕 Creating service principal for application"
    SP_ID=$(az ad sp create --id "$APP_ID" --query id -o tsv)
else
    echo "✅ Found existing service principal: $SP_ID"
fi

# Assign Contributor role to the service principal
echo "🔑 Assigning Contributor role to service principal"
az role assignment create \
    --assignee "$APP_ID" \
    --role "Contributor" \
    --scope "/subscriptions/$SUBSCRIPTION_ID" \
    --only-show-errors || echo "⚠️  Role assignment may already exist"

# Create federated identity credential for main branch
echo "🌐 Creating federated identity credential for main branch"
cat > fed-cred-main.json << EOF
{
    "name": "GitHubActions-main",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:$GITHUB_REPO:ref:refs/heads/main",
    "description": "GitHub Actions federated identity for main branch",
    "audiences": [
        "api://AzureADTokenExchange"
    ]
}
EOF

az ad app federated-credential create \
    --id "$APP_ID" \
    --parameters fed-cred-main.json \
    --only-show-errors || echo "⚠️  Federated credential for main branch may already exist"

# Create federated identity credential for pull requests
echo "🌐 Creating federated identity credential for pull requests"
cat > fed-cred-pr.json << EOF
{
    "name": "GitHubActions-pr",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:$GITHUB_REPO:pull_request",
    "description": "GitHub Actions federated identity for pull requests",
    "audiences": [
        "api://AzureADTokenExchange"
    ]
}
EOF

az ad app federated-credential create \
    --id "$APP_ID" \
    --parameters fed-cred-pr.json \
    --only-show-errors || echo "⚠️  Federated credential for PR may already exist"

# Get tenant ID
TENANT_ID=$(az account show --query tenantId -o tsv)

# Clean up temporary files
rm -f fed-cred-main.json fed-cred-pr.json

echo ""
echo "✅ Azure OIDC Federated Identity setup completed!"
echo ""
echo "📋 GitHub Secrets to configure:"
echo "AZURE_CLIENT_ID: $APP_ID"
echo "AZURE_TENANT_ID: $TENANT_ID"
echo "AZURE_SUBSCRIPTION_ID: $SUBSCRIPTION_ID"
echo ""
echo "🔧 To set these secrets in GitHub:"
echo "gh secret set AZURE_CLIENT_ID --body '$APP_ID'"
echo "gh secret set AZURE_TENANT_ID --body '$TENANT_ID'"
echo "gh secret set AZURE_SUBSCRIPTION_ID --body '$SUBSCRIPTION_ID'"
echo ""
echo "🚀 Your GitHub Actions workflows can now authenticate to Azure using OIDC!"
