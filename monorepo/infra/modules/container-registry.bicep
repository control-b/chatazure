@description('The name of the container registry')
param registryName string

@description('The location for the container registry')
param location string

@description('Tags to apply to the resource')
param tags object

@description('User assigned identity ID')
param userAssignedIdentityId string

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: registryName
  location: location
  tags: tags
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false
    publicNetworkAccess: 'Enabled'
    zoneRedundancy: 'Disabled'
    policies: {
      quarantinePolicy: {
        status: 'Disabled'
      }
      trustPolicy: {
        type: 'Notary'
        status: 'Disabled'
      }
      retentionPolicy: {
        days: 7
        status: 'Disabled'
      }
    }
    encryption: {
      status: 'Disabled'
    }
    dataEndpointEnabled: false
    networkRuleBypassOptions: 'AzureServices'
  }
}

// Role assignment for user assigned identity (ACR Pull)
resource acrPullRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(containerRegistry.id, userAssignedIdentityId, '7f951dda-4ed3-4680-a7ca-43fe172d538d')
  scope: containerRegistry
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d') // AcrPull
    principalId: reference(userAssignedIdentityId, '2023-01-31').principalId
    principalType: 'ServicePrincipal'
  }
}

output registryName string = containerRegistry.name
output loginServer string = containerRegistry.properties.loginServer
output registryId string = containerRegistry.id
