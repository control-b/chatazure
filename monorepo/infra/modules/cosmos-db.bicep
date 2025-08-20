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
      maxStalenessPrefix: 10
      maxIntervalInSeconds: 5
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: true
      }
      {
        locationName: 'West US 2'
        failoverPriority: 1
        isZoneRedundant: true
      }
      {
        locationName: 'North Europe'
        failoverPriority: 2
        isZoneRedundant: true
      }
    ]
    capabilities: [
      {
        name: 'EnableZoneRedundancy'
      }
    ]
    enableAutomaticFailover: true
    enableMultipleWriteLocations: true
    publicNetworkAccess: 'Enabled'
    networkAclBypass: 'AzureServices'
    backupPolicy: {
      type: 'Continuous'
    }
    enableFreeTier: false
    enableAnalyticalStorage: true
    analyticalStorageConfiguration: {
      schemaType: 'WellDefined'
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
    options: {
      throughput: 10000 // Provisioned throughput for shared database
    }
  }
}

// Containers with optimized partition keys and indexing for scale
var containers = [
  { 
    name: 'users'
    partitionKey: '/orgId'
    indexingPolicy: {
      indexingMode: 'Consistent'
      automatic: true
      includedPaths: [
        { path: '/id/?' }
        { path: '/email/?' }
        { path: '/orgId/?' }
        { path: '/roles/*/?' }
      ]
      excludedPaths: [
        { path: '/*' }
      ]
    }
  }
  { 
    name: 'rooms'
    partitionKey: '/orgId'
    indexingPolicy: {
      indexingMode: 'Consistent'
      automatic: true
      includedPaths: [
        { path: '/id/?' }
        { path: '/orgId/?' }
        { path: '/type/?' }
        { path: '/participants/*/?' }
        { path: '/lastActivityAt/?' }
      ]
      excludedPaths: [
        { path: '/*' }
      ]
    }
  }
  { 
    name: 'messages'
    partitionKey: '/roomId'
    indexingPolicy: {
      indexingMode: 'Consistent'
      automatic: true
      includedPaths: [
        { path: '/roomId/?' }
        { path: '/userId/?' }
        { path: '/timestamp/?' }
        { path: '/type/?' }
      ]
      excludedPaths: [
        { path: '/*' }
      ]
      compositeIndexes: [
        [
          { path: '/roomId', order: 'ascending' }
          { path: '/timestamp', order: 'descending' }
        ]
      ]
    }
  }
  { 
    name: 'organizations'
    partitionKey: '/id'
    indexingPolicy: {
      indexingMode: 'Consistent'
      automatic: true
      includedPaths: [
        { path: '/id/?' }
        { path: '/name/?' }
        { path: '/domain/?' }
      ]
      excludedPaths: [
        { path: '/*' }
      ]
    }
  }
  { 
    name: 'documents'
    partitionKey: '/orgId'
    indexingPolicy: {
      indexingMode: 'Consistent'
      automatic: true
      includedPaths: [
        { path: '/id/?' }
        { path: '/orgId/?' }
        { path: '/ownerId/?' }
        { path: '/createdAt/?' }
        { path: '/type/?' }
      ]
      excludedPaths: [
        { path: '/*' }
      ]
    }
  }
  { 
    name: 'geofences'
    partitionKey: '/orgId'
    indexingPolicy: {
      indexingMode: 'Consistent'
      automatic: true
      includedPaths: [
        { path: '/id/?' }
        { path: '/orgId/?' }
        { path: '/name/?' }
        { path: '/type/?' }
        { path: '/coordinates/*/?' }
      ]
      excludedPaths: [
        { path: '/*' }
      ]
      spatialIndexes: [
        {
          path: '/location/*'
          types: ['Point', 'Polygon']
        }
      ]
    }
  }
  { 
    name: 'geo_events'
    partitionKey: '/orgId'
    indexingPolicy: {
      indexingMode: 'Consistent'
      automatic: true
      includedPaths: [
        { path: '/orgId/?' }
        { path: '/userId/?' }
        { path: '/timestamp/?' }
        { path: '/eventType/?' }
      ]
      excludedPaths: [
        { path: '/*' }
      ]
      compositeIndexes: [
        [
          { path: '/orgId', order: 'ascending' }
          { path: '/timestamp', order: 'descending' }
        ]
      ]
    }
  }
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
        version: 2
      }
      indexingPolicy: container.indexingPolicy
      defaultTtl: -1 // Enable TTL for automatic cleanup
      analyticalStorageTtl: 86400 // 24 hours for analytical workloads
    }
    options: {
      throughput: 4000 // Dedicated throughput per container for high scale
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
