# TruckingPlatform - Multi-tenant Collaborative Trucking Platform

A production-ready, multi-tenant trucking collaboration platform built with Elixir Phoenix, Next.js, and Azure services.

## Architecture Overview

- **Backend**: Elixir Phoenix with Channels for real-time communication
- **Frontend**: Next.js 14 with App Router and TypeScript
- **Real-time Documents**: Y.js with WebSocket server for collaborative editing
- **Database**: Azure Cosmos DB (NoSQL)
- **Storage**: Azure Blob Storage with SAS tokens
- **Authentication**: Azure AD B2C with NextAuth.js
- **Infrastructure**: Azure Container Apps, Front Door, Key Vault
- **Monitoring**: Application Insights, Log Analytics

## Features

### ✅ Real-time Communication
- Multi-room chat with presence tracking
- File upload and sharing with virus scanning hooks
- Message history and search
- Typing indicators and read receipts

### ✅ Document Collaboration
- Real-time collaborative editing with Y.js CRDT
- CKEditor 5 integration
- Document versioning and conflict resolution
- PDF generation and e-signatures

### ✅ Geofencing & Tracking
- GPS location tracking with privacy controls
- Polygon-based geofencing with hysteresis
- Enter/exit event detection and notifications
- Rate limiting and debouncing

### ✅ Multi-tenancy & Security
- Organization-based data isolation
- Role-based access control (Owner, Dispatcher, Driver, Clerk)
- Row-level security with Cosmos DB
- JWT tokens with refresh mechanism

### ✅ Production Infrastructure
- Blue-green deployments with Container Apps
- Auto-scaling based on load
- WebSocket session affinity
- CDN with Azure Front Door

## Quick Start

### Prerequisites

- Node.js 18+
- Elixir 1.15+ / OTP 26+
- Docker and Docker Compose
- Azure CLI
- pnpm (recommended)

### Local Development

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd monorepo
   cp .env.sample .env
   # Fill in your Azure credentials in .env
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   cd apps/api && mix deps.get && cd ../..
   ```

3. **Start with Docker Compose**:
   ```bash
   pnpm docker:up
   ```

4. **Or start individually**:
   ```bash
   # Terminal 1 - Phoenix API
   pnpm dev:api

   # Terminal 2 - Next.js Web
   pnpm dev:web

   # Terminal 3 - Y.js WebSocket
   pnpm dev:yjs
   ```

5. **Access the application**:
   - Web App: http://localhost:3000
   - Phoenix API: http://localhost:4000
   - Y.js WebSocket: ws://localhost:4001

### Azure Deployment

1. **Setup Azure resources**:
   ```bash
   # Login to Azure
   az login

   # Deploy infrastructure
   cd infra
   az deployment sub create \
     --location eastus \
     --template-file main.bicep \
     --parameters main.parameters.json
   ```

2. **Build and push images**:
   ```bash
   # Get ACR login server
   ACR_LOGIN_SERVER=$(az acr show --name your-acr-name --query loginServer -o tsv)
   
   # Login to ACR
   az acr login --name your-acr-name
   
   # Build and push images
   docker build -t $ACR_LOGIN_SERVER/trucking-api:latest ./apps/api
   docker build -t $ACR_LOGIN_SERVER/trucking-web:latest ./apps/web
   docker build -t $ACR_LOGIN_SERVER/trucking-yjs:latest ./apps/yjs
   
   docker push $ACR_LOGIN_SERVER/trucking-api:latest
   docker push $ACR_LOGIN_SERVER/trucking-web:latest
   docker push $ACR_LOGIN_SERVER/trucking-yjs:latest
   ```

3. **Deploy via GitHub Actions**:
   - Configure repository secrets (see CI/CD section)
   - Push to `main` or `develop` branch
   - Monitor deployment in GitHub Actions

## Project Structure

```
monorepo/
├── apps/
│   ├── api/                    # Phoenix API server
│   │   ├── lib/
│   │   │   ├── trucking_platform/
│   │   │   │   ├── auth/       # Authentication logic
│   │   │   │   ├── storage/    # Data models and Cosmos DB
│   │   │   │   ├── geofencing/ # Location tracking
│   │   │   │   └── ...
│   │   │   └── trucking_platform_web/
│   │   │       ├── channels/   # WebSocket channels
│   │   │       ├── controllers/# HTTP controllers
│   │   │       └── ...
│   │   ├── config/             # Application configuration
│   │   ├── test/               # Tests
│   │   └── Dockerfile
│   ├── web/                    # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/           # App Router pages
│   │   │   ├── components/    # React components
│   │   │   ├── lib/           # Utilities and hooks
│   │   │   └── types/         # TypeScript types
│   │   └── Dockerfile
│   └── yjs/                   # Y.js WebSocket server
│       ├── src/
│       │   ├── server.ts      # Main server
│       │   ├── auth.ts        # Authentication
│       │   └── persistence.ts # Document persistence
│       └── Dockerfile
├── packages/
│   └── ui/                    # Shared UI components (future)
├── infra/                     # Infrastructure as Code
│   ├── main.bicep            # Main Bicep template
│   ├── modules/              # Bicep modules
│   └── main.parameters.json  # Parameters
├── .github/
│   └── workflows/            # CI/CD pipelines
├── docs/                     # Documentation
├── docker-compose.dev.yml    # Local development
└── package.json              # Workspace configuration
```

## API Endpoints

### Authentication
- `POST /api/auth/token` - Get JWT token
- `POST /api/auth/refresh` - Refresh token

### Organizations & Rooms
- `GET /api/orgs/:orgId/rooms` - List rooms
- `POST /api/orgs/:orgId/rooms` - Create room
- `GET /api/orgs/:orgId/rooms/:roomId/messages` - Get messages

### File Upload
- `POST /api/uploads/sas` - Generate SAS token
- `POST /api/uploads/complete` - Complete upload

### Documents
- `GET /api/docs/:docId` - Get document
- `POST /api/docs/:docId/sign` - Sign document

### Geofencing
- `GET /api/orgs/:orgId/geofences` - List geofences
- `GET /api/geo_events` - Get geo events

## WebSocket Channels

### Room Channel (`room:*`)
```javascript
channel.join()
channel.push("new_message", {content: "Hello"})
channel.push("typing", {typing: true})
channel.on("new_message", callback)
channel.on("user_typing", callback)
```

### Geo Channel (`geo:*`)
```javascript
channel.push("location_update", {lat: 40.7128, lon: -74.0060})
channel.on("geo_event", callback)
```

### Presence Channel (`presence:*`)
```javascript
channel.on("presence_state", callback)
channel.on("presence_diff", callback)
```

## Testing

```bash
# Run all tests
pnpm test

# Test individual apps
pnpm test:api    # Phoenix tests
pnpm test:web    # Jest/React tests
pnpm test:yjs    # Node.js tests

# Linting
pnpm lint
```

## CI/CD

### GitHub Secrets Required

```
AZURE_CLIENT_ID              # Service principal client ID
AZURE_CLIENT_SECRET          # Service principal secret
AZURE_TENANT_ID              # Azure tenant ID
AZURE_SUBSCRIPTION_ID        # Azure subscription ID
AZURE_CONTAINER_REGISTRY     # ACR name (without .azurecr.io)
```

### Pipeline Stages

1. **Lint & Test** - Code quality checks
2. **Build Images** - Docker builds and push to ACR
3. **Deploy Infrastructure** - Bicep template deployment
4. **Deploy Applications** - Container App updates
5. **Health Check** - Verify deployment success

## Monitoring & Observability

- **Application Insights**: APM and distributed tracing
- **Log Analytics**: Centralized logging
- **OpenTelemetry**: Custom metrics and traces
- **Health Checks**: Built-in endpoints for monitoring
- **Alerts**: Automated alerting on failures

## Security Considerations

- All communication over HTTPS/WSS
- JWT tokens with short expiration
- SAS tokens for secure file uploads
- Role-based access control
- Network security with private VNet
- Secrets management with Key Vault
- CORS configuration for cross-origin requests

## Performance Optimizations

- Connection pooling for database
- Redis caching for sessions
- CDN for static assets
- Auto-scaling based on metrics
- WebSocket session affinity
- Rate limiting on API endpoints

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run linting and tests
6. Submit a pull request

## License

[MIT License](LICENSE)

## Support

For questions and support, please open an issue in the GitHub repository.
