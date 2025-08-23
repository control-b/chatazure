// Development VM for Trucking Platform
// Optimized for Phoenix/Elixir and Next.js development with GitHub Actions runner

@description('Environment name for the development VM')
param environmentName string

@description('Location for all resources')
param location string = resourceGroup().location

@description('Administrator username for the VM')
param adminUsername string = 'azureuser'

@description('SSH public key for VM authentication')
@secure()
param sshPublicKey string

@description('Your public IP address for SSH access restriction')
param allowedSourceIP string

@description('VM size for development workload')
param vmSize string = 'Standard_D8s_v5'

@description('GitHub repository URL for Actions runner setup')
param githubRepo string = 'https://github.com/Control-B/ChatAzure'

@description('GitHub personal access token for runner registration')
@secure()
param githubToken string

// Variables
var resourceToken = uniqueString(subscription().id, resourceGroup().id, location, environmentName)
var vmName = 'vm-dev-${resourceToken}'
var networkSecurityGroupName = 'nsg-dev-${resourceToken}'
var virtualNetworkName = 'vnet-dev-${resourceToken}'
var subnetName = 'subnet-dev'
var networkInterfaceName = 'nic-dev-${resourceToken}'
var publicIPAddressName = 'pip-dev-${resourceToken}'
var osDiskName = 'disk-dev-${resourceToken}'

// Network Security Group with restricted SSH access
resource networkSecurityGroup 'Microsoft.Network/networkSecurityGroups@2023-05-01' = {
  name: networkSecurityGroupName
  location: location
  tags: {
    'azd-env-name': environmentName
    purpose: 'development'
  }
  properties: {
    securityRules: [
      {
        name: 'SSH'
        properties: {
          priority: 1001
          protocol: 'Tcp'
          access: 'Allow'
          direction: 'Inbound'
          sourceAddressPrefix: allowedSourceIP
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '22'
        }
      }
      {
        name: 'HTTP'
        properties: {
          priority: 1002
          protocol: 'Tcp'
          access: 'Allow'
          direction: 'Inbound'
          sourceAddressPrefix: allowedSourceIP
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '80'
        }
      }
      {
        name: 'HTTPS'
        properties: {
          priority: 1003
          protocol: 'Tcp'
          access: 'Allow'
          direction: 'Inbound'
          sourceAddressPrefix: allowedSourceIP
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '443'
        }
      }
      {
        name: 'VSCodeServer'
        properties: {
          priority: 1004
          protocol: 'Tcp'
          access: 'Allow'
          direction: 'Inbound'
          sourceAddressPrefix: allowedSourceIP
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '8080'
        }
      }
    ]
  }
}

// Virtual Network
resource virtualNetwork 'Microsoft.Network/virtualNetworks@2023-05-01' = {
  name: virtualNetworkName
  location: location
  tags: {
    'azd-env-name': environmentName
    purpose: 'development'
  }
  properties: {
    addressSpace: {
      addressPrefixes: [
        '10.1.0.0/16'
      ]
    }
    subnets: [
      {
        name: subnetName
        properties: {
          addressPrefix: '10.1.0.0/24'
          networkSecurityGroup: {
            id: networkSecurityGroup.id
          }
        }
      }
    ]
  }
}

// Public IP
resource publicIPAddress 'Microsoft.Network/publicIPAddresses@2023-05-01' = {
  name: publicIPAddressName
  location: location
  tags: {
    'azd-env-name': environmentName
    purpose: 'development'
  }
  sku: {
    name: 'Standard'
  }
  properties: {
    publicIPAllocationMethod: 'Static'
    dnsSettings: {
      domainNameLabel: 'dev-${toLower(resourceToken)}'
    }
  }
}

// Network Interface
resource networkInterface 'Microsoft.Network/networkInterfaces@2023-05-01' = {
  name: networkInterfaceName
  location: location
  tags: {
    'azd-env-name': environmentName
    purpose: 'development'
  }
  properties: {
    ipConfigurations: [
      {
        name: 'ipconfig1'
        properties: {
          subnet: {
            id: virtualNetwork.properties.subnets[0].id
          }
          privateIPAllocationMethod: 'Dynamic'
          publicIPAddress: {
            id: publicIPAddress.id
          }
        }
      }
    ]
  }
}

// Virtual Machine
resource virtualMachine 'Microsoft.Compute/virtualMachines@2023-07-01' = {
  name: vmName
  location: location
  tags: {
    'azd-env-name': environmentName
    purpose: 'development'
    'auto-shutdown': 'enabled'
  }
  properties: {
    hardwareProfile: {
      vmSize: vmSize
    }
    storageProfile: {
      osDisk: {
        name: osDiskName
        caching: 'ReadWrite'
        createOption: 'FromImage'
        managedDisk: {
          storageAccountType: 'Premium_LRS'
        }
        diskSizeGB: 256
      }
      imageReference: {
        publisher: 'canonical'
        offer: '0001-com-ubuntu-server-jammy'
        sku: '22_04-lts-gen2'
        version: 'latest'
      }
    }
    osProfile: {
      computerName: vmName
      adminUsername: adminUsername
      disablePasswordAuthentication: true
      linuxConfiguration: {
        ssh: {
          publicKeys: [
            {
              path: '/home/${adminUsername}/.ssh/authorized_keys'
              keyData: sshPublicKey
            }
          ]
        }
      }
    }
    networkProfile: {
      networkInterfaces: [
        {
          id: networkInterface.id
        }
      ]
    }
  }
}

// Auto-shutdown schedule
resource autoShutdown 'Microsoft.DevTestLab/schedules@2018-09-15' = {
  name: 'shutdown-computevm-${vmName}'
  location: location
  properties: {
    status: 'Enabled'
    taskType: 'ComputeVmShutdownTask'
    dailyRecurrence: {
      time: '2300' // 11 PM
    }
    timeZoneId: 'UTC'
    targetResourceId: virtualMachine.id
    notificationSettings: {
      status: 'Disabled'
    }
  }
}

// VM Extension for development environment setup
resource vmExtension 'Microsoft.Compute/virtualMachines/extensions@2023-07-01' = {
  name: 'setupDevEnvironment'
  parent: virtualMachine
  location: location
  properties: {
    publisher: 'Microsoft.Azure.Extensions'
    type: 'CustomScript'
    typeHandlerVersion: '2.1'
    autoUpgradeMinorVersion: true
    settings: {
      skipDos2Unix: false
    }
    protectedSettings: {
      script: base64('''#!/bin/bash
set -e

# Update system
apt-get update -y
apt-get upgrade -y

# Install essential packages
apt-get install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    unzip \
    build-essential \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    jq

# Install Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add user to docker group
usermod -aG docker azureuser

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install pnpm
npm install -g pnpm

# Install Elixir and Erlang
wget https://packages.erlang-solutions.com/erlang-solutions_2.0_all.deb
dpkg -i erlang-solutions_2.0_all.deb
apt-get update -y
apt-get install -y esl-erlang elixir

# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | bash

# Install Azure Developer CLI
curl -fsSL https://aka.ms/install-azd.sh | bash

# Install GitHub CLI
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null
apt-get update -y
apt-get install -y gh

# Install VS Code Server
curl -fsSL https://code-server.dev/install.sh | sh

# Create development directories
sudo -u azureuser mkdir -p /home/azureuser/projects
sudo -u azureuser mkdir -p /home/azureuser/.config/code-server

# Configure VS Code Server
cat > /home/azureuser/.config/code-server/config.yaml << EOF
bind-addr: 0.0.0.0:8080
auth: password
password: DevPassword123!
cert: false
EOF

chown azureuser:azureuser /home/azureuser/.config/code-server/config.yaml

# Create VS Code Server service
cat > /etc/systemd/system/code-server.service << EOF
[Unit]
Description=code-server
After=network.target

[Service]
Type=simple
User=azureuser
ExecStart=/usr/bin/code-server --config /home/azureuser/.config/code-server/config.yaml
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable code-server
systemctl start code-server

# Setup GitHub Actions runner directory
sudo -u azureuser mkdir -p /home/azureuser/actions-runner

echo "Development environment setup completed!"
''')
    }
  }
}

// Outputs
output vmName string = virtualMachine.name
output publicIPAddress string = publicIPAddress.properties.ipAddress
output sshCommand string = 'ssh ${adminUsername}@${publicIPAddress.properties.ipAddress}'
output vscodeUrl string = 'http://${publicIPAddress.properties.ipAddress}:8080'
output fqdn string = publicIPAddress.properties.dnsSettings.fqdn
