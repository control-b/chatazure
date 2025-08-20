targetScope = 'subscription'

@description('The name of the environment (e.g., dev, staging, prod)')
param environmentName string = 'dev'

@description('The location for all resources')
param location string = 'East US'

@description('The name of the organization')
param organizationName string = 'trucking-platform'

@description('Tags to apply to all resources')
param tags object = {
  Environment: environmentName
  Project: 'TruckingPlatform'
  ManagedBy: 'Bicep'
}

// Resource names
var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))
var resourceGroupName = '${organizationName}-${environmentName}-rg'

// Create resource group
resource resourceGroup 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: resourceGroupName
  location: location
  tags: union(tags, {
    'azd-env-name': environmentName
  })
}

// Deploy main resources
module mainResources 'modules/main.bicep' = {
  scope: resourceGroup
  name: 'main-resources'
  params: {
    environmentName: environmentName
    location: location
    resourceToken: resourceToken
    organizationName: organizationName
    tags: tags
  }
}

// Outputs
output resourceGroupName string = resourceGroupName
output cosmosDbAccountName string = mainResources.outputs.cosmosDbAccountName
output storageAccountName string = mainResources.outputs.storageAccountName
output containerRegistryName string = mainResources.outputs.containerRegistryName
output logAnalyticsWorkspaceName string = mainResources.outputs.logAnalyticsWorkspaceName
output keyVaultName string = mainResources.outputs.keyVaultName
output frontDoorProfileName string = mainResources.outputs.frontDoorProfileName
output containerAppsEnvironmentName string = mainResources.outputs.containerAppsEnvironmentName
