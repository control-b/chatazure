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
