// main.bicep - FleetLink Infrastructure for Azure Container Apps (20M+ DAU)
targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the environment (used for resource naming)')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

@description('Resource group name')
param resourceGroupName string = 'rg-${environmentName}'

@description('Application Insights daily cap in GB')
param appInsightsDailyCap int = 100

@description('Log Analytics retention in days')
param logAnalyticsRetentionInDays int = 90

@description('Container Apps Environment name')
param containerAppsEnvironmentName string = 'cae-${environmentName}'

@description('Container Registry name')
param containerRegistryName string = 'cr${environmentName}${uniqueString(subscription().id, location, environmentName)}'

@secure()
@description('Web Frontend environment variables')
param webFrontendEnvVars object

@secure()
@description('Phoenix Backend environment variables')
param phoenixBackendEnvVars object

@secure()
@description('PostgreSQL administrator password')
param postgresAdminPassword string

// Generate unique resource token for naming
var resourceToken = uniqueString(subscription().id, location, environmentName)
var resourcePrefix = 'fl'

// Tags for all resources
var tags = {
  'azd-env-name': environmentName
  project: 'FleetLink'
  environment: 'production'
  'cost-center': 'logistics'
}

// Create resource group
resource resourceGroup 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: resourceGroupName
  location: location
  tags: tags
}

// Deploy core infrastructure in the resource group
module resources 'resources.bicep' = {
  scope: resourceGroup
  name: 'resources'
  params: {
    location: location
    environmentName: environmentName
    resourceToken: resourceToken
    resourcePrefix: resourcePrefix
    tags: tags
    appInsightsDailyCap: appInsightsDailyCap
    logAnalyticsRetentionInDays: logAnalyticsRetentionInDays
    containerAppsEnvironmentName: containerAppsEnvironmentName
    containerRegistryName: containerRegistryName
    webFrontendEnvVars: webFrontendEnvVars
    phoenixBackendEnvVars: phoenixBackendEnvVars
    postgresAdminPassword: postgresAdminPassword
  }
}

// Outputs required by AZD
output RESOURCE_GROUP_ID string = resourceGroup.id
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = resources.outputs.AZURE_CONTAINER_REGISTRY_ENDPOINT
output AZURE_CONTAINER_APPS_ENVIRONMENT_ID string = resources.outputs.AZURE_CONTAINER_APPS_ENVIRONMENT_ID
output WEB_FRONTEND_URI string = resources.outputs.WEB_FRONTEND_URI
output PHOENIX_BACKEND_URI string = resources.outputs.PHOENIX_BACKEND_URI
output AZURE_KEY_VAULT_ENDPOINT string = resources.outputs.AZURE_KEY_VAULT_ENDPOINT
