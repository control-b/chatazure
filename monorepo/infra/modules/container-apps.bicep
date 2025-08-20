@description('The name of the environment')
param environmentName string

@description('The location for the Container Apps')
param location string

@description('Tags to apply to the resources')
param tags object

@description('Container Apps environment ID')
param containerAppsEnvironmentId string

@description('Container registry name')
param containerRegistryName string

@description('User assigned identity ID')
param userAssignedIdentityId string

@description('Resource token for unique naming')
param resourceToken string

// Phoenix API Container App
resource apiContainerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'trucking-api-${resourceToken}'
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${userAssignedIdentityId}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerAppsEnvironmentId
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 4000
        allowInsecure: false
        traffic: [
          {
            weight: 100
            latestRevision: true
          }
        ]
        corsPolicy: {
          allowedOrigins: ['*']
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
          allowedHeaders: ['*']
          allowCredentials: true
        }
      }
      registries: [
        {
          server: '${containerRegistryName}.azurecr.io'
          identity: userAssignedIdentityId
        }
      ]
    }
    template: {
      containers: [
        {
          image: '${containerRegistryName}.azurecr.io/trucking-api:latest'
          name: 'trucking-api'
          resources: {
            cpu: json('2.0')
            memory: '4Gi'
          }
          env: [
            {
              name: 'PORT'
              value: '4000'
            }
            {
              name: 'MIX_ENV'
              value: 'prod'
            }
            {
              name: 'PHOENIX_SERVER'
              value: 'true'
            }
            {
              name: 'ENVIRONMENT_NAME'
              value: environmentName
            }
            {
              name: 'CLUSTER_STRATEGY'
              value: 'kubernetes'
            }
            {
              name: 'KUBERNETES_NODE_BASENAME'
              value: 'trucking-api'
            }
            {
              name: 'KUBERNETES_NAMESPACE'
              value: 'default'
            }
            {
              name: 'REDIS_HOST'
              value: 'trucking-redis-${resourceToken}.redis.cache.windows.net'
            }
            {
              name: 'REDIS_PORT'
              value: '6380'
            }
            {
              name: 'REDIS_SSL'
              value: 'true'
            }
            {
              name: 'ERL_MAX_PORTS'
              value: '65536'
            }
            {
              name: 'BEAM_POLL'
              value: 'true'
            }
          ]
        }
      ]
      scale: {
        minReplicas: 5
        maxReplicas: 100
        rules: [
          {
            name: 'http-scale'
            http: {
              metadata: {
                concurrentRequests: '1000'
              }
            }
          }
          {
            name: 'cpu-scale'
            custom: {
              type: 'cpu'
              metadata: {
                type: 'Utilization'
                value: '70'
              }
            }
          }
          {
            name: 'memory-scale'
            custom: {
              type: 'memory'
              metadata: {
                type: 'Utilization'
                value: '80'
              }
            }
          }
        ]
      }
    }
  }
}

// Next.js Web Container App
resource webContainerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'trucking-web-${resourceToken}'
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${userAssignedIdentityId}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerAppsEnvironmentId
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 3000
        allowInsecure: false
        traffic: [
          {
            weight: 100
            latestRevision: true
          }
        ]
        corsPolicy: {
          allowedOrigins: ['*']
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
          allowedHeaders: ['*']
          allowCredentials: true
        }
      }
      registries: [
        {
          server: '${containerRegistryName}.azurecr.io'
          identity: userAssignedIdentityId
        }
      ]
    }
    template: {
      containers: [
        {
          image: '${containerRegistryName}.azurecr.io/trucking-web:latest'
          name: 'trucking-web'
          resources: {
            cpu: json('1.0')
            memory: '2Gi'
          }
          env: [
            {
              name: 'PORT'
              value: '3000'
            }
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'NEXT_TELEMETRY_DISABLED'
              value: '1'
            }
            {
              name: 'NODE_OPTIONS'
              value: '--max-old-space-size=1792'
            }
          ]
        }
      ]
      scale: {
        minReplicas: 3
        maxReplicas: 50
        rules: [
          {
            name: 'http-scale'
            http: {
              metadata: {
                concurrentRequests: '500'
              }
            }
          }
          {
            name: 'cpu-scale'
            custom: {
              type: 'cpu'
              metadata: {
                type: 'Utilization'
                value: '75'
              }
            }
          }
        ]
      }
    }
  }
}

// Y.js WebSocket Container App
resource yjsContainerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'trucking-yjs-${resourceToken}'
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${userAssignedIdentityId}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerAppsEnvironmentId
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 4001
        allowInsecure: false
        traffic: [
          {
            weight: 100
            latestRevision: true
          }
        ]
        corsPolicy: {
          allowedOrigins: ['*']
          allowedMethods: ['GET']
          allowedHeaders: ['*']
          allowCredentials: true
        }
      }
      registries: [
        {
          server: '${containerRegistryName}.azurecr.io'
          identity: userAssignedIdentityId
        }
      ]
    }
    template: {
      containers: [
        {
          image: '${containerRegistryName}.azurecr.io/trucking-yjs:latest'
          name: 'trucking-yjs'
          resources: {
            cpu: json('1.0')
            memory: '2Gi'
          }
          env: [
            {
              name: 'PORT'
              value: '4001'
            }
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'REDIS_HOST'
              value: 'trucking-redis-${resourceToken}.redis.cache.windows.net'
            }
            {
              name: 'REDIS_PORT'
              value: '6380'
            }
            {
              name: 'REDIS_SSL'
              value: 'true'
            }
            {
              name: 'NODE_OPTIONS'
              value: '--max-old-space-size=1792'
            }
          ]
        }
      ]
      scale: {
        minReplicas: 3
        maxReplicas: 25
        rules: [
          {
            name: 'concurrent-requests'
            http: {
              metadata: {
                concurrentRequests: '200'
              }
            }
          }
          {
            name: 'websocket-connections'
            custom: {
              type: 'external'
              metadata: {
                type: 'redis'
                address: 'trucking-redis-${resourceToken}.redis.cache.windows.net:6380'
                listName: 'yjs_connections'
                listLength: '1000'
              }
            }
          }
        ]
      }
    }
  }
}

output webAppHostname string = webContainerApp.properties.configuration.ingress.fqdn
output apiAppHostname string = apiContainerApp.properties.configuration.ingress.fqdn
output yjsAppHostname string = yjsContainerApp.properties.configuration.ingress.fqdn
