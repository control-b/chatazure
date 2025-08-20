@description('The name of the Cosmos DB account')
param accountName string

@description('The location for the Cosmos DB account')
param location string

@description('Tags to apply to the resource')
param tags object

@description('User assigned identity ID')
param userAssignedIdentityId string

resource cosmosDbAccount 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = {
  name: accountName
  location: location
  tags: tags
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
    enableAutomaticFailover: false
    enableMultipleWriteLocations: false
    publicNetworkAccess: 'Enabled'
    networkAclBypass: 'AzureServices'
    backupPolicy: {
      type: 'Periodic'
      periodicModeProperties: {
        backupIntervalInMinutes: 1440 // 24 hours
        backupRetentionIntervalInHours: 720 // 30 days
        backupStorageRedundancy: 'Local'
      }
    }
  }
}

resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-04-15' = {
  parent: cosmosDbAccount
  name: 'TruckingPlatform'
  properties: {
    resource: {
      id: 'TruckingPlatform'
    }
  }
}

// Containers
var containers = [
  { name: 'users', partitionKey: '/orgId' }
  { name: 'rooms', partitionKey: '/orgId' }
  { name: 'messages', partitionKey: '/orgId' }
  { name: 'organizations', partitionKey: '/id' }
  { name: 'documents', partitionKey: '/orgId' }
  { name: 'geofences', partitionKey: '/orgId' }
  { name: 'geo_events', partitionKey: '/orgId' }
]

resource cosmosContainers 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = [for container in containers: {
  parent: cosmosDatabase
  name: container.name
  properties: {
    resource: {
      id: container.name
      partitionKey: {
        paths: [container.partitionKey]
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'Consistent'
        automatic: true
        includedPaths: [
          {
            path: '/*'
          }
        ]
        excludedPaths: [
          {
            path: '/"_etag"/?'
          }
        ]
      }
    }
  }
}]

// Role assignment for user assigned identity
resource cosmosDbDataContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(cosmosDbAccount.id, userAssignedIdentityId, 'b24988ac-6180-42a0-ab88-20f7382dd24c')
  scope: cosmosDbAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b24988ac-6180-42a0-ab88-20f7382dd24c') // Cosmos DB Built-in Data Contributor
    principalId: reference(userAssignedIdentityId, '2023-01-31').principalId
    principalType: 'ServicePrincipal'
  }
}

output accountName string = cosmosDbAccount.name
output endpoint string = cosmosDbAccount.properties.documentEndpoint
output accountId string = cosmosDbAccount.id
