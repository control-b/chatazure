# Deployment Runbook

## Overview
This runbook covers deployment procedures for the Trucking Platform to Azure Container Apps.

## Prerequisites

### Required Tools
- Azure CLI (latest version)
- Docker 
- GitHub CLI (optional)
- jq (for JSON parsing)

### Required Access
- Azure subscription with Contributor role
- GitHub repository with Actions permissions
- Azure Container Registry push permissions

### Environment Setup
```bash
# Login to Azure
az login

# Set subscription
az account set --subscription "your-subscription-id"

# Login to ACR
az acr login --name your-acr-name
```

## Manual Deployment

### 1. Infrastructure Deployment

```bash
# Deploy infrastructure with Bicep
cd infra/

# Create resource group (if not exists)
az group create \
  --name rg-trucking-platform-prod \
  --location eastus

# Deploy main template
az deployment group create \
  --resource-group rg-trucking-platform-prod \
  --template-file main.bicep \
  --parameters main.parameters.json
```

### 2. Application Deployment

```bash
# Build and push images
cd ..

# API image
docker build -t your-acr.azurecr.io/trucking-api:latest ./apps/api
docker push your-acr.azurecr.io/trucking-api:latest

# Web image  
docker build -t your-acr.azurecr.io/trucking-web:latest ./apps/web
docker push your-acr.azurecr.io/trucking-web:latest

# Y.js WebSocket image
docker build -t your-acr.azurecr.io/trucking-yjs:latest ./apps/yjs
docker push your-acr.azurecr.io/trucking-yjs:latest
```

### 3. Container App Updates

```bash
# Update API container app
az containerapp update \
  --name trucking-api \
  --resource-group rg-trucking-platform-prod \
  --image your-acr.azurecr.io/trucking-api:latest

# Update Web container app
az containerapp update \
  --name trucking-web \
  --resource-group rg-trucking-platform-prod \
  --image your-acr.azurecr.io/trucking-web:latest

# Update Y.js container app
az containerapp update \
  --name trucking-yjs \
  --resource-group rg-trucking-platform-prod \
  --image your-acr.azurecr.io/trucking-yjs:latest
```

## Automated Deployment (GitHub Actions)

### Setup Secrets

Configure the following secrets in your GitHub repository:

```
AZURE_CLIENT_ID              # Service principal client ID
AZURE_CLIENT_SECRET          # Service principal secret  
AZURE_TENANT_ID              # Azure tenant ID
AZURE_SUBSCRIPTION_ID        # Azure subscription ID
AZURE_CONTAINER_REGISTRY     # ACR name (without .azurecr.io)
```

### Trigger Deployment

```bash
# Push to main branch triggers production deployment
git push origin main

# Push to develop branch triggers staging deployment  
git push origin develop

# Manual workflow dispatch
gh workflow run "Deploy to Azure" --ref main
```

## Health Checks

### Application Health
```bash
# Check container app status
az containerapp show \
  --name trucking-api \
  --resource-group rg-trucking-platform-prod \
  --query "properties.latestRevisionName,properties.provisioningState"

# Test endpoints
curl https://trucking-api.your-domain.com/api/health
curl https://trucking-web.your-domain.com/health  
curl https://trucking-yjs.your-domain.com/health
```

### Database Connectivity
```bash
# Test Cosmos DB connection
az cosmosdb sql database show \
  --account-name your-cosmos-account \
  --resource-group rg-trucking-platform-prod \
  --name trucking-platform
```

### Storage Access
```bash
# Test blob storage access
az storage container show \
  --name uploads \
  --account-name your-storage-account
```

## Rollback Procedures

### Container App Rollback
```bash
# List revisions
az containerapp revision list \
  --name trucking-api \
  --resource-group rg-trucking-platform-prod \
  --query "[].{name:name,active:properties.active,created:properties.createdTime}"

# Activate previous revision
az containerapp revision activate \
  --name trucking-api \
  --resource-group rg-trucking-platform-prod \
  --revision previous-revision-name
```

### Database Rollback
```bash
# Point-in-time restore for Cosmos DB (if needed)
az cosmosdb restore \
  --target-database-account-name your-cosmos-account-restore \
  --account-name your-cosmos-account \
  --resource-group rg-trucking-platform-prod \
  --restore-timestamp "2024-01-15T10:00:00Z"
```

## Monitoring & Troubleshooting

### Check Logs
```bash
# Container app logs
az containerapp logs show \
  --name trucking-api \
  --resource-group rg-trucking-platform-prod \
  --tail 100

# Follow logs in real-time  
az containerapp logs tail \
  --name trucking-api \
  --resource-group rg-trucking-platform-prod
```

### Application Insights
```bash
# Query Application Insights
az monitor app-insights query \
  --app your-app-insights-name \
  --analytics-query "requests | where timestamp > ago(1h) | summarize count() by resultCode"
```

### Performance Metrics
```bash
# Container app metrics
az monitor metrics list \
  --resource /subscriptions/sub-id/resourceGroups/rg-name/providers/Microsoft.App/containerApps/trucking-api \
  --metric "Requests" \
  --start-time 2024-01-15T10:00:00Z \
  --end-time 2024-01-15T11:00:00Z
```

## Emergency Procedures

### Scale Up During High Load
```bash
# Increase replica count
az containerapp update \
  --name trucking-api \
  --resource-group rg-trucking-platform-prod \
  --min-replicas 3 \
  --max-replicas 10
```

### Emergency Maintenance Mode
```bash
# Deploy maintenance page
az containerapp revision copy \
  --name trucking-web \
  --resource-group rg-trucking-platform-prod \
  --from-revision current-revision \
  --image your-acr.azurecr.io/maintenance-page:latest
```

### Database Emergency Access
```bash
# Enable Cosmos DB analytical store for emergency queries
az cosmosdb sql container update \
  --account-name your-cosmos-account \
  --database-name trucking-platform \
  --name messages \
  --analytical-storage-ttl -1
```

## Post-Deployment Checklist

- [ ] All container apps are running and healthy
- [ ] Health check endpoints respond correctly  
- [ ] Database connectivity is working
- [ ] File uploads are functioning
- [ ] Real-time features (WebSocket) are working
- [ ] Authentication flow is working
- [ ] Monitoring and alerts are active
- [ ] SSL certificates are valid
- [ ] CDN is serving static assets
- [ ] Backup processes are running

## Common Issues

### Container App Won't Start
```bash
# Check events
az containerapp revision show \
  --name trucking-api \
  --resource-group rg-trucking-platform-prod \
  --revision latest \
  --query "properties.template.containers[0].probes"

# Check environment variables
az containerapp show \
  --name trucking-api \
  --resource-group rg-trucking-platform-prod \
  --query "properties.template.containers[0].env"
```

### Database Connection Issues
```bash
# Verify connection string in Key Vault
az keyvault secret show \
  --vault-name your-key-vault \
  --name cosmos-connection-string

# Test connectivity from container
az containerapp exec \
  --name trucking-api \
  --resource-group rg-trucking-platform-prod \
  --command "curl -v https://your-cosmos-account.documents.azure.com:443/"
```

### WebSocket Connection Problems
```bash
# Check Y.js service logs specifically
az containerapp logs show \
  --name trucking-yjs \
  --resource-group rg-trucking-platform-prod \
  --filter "websocket"

# Verify session affinity is enabled
az containerapp show \
  --name trucking-yjs \
  --resource-group rg-trucking-platform-prod \
  --query "properties.configuration.ingress.stickySessions"
```

## Contact Information

**On-Call Engineer**: engineering-oncall@company.com  
**DevOps Team**: devops@company.com  
**Azure Support**: Submit ticket via Azure Portal  

**Emergency Escalation**: 
1. Engineering Manager
2. CTO  
3. Azure Technical Account Manager
