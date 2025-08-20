@description('The name of the Front Door profile')
param profileName string

@description('The location for the Front Door profile')
param location string

@description('Tags to apply to the resource')
param tags object

@description('Web app hostname')
param webAppHostname string

@description('API app hostname')
param apiAppHostname string

@description('Y.js app hostname')
param yjsAppHostname string

resource frontDoorProfile 'Microsoft.Cdn/profiles@2023-05-01' = {
  name: profileName
  location: location
  tags: tags
  sku: {
    name: 'Standard_AzureFrontDoor'
  }
  properties: {}
}

// Origin groups
resource webOriginGroup 'Microsoft.Cdn/profiles/originGroups@2023-05-01' = {
  parent: frontDoorProfile
  name: 'web-origin-group'
  properties: {
    loadBalancingSettings: {
      sampleSize: 4
      successfulSamplesRequired: 3
      additionalLatencyInMilliseconds: 50
    }
    healthProbeSettings: {
      probePath: '/'
      probeRequestType: 'HEAD'
      probeProtocol: 'Https'
      probeIntervalInSeconds: 120
    }
  }
}

resource apiOriginGroup 'Microsoft.Cdn/profiles/originGroups@2023-05-01' = {
  parent: frontDoorProfile
  name: 'api-origin-group'
  properties: {
    loadBalancingSettings: {
      sampleSize: 4
      successfulSamplesRequired: 3
      additionalLatencyInMilliseconds: 50
    }
    healthProbeSettings: {
      probePath: '/api/health'
      probeRequestType: 'GET'
      probeProtocol: 'Https'
      probeIntervalInSeconds: 120
    }
  }
}

resource yjsOriginGroup 'Microsoft.Cdn/profiles/originGroups@2023-05-01' = {
  parent: frontDoorProfile
  name: 'yjs-origin-group'
  properties: {
    loadBalancingSettings: {
      sampleSize: 4
      successfulSamplesRequired: 3
      additionalLatencyInMilliseconds: 50
    }
    healthProbeSettings: {
      probePath: '/health'
      probeRequestType: 'GET'
      probeProtocol: 'Https'
      probeIntervalInSeconds: 120
    }
  }
}

// Origins
resource webOrigin 'Microsoft.Cdn/profiles/originGroups/origins@2023-05-01' = {
  parent: webOriginGroup
  name: 'web-origin'
  properties: {
    hostName: webAppHostname
    httpPort: 80
    httpsPort: 443
    originHostHeader: webAppHostname
    priority: 1
    weight: 1000
    enabledState: 'Enabled'
  }
}

resource apiOrigin 'Microsoft.Cdn/profiles/originGroups/origins@2023-05-01' = {
  parent: apiOriginGroup
  name: 'api-origin'
  properties: {
    hostName: apiAppHostname
    httpPort: 80
    httpsPort: 443
    originHostHeader: apiAppHostname
    priority: 1
    weight: 1000
    enabledState: 'Enabled'
  }
}

resource yjsOrigin 'Microsoft.Cdn/profiles/originGroups/origins@2023-05-01' = {
  parent: yjsOriginGroup
  name: 'yjs-origin'
  properties: {
    hostName: yjsAppHostname
    httpPort: 80
    httpsPort: 443
    originHostHeader: yjsAppHostname
    priority: 1
    weight: 1000
    enabledState: 'Enabled'
  }
}

// Endpoint
resource frontDoorEndpoint 'Microsoft.Cdn/profiles/afdEndpoints@2023-05-01' = {
  parent: frontDoorProfile
  name: 'trucking-platform-endpoint'
  location: 'global'
  properties: {
    enabledState: 'Enabled'
  }
}

// Routes
resource webRoute 'Microsoft.Cdn/profiles/afdEndpoints/routes@2023-05-01' = {
  parent: frontDoorEndpoint
  name: 'web-route'
  properties: {
    customDomains: []
    originGroup: {
      id: webOriginGroup.id
    }
    supportedProtocols: ['Http', 'Https']
    patternsToMatch: ['/*']
    linkToDefaultDomain: 'Enabled'
    httpsRedirect: 'Enabled'
    enabledState: 'Enabled'
  }
}

resource apiRoute 'Microsoft.Cdn/profiles/afdEndpoints/routes@2023-05-01' = {
  parent: frontDoorEndpoint
  name: 'api-route'
  properties: {
    customDomains: []
    originGroup: {
      id: apiOriginGroup.id
    }
    supportedProtocols: ['Http', 'Https']
    patternsToMatch: ['/api/*', '/socket/*']
    linkToDefaultDomain: 'Enabled'
    httpsRedirect: 'Enabled'
    enabledState: 'Enabled'
  }
}

resource yjsRoute 'Microsoft.Cdn/profiles/afdEndpoints/routes@2023-05-01' = {
  parent: frontDoorEndpoint
  name: 'yjs-route'
  properties: {
    customDomains: []
    originGroup: {
      id: yjsOriginGroup.id
    }
    supportedProtocols: ['Http', 'Https']
    patternsToMatch: ['/yjs/*']
    linkToDefaultDomain: 'Enabled'
    httpsRedirect: 'Enabled'
    enabledState: 'Enabled'
  }
}

output frontDoorProfileName string = frontDoorProfile.name
output frontDoorEndpoint string = frontDoorEndpoint.properties.hostName
output frontDoorEndpointId string = frontDoorEndpoint.id
