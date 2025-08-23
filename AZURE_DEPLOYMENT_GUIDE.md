# 🚛 Azure Development & CI/CD Setup Guide

Complete guide for setting up Azure Container Apps deployment with development VM and automated CI/CD pipeline.

## 🏗️ **Architecture Overview**

```
┌─────────────────┐    SSH/Code    ┌──────────────────────────────┐
│   Local Dev     │──────────────▶│     Azure Dev VM             │
│   Machine       │                │   (Standard_D8s_v5)          │
└─────────────────┘                └──────────────┬───────────────┘
                                                   │
                                          ┌────────▼────────┐
                                          │  GitHub Actions │
                                          │  Runner (Self-  │
                                          │    hosted)      │
                                          └────────┬────────┘
                                                   │
                                                   ▼
                                          ┌─────────────────┐
                                          │   GitHub Repo   │
                                          │   CI/CD Pipeline│
                                          └────────┬────────┘
                                                   │
                                                   ▼
                                          ┌─────────────────┐
                                          │   Azure         │
                                          │   Container     │
                                          │   Apps (ACA)    │
                                          │   East US 2     │
                                          └─────────────────┘
```

## 🚀 **Quick Start**

### **Option 1: Automated Setup (Recommended)**

Run the automated setup script:

```bash
cd /Users/banjahmarah/Desktop/ChatAzure
./scripts/setup-cicd.sh
```

This script will:
- ✅ Create Azure AD app with federated identity
- ✅ Configure GitHub secrets and variables
- ✅ Set up service principal with proper permissions
- ✅ Generate secure application secrets
- ✅ Create deployment checklist

### **Option 2: Manual Setup**

Follow the manual steps below if you prefer granular control.

## 📋 **Prerequisites**

- [x] **Azure CLI** installed and logged in
- [x] **GitHub CLI** installed and authenticated
- [x] **Docker** installed and running
- [x] **Node.js 18+** and **pnpm**
- [x] **Elixir/Phoenix** (for backend development)
- [x] **SSH key pair** for VM access

## 🔧 **Manual Setup Steps**

### **1. Azure Authentication Setup**

```bash
# Login to Azure
az login

# Get your subscription details
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)

echo "Subscription ID: $SUBSCRIPTION_ID"
echo "Tenant ID: $TENANT_ID"
```

### **2. Create Azure AD Application**

```bash
# Create Azure AD app for GitHub Actions
APP_NAME="GitHubActions-TruckingPlatform"
APP_ID=$(az ad app create --display-name "$APP_NAME" --query appId -o tsv)

# Create service principal
az ad sp create --id "$APP_ID"

# Assign Contributor role
az role assignment create \
    --assignee "$APP_ID" \
    --role "Contributor" \
    --scope "/subscriptions/$SUBSCRIPTION_ID"

echo "Azure AD App ID: $APP_ID"
```

### **3. Configure Federated Identity**

```bash
# For main branch deployments
az ad app federated-credential create \
    --id "$APP_ID" \
    --parameters '{
        "name": "github-main",
        "issuer": "https://token.actions.githubusercontent.com",
        "subject": "repo:Control-B/ChatAzure:ref:refs/heads/main",
        "description": "GitHub Actions - Main branch",
        "audiences": ["api://AzureADTokenExchange"]
    }'

# For pull request validation
az ad app federated-credential create \
    --id "$APP_ID" \
    --parameters '{
        "name": "github-pr",
        "issuer": "https://token.actions.githubusercontent.com",
        "subject": "repo:Control-B/ChatAzure:pull_request",
        "description": "GitHub Actions - Pull requests",
        "audiences": ["api://AzureADTokenExchange"]
    }'
```

### **4. Generate Application Secrets**

```bash
# Generate secure random secrets
NEXTAUTH_SECRET=$(openssl rand -base64 32)
SECRET_KEY_BASE=$(openssl rand -base64 64)
POSTGRES_ADMIN_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-15)

echo "Generated secrets (save these securely):"
echo "NEXTAUTH_SECRET: $NEXTAUTH_SECRET"
echo "SECRET_KEY_BASE: $SECRET_KEY_BASE"
echo "POSTGRES_ADMIN_PASSWORD: $POSTGRES_ADMIN_PASSWORD"
```

### **5. Configure GitHub Secrets**

```bash
# Login to GitHub CLI
gh auth login

# Set repository secrets
gh secret set AZURE_CLIENT_ID --body "$APP_ID"
gh secret set AZURE_TENANT_ID --body "$TENANT_ID"
gh secret set AZURE_SUBSCRIPTION_ID --body "$SUBSCRIPTION_ID"
gh secret set NEXTAUTH_SECRET --body "$NEXTAUTH_SECRET"
gh secret set SECRET_KEY_BASE --body "$SECRET_KEY_BASE"
gh secret set POSTGRES_ADMIN_PASSWORD --body "$POSTGRES_ADMIN_PASSWORD"
gh secret set NEXTAUTH_URL --body "https://trucking-platform.azurecontainerapps.io"
gh secret set PHX_HOST --body "trucking-platform-api.azurecontainerapps.io"

# Set repository variables
gh variable set AZURE_ENV_NAME --body "trucking-platform"
gh variable set AZURE_LOCATION --body "eastus2"
```

## 🖥️ **Development VM Setup**

### **Deploy Development VM**

1. **Get your SSH public key:**
   ```bash
   cat ~/.ssh/id_rsa.pub
   ```

2. **Get your public IP:**
   ```bash
   curl -s ifconfig.me
   ```

3. **Deploy VM via GitHub Actions:**
   ```bash
   gh workflow run setup-vm.yml \
     --field ssh_public_key="YOUR_SSH_PUBLIC_KEY" \
     --field allowed_source_ip="YOUR_PUBLIC_IP" \
     --field github_token="YOUR_GITHUB_TOKEN"
   ```

### **Access Development VM**

Once deployed, you'll receive:
- **SSH access:** `ssh azureuser@<VM_IP>`
- **VS Code Server:** `http://<VM_IP>:8080` (Password: `DevPassword123!`)
- **GitHub Actions Runner:** Automatically configured

### **Development Workflow**

```bash
# SSH into the VM
ssh azureuser@<VM_IP>

# Clone the repository
git clone https://github.com/Control-B/ChatAzure.git
cd ChatAzure

# Install dependencies
cd monorepo/apps/web && pnpm install
cd ../api && mix deps.get

# Start development
cd monorepo/apps/web && pnpm dev    # Frontend on :3000
cd monorepo/apps/api && mix phx.server  # Backend on :4000
```

## 🚀 **Production Deployment**

### **Automatic Deployment (Recommended)**

Simply push to the main branch:

```bash
git add .
git commit -m "feat: deploy to production"
git push origin main
```

The GitHub Actions pipeline will:
1. ✅ **Build** Docker images for web and backend
2. ✅ **Test** applications with automated test suites
3. ✅ **Deploy** infrastructure using Bicep templates
4. ✅ **Deploy** applications to Azure Container Apps
5. ✅ **Run** smoke tests and performance validation

### **Manual Deployment**

If you prefer manual control:

```bash
# Ensure azd is authenticated
azd auth login

# Initialize environment
azd env new trucking-platform --location eastus2

# Set environment variables
azd env set AZURE_LOCATION eastus2
azd env set NEXTAUTH_SECRET "$NEXTAUTH_SECRET"
azd env set SECRET_KEY_BASE "$SECRET_KEY_BASE"
azd env set POSTGRES_ADMIN_PASSWORD "$POSTGRES_ADMIN_PASSWORD"

# Deploy infrastructure and applications
azd up
```

## 📊 **Monitoring & Validation**

### **Deployment Monitoring**

```bash
# Check deployment status
gh run list

# View specific workflow run
gh run view <RUN_ID>

# Monitor Azure resources
az resource list --resource-group "rg-trucking-platform" --output table
```

### **Health Checks**

The deployment includes automatic health checks:

```bash
# Web frontend health
curl https://<WEB_URL>/api/health

# Phoenix backend health  
curl https://<API_URL>/api/health
```

### **Performance Testing**

Automated performance testing with k6 runs after deployment:
- **Load test:** 20 concurrent users for 2 minutes
- **Response time:** < 500ms target
- **Success rate:** > 99% target

## 🔧 **Configuration Files**

### **Key Files Created:**

- **`infra/dev-vm.bicep`** - Development VM infrastructure
- **`.github/workflows/deploy.yml`** - Main CI/CD pipeline
- **`.github/workflows/setup-vm.yml`** - VM deployment workflow
- **`scripts/setup-cicd.sh`** - Automated setup script
- **`.env.development`** - Development environment variables

### **Azure Resources Created:**

| Resource Type | Purpose | Configuration |
|---------------|---------|---------------|
| **Container Apps** | Web frontend & Phoenix backend | Auto-scaling, managed certificates |
| **PostgreSQL** | Primary database | Flexible server, 99.95% SLA |
| **Redis Cache** | Session & caching | Premium tier, geo-replication |
| **Key Vault** | Secrets management | RBAC enabled, audit logging |
| **Container Registry** | Docker images | Geo-replication, security scanning |
| **Application Insights** | Monitoring & logging | Real-time metrics, alerting |
| **Virtual Machine** | Development environment | Standard_D8s_v5, auto-shutdown |

## 🛡️ **Security Features**

- **🔐 Federated Identity:** No long-lived secrets
- **🔑 Managed Identity:** Azure resource authentication
- **🌐 Network Security:** NSG with IP restrictions
- **🔒 Key Vault:** Centralized secret management
- **📝 Audit Logging:** All operations logged
- **🚪 SSH Keys:** No password authentication

## 📈 **Scaling for 20M+ DAU**

The infrastructure is designed for high scale:

- **Auto-scaling:** Container Apps scale 0-100 instances
- **Global distribution:** Multi-region deployment ready
- **Database optimization:** Connection pooling, read replicas
- **Caching strategy:** Redis for session and data caching
- **CDN integration:** Static asset optimization
- **Performance monitoring:** Real-time metrics and alerting

## 🆘 **Troubleshooting**

### **Common Issues:**

1. **Build failures:** Check Dockerfile and dependencies
2. **Azure quota:** Verify limits in East US 2
3. **Network connectivity:** Ensure Container Apps communication
4. **Secrets:** Verify all GitHub secrets are set correctly

### **Debug Commands:**

```bash
# Check Azure resource status
az containerapp list --resource-group "rg-trucking-platform"

# View container logs
az containerapp logs show --name "web-frontend" --resource-group "rg-trucking-platform"

# Check GitHub Actions runner status
sudo systemctl status actions.runner.*
```

## 🎯 **Next Steps**

1. **✅ Complete CI/CD setup** using automated script
2. **🖥️ Deploy development VM** for remote development
3. **🚀 Push to main branch** to trigger production deployment
4. **📊 Monitor deployment** and validate health checks
5. **🔧 Customize configuration** for your specific needs
6. **📈 Scale resources** as traffic grows

## 📞 **Support**

- **GitHub Issues:** Report bugs and feature requests
- **Azure Support:** Use Azure portal for infrastructure issues
- **Documentation:** Check Azure Container Apps documentation
- **Community:** Azure and Phoenix/Elixir communities

---

**🎉 Your trucking platform is now ready for enterprise-scale deployment on Azure!** 🚛☁️
