// resources.bicep - Core Azure resources for FleetLink
@description('Primary location for all resources')
param location string

@description('Environment name')
param environmentName string

@description('Resource token for unique naming')
param resourceToken string

@description('Resource prefix for naming')
param resourcePrefix string

@description('Tags for all resources')
param tags object

@description('Application Insights daily cap in GB')
param appInsightsDailyCap int

@description('Log Analytics retention in days')
param logAnalyticsRetentionInDays int

@description('Container Apps Environment name')
param containerAppsEnvironmentName string

@description('Container Registry name')
param containerRegistryName string

@secure()
@description('Web Frontend environment variables')
param webFrontendEnvVars object

@secure()
@description('Phoenix Backend environment variables')
param phoenixBackendEnvVars object

// Log Analytics Workspace for centralized logging
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'law-${resourcePrefix}-${resourceToken}'
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: logAnalyticsRetentionInDays
    features: {
      searchVersion: 1
    }
  }
}

// Application Insights for application monitoring
resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'ai-${resourcePrefix}-${resourceToken}'
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    IngestionMode: 'LogAnalytics'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
    DisableIpMasking: false
  }
}

// Application Insights Daily Cap
resource appInsightsDailyCapConfig 'Microsoft.Insights/components/pricingPlans@2017-10-01' = {
  parent: applicationInsights
  name: 'current'
  properties: {
    planType: 'Basic'
    cap: appInsightsDailyCap
    stopSendNotificationWhenHitCap: false
  }
}

// User-assigned managed identity for secure access
resource userIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'id-${resourcePrefix}-${resourceToken}'
  location: location
  tags: tags
}

// Key Vault for secrets management
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: 'kv-${resourcePrefix}-${resourceToken}'
  location: location
  tags: tags
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    enablePurgeProtection: false
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
}

// Grant Key Vault Secrets Officer role to managed identity
resource keyVaultRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: keyVault
  name: guid(keyVault.id, userIdentity.id, 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7')
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7')
    principalId: userIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// Store secrets in Key Vault
resource nextAuthSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'nextauth-secret'
  properties: {
    value: webFrontendEnvVars.NEXTAUTH_SECRET
  }
}

resource secretKeyBase 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'secret-key-base'
  properties: {
    value: phoenixBackendEnvVars.SECRET_KEY_BASE
  }
}

// Container Registry for storing container images
resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: containerRegistryName
  location: location
  tags: tags
  sku: {
    name: 'Standard'
  }
  properties: {
    adminUserEnabled: false
    publicNetworkAccess: 'Enabled'
    networkRuleBypassOptions: 'AzureServices'
    zoneRedundancy: 'Disabled'
  }
}

// Grant AcrPull role to managed identity
resource acrPullRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: containerRegistry
  name: guid(containerRegistry.id, userIdentity.id, '7f951dda-4ed3-4680-a7ca-43fe172d538d')
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
    principalId: userIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// Azure Cache for Redis (Standard tier for production scale)
resource redisCache 'Microsoft.Cache/redis@2023-08-01' = {
  name: 'redis-${resourcePrefix}-${resourceToken}'
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'Standard'
      family: 'C'
      capacity: 2
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
    redisConfiguration: {
      'maxmemory-policy': 'allkeys-lru'
    }
  }
}

@secure()
@description('PostgreSQL administrator password')
param postgresAdminPassword string

// PostgreSQL Flexible Server for the database
resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: 'psql-${resourcePrefix}-${resourceToken}'
  location: location
  tags: tags
  sku: {
    name: 'Standard_D2s_v3'
    tier: 'GeneralPurpose'
  }
  properties: {
    version: '15'
    administratorLogin: '${environmentName}admin'
    administratorLoginPassword: postgresAdminPassword
    storage: {
      storageSizeGB: 128
      autoGrow: 'Enabled'
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
    network: {
      publicNetworkAccess: 'Enabled'
    }
  }
}

// PostgreSQL database
resource postgresDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-12-01-preview' = {
  parent: postgresServer
  name: environmentName
}

// PostgreSQL firewall rule to allow Azure services
resource postgresFirewallRule 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-12-01-preview' = {
  parent: postgresServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// Storage Account for file uploads and static assets
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: 'st${take(resourceToken, 22)}'
  location: location
  tags: tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: true
    allowSharedKeyAccess: true
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    networkAcls: {
      defaultAction: 'Allow'
    }
  }
}

// Storage containers
resource documentsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${storageAccount.name}/default/documents'
  properties: {
    publicAccess: 'None'
  }
}

resource uploadsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${storageAccount.name}/default/uploads'
  properties: {
    publicAccess: 'None'
  }
}

// Grant Storage Blob Data Contributor role to managed identity
resource storageRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storageAccount
  name: guid(storageAccount.id, userIdentity.id, 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
    principalId: userIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// Container Apps Environment
resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: containerAppsEnvironmentName
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
    zoneRedundant: false
  }
}

// Web Frontend Container App
resource webFrontendApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-web-${resourcePrefix}-${resourceToken}'
  location: location
  tags: union(tags, { 'azd-service-name': 'web-frontend' })
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${userIdentity.id}': {}
    }
  }
  properties: {
    environmentId: containerAppsEnvironment.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        corsPolicy: {
          allowedOrigins: ['*']
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
          allowedHeaders: ['*']
          allowCredentials: true
        }
      }
      registries: [
        {
          server: containerRegistry.properties.loginServer
          identity: userIdentity.id
        }
      ]
      secrets: [
        {
          name: 'redis-connection-string'
          value: 'rediss://:${redisCache.listKeys().primaryKey}@${redisCache.properties.hostName}:6380'
        }
        {
          name: 'nextauth-secret'
          keyVaultUrl: nextAuthSecret.properties.secretUri
          identity: userIdentity.id
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'web-frontend'
          image: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            {
              name: 'NEXT_PUBLIC_API_URL'
              value: 'https://ca-api-${resourcePrefix}-${resourceToken}.${containerAppsEnvironment.properties.defaultDomain}'
            }
            {
              name: 'PHOENIX_API_URL'
              value: 'https://ca-api-${resourcePrefix}-${resourceToken}.${containerAppsEnvironment.properties.defaultDomain}'
            }
            {
              name: 'REDIS_URL'
              secretRef: 'redis-connection-string'
            }
            {
              name: 'AZURE_STORAGE_ACCOUNT_NAME'
              value: storageAccount.name
            }
            {
              name: 'AZURE_STORAGE_CONTAINER_NAME'
              value: 'documents'
            }
            {
              name: 'NEXTAUTH_SECRET'
              secretRef: 'nextauth-secret'
            }
            {
              name: 'NEXTAUTH_URL'
              value: webFrontendEnvVars.NEXTAUTH_URL
            }
            {
              name: 'NODE_ENV'
              value: webFrontendEnvVars.NODE_ENV
            }
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              value: applicationInsights.properties.ConnectionString
            }
          ]
        }
      ]
      scale: {
        minReplicas: 2
        maxReplicas: 100
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '1000'
              }
            }
          }
        ]
      }
    }
  }
}

// Phoenix API Container App
resource phoenixApiApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-api-${resourcePrefix}-${resourceToken}'
  location: location
  tags: union(tags, { 'azd-service-name': 'phoenix-backend' })
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${userIdentity.id}': {}
    }
  }
  properties: {
    environmentId: containerAppsEnvironment.id
    configuration: {
      ingress: {
        external: true
        targetPort: 4000
        corsPolicy: {
          allowedOrigins: ['*']
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
          allowedHeaders: ['*']
          allowCredentials: true
        }
      }
      registries: [
        {
          server: containerRegistry.properties.loginServer
          identity: userIdentity.id
        }
      ]
      secrets: [
        {
          name: 'database-url'
          value: 'postgresql://${environmentName}admin:${postgresAdminPassword}@${postgresServer.properties.fullyQualifiedDomainName}:5432/${environmentName}'
        }
        {
          name: 'redis-url'
          value: 'rediss://:${redisCache.listKeys().primaryKey}@${redisCache.properties.hostName}:6380'
        }
        {
          name: 'secret-key-base'
          keyVaultUrl: secretKeyBase.properties.secretUri
          identity: userIdentity.id
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'phoenix-backend'
          image: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
          resources: {
            cpu: json('1.0')
            memory: '2Gi'
          }
          env: [
            {
              name: 'DATABASE_URL'
              secretRef: 'database-url'
            }
            {
              name: 'REDIS_URL'
              secretRef: 'redis-url'
            }
            {
              name: 'SECRET_KEY_BASE'
              secretRef: 'secret-key-base'
            }
            {
              name: 'PHX_HOST'
              value: 'ca-api-${resourcePrefix}-${resourceToken}.${containerAppsEnvironment.properties.defaultDomain}'
            }
            {
              name: 'ECTO_IPV6'
              value: 'false'
            }
            {
              name: 'PORT'
              value: phoenixBackendEnvVars.PORT
            }
            {
              name: 'AZURE_STORAGE_ACCOUNT_NAME'
              value: storageAccount.name
            }
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              value: applicationInsights.properties.ConnectionString
            }
          ]
        }
      ]
      scale: {
        minReplicas: 2
        maxReplicas: 50
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '500'
              }
            }
          }
        ]
      }
    }
  }
}

// Outputs
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = containerRegistry.properties.loginServer
output AZURE_CONTAINER_APPS_ENVIRONMENT_ID string = containerAppsEnvironment.id
output WEB_FRONTEND_URI string = 'https://ca-web-${resourcePrefix}-${resourceToken}.${containerAppsEnvironment.properties.defaultDomain}'
output PHOENIX_BACKEND_URI string = 'https://ca-api-${resourcePrefix}-${resourceToken}.${containerAppsEnvironment.properties.defaultDomain}'
output AZURE_KEY_VAULT_ENDPOINT string = keyVault.properties.vaultUri
output AZURE_STORAGE_ACCOUNT_NAME string = storageAccount.name
output AZURE_REDIS_HOST string = redisCache.properties.hostName
output AZURE_POSTGRES_HOST string = postgresServer.properties.fullyQualifiedDomainName
