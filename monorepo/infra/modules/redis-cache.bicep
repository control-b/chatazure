@description('The name of the environment')
param environmentName string

@description('The location for the Redis cache')
param location string

@description('Tags to apply to the resources')
param tags object

@description('Resource token for unique naming')
param resourceToken string

// Azure Cache for Redis - Premium tier for production scale
resource redisCache 'Microsoft.Cache/redis@2023-08-01' = {
  name: 'trucking-redis-${resourceToken}'
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'Premium'
      family: 'P'
      capacity: 1
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    redisConfiguration: {
      'maxmemory-policy': 'allkeys-lru'
      'maxfragmentationmemory-reserved': '90'
      'maxmemory-reserved': '90'
      'maxmemory-delta': '90'
    }
    redisVersion: '6'
    publicNetworkAccess: 'Enabled'
    replicasPerMaster: 1
    replicasPerPrimary: 1
    shardCount: 3
  }
}

// Diagnostic settings for monitoring
resource redisdiagnosticSettings 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'redis-diagnostics'
  scope: redisCache
  properties: {
    logs: [
      {
        category: 'ConnectedClientList'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 30
        }
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 30
        }
      }
    ]
    workspaceId: '/subscriptions/${subscription().subscriptionId}/resourceGroups/trucking-platform-${environmentName}/providers/Microsoft.OperationalInsights/workspaces/trucking-logs-${resourceToken}'
  }
}

output redisHostname string = redisCache.properties.hostName
output redisPort int = redisCache.properties.port
output redisSslPort int = redisCache.properties.sslPort
output redisName string = redisCache.name
