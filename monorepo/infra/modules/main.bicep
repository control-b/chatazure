@description('The name of the environment')
param environmentName string

@description('The location for all resources')
param location string

@description('Resource token for unique naming')
param resourceToken string

@description('The name of the organization')
param organizationName string

@description('Tags to apply to all resources')
param tags object

// Resource names
var cosmosDbAccountName = '${organizationName}-cosmos-${resourceToken}'
var storageAccountName = '${organizationName}stor${resourceToken}'
var containerRegistryName = '${organizationName}acr${resourceToken}'
var logAnalyticsWorkspaceName = '${organizationName}-logs-${resourceToken}'
var keyVaultName = '${organizationName}-kv-${resourceToken}'
var frontDoorProfileName = '${organizationName}-fd-${resourceToken}'
var containerAppsEnvironmentName = '${organizationName}-cae-${resourceToken}'
var userAssignedIdentityName = '${organizationName}-identity-${resourceToken}'

// User Assigned Managed Identity
resource userAssignedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: userAssignedIdentityName
  location: location
  tags: tags
}

// Log Analytics Workspace
resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsWorkspaceName
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
}

// Application Insights
resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${organizationName}-ai-${resourceToken}'
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalyticsWorkspace.id
  }
}

// Cosmos DB
module cosmosDb 'cosmos-db.bicep' = {
  name: 'cosmos-db'
  params: {
    accountName: cosmosDbAccountName
    location: location
    tags: tags
    userAssignedIdentityId: userAssignedIdentity.id
  }
}

// Storage Account
module storageAccount 'storage.bicep' = {
  name: 'storage-account'
  params: {
    storageAccountName: storageAccountName
    location: location
    tags: tags
    userAssignedIdentityId: userAssignedIdentity.id
  }
}

// Container Registry
module containerRegistry 'container-registry.bicep' = {
  name: 'container-registry'
  params: {
    registryName: containerRegistryName
    location: location
    tags: tags
    userAssignedIdentityId: userAssignedIdentity.id
  }
}

// Key Vault
module keyVault 'key-vault.bicep' = {
  name: 'key-vault'
  params: {
    keyVaultName: keyVaultName
    location: location
    tags: tags
    userAssignedIdentityId: userAssignedIdentity.id
  }
}

// Container Apps Environment
module containerAppsEnvironment 'container-apps-environment.bicep' = {
  name: 'container-apps-environment'
  params: {
    environmentName: containerAppsEnvironmentName
    location: location
    tags: tags
    logAnalyticsWorkspaceId: logAnalyticsWorkspace.id
  }
}

// Container Apps
module containerApps 'container-apps.bicep' = {
  name: 'container-apps'
  params: {
    environmentName: environmentName
    location: location
    tags: tags
    containerAppsEnvironmentId: containerAppsEnvironment.outputs.environmentId
    containerRegistryName: containerRegistryName
    userAssignedIdentityId: userAssignedIdentity.id
    resourceToken: resourceToken
  }
  dependsOn: [
    containerRegistry
  ]
}

// Front Door
module frontDoor 'front-door.bicep' = {
  name: 'front-door'
  params: {
    profileName: frontDoorProfileName
    location: 'global'
    tags: tags
    webAppHostname: containerApps.outputs.webAppHostname
    apiAppHostname: containerApps.outputs.apiAppHostname
    yjsAppHostname: containerApps.outputs.yjsAppHostname
  }
}

// Outputs
output cosmosDbAccountName string = cosmosDbAccountName
output storageAccountName string = storageAccountName
output containerRegistryName string = containerRegistryName
output logAnalyticsWorkspaceName string = logAnalyticsWorkspaceName
output keyVaultName string = keyVaultName
output frontDoorProfileName string = frontDoorProfileName
output containerAppsEnvironmentName string = containerAppsEnvironmentName
output userAssignedIdentityId string = userAssignedIdentity.id
output applicationInsightsInstrumentationKey string = applicationInsights.properties.InstrumentationKey
output frontDoorEndpoint string = frontDoor.outputs.frontDoorEndpoint
