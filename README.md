# ChatAzure

A production-ready, multi-tenant trucking collaboration platform built with Elixir Phoenix, Next.js, and Azure services.

## Features

- **Real-time Chat**: Phoenix Channels with typing indicators, presence tracking, and file sharing
- **Geofencing**: Location-based check-ins and facility entry/exit alerts
- **Document Collaboration**: Real-time document editing with Yjs CRDT and e-signatures
- **Multi-tenant Architecture**: Organization-scoped data with RBAC
- **Azure Integration**: Blob Storage, Cosmos DB, Azure AD B2C authentication
- **Mobile Support**: PWA with offline capabilities

## Architecture

### Backend (Phoenix)
- **Language**: Elixir
- **Framework**: Phoenix 1.7
- **Database**: Azure Cosmos DB
- **Storage**: Azure Blob Storage
- **Auth**: Azure AD B2C JWT verification
- **Real-time**: WebSockets via Phoenix Channels

### Frontend (Next.js)
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Auth**: NextAuth.js with Azure AD B2C
- **Real-time**: Phoenix.js client for WebSocket connections
- **Documents**: CKEditor 5 with Yjs for collaborative editing

### Infrastructure
- **Hosting**: Azure Container Apps
- **CDN**: Azure Front Door
- **Secrets**: Azure Key Vault
- **Monitoring**: Azure Log Analytics + OpenTelemetry
- **IaC**: Bicep templates
- **CI/CD**: GitHub Actions

## Project Structure

```
monorepo/
├── apps/
│   ├── api/           # Phoenix backend
│   ├── web/           # Next.js frontend
│   └── yjs-server/    # Node.js Yjs WebSocket server
├── infra/             # Bicep infrastructure templates
├── .github/           # CI/CD workflows
└── docs/              # Documentation and runbooks
```

## Quick Start

### Prerequisites
- Elixir 1.15+ with Phoenix
- Node.js 18+ with npm
- Docker (for local development)

### Development Setup

1. **Clone and install dependencies**:
   ```bash
   git clone https://github.com/yourusername/ChatAzure.git
   cd ChatAzure
   ```

2. **Backend setup**:
   ```bash
   cd monorepo/apps/api
   mix deps.get
   mix phx.server
   ```

3. **Frontend setup**:
   ```bash
   cd monorepo/apps/web
   npm install
   npm run dev
   ```

4. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000
   - Demo chat: http://localhost:3000/app?demo=1

### Environment Configuration

Copy `.env.sample` files and configure:
- Azure AD B2C tenant settings
- Cosmos DB connection strings
- Blob Storage account keys

## Testing

```bash
# Backend tests
cd monorepo/apps/api
mix test

# Frontend tests
cd monorepo/apps/web
npm test
```

## Deployment

### Azure Deployment (Recommended)

1. **Set up Azure resources**:
   ```bash
   cd infra
   az deployment group create --resource-group rg-chatazure --template-file main.bicep
   ```

2. **Deploy with Azure Container Apps**:
   ```bash
   cd monorepo
   azd up
   ```

### Manual Deployment

See `docs/deployment.md` for detailed deployment instructions.

## Features in Detail

### Real-time Chat
- Phoenix Channels for WebSocket communication
- Typing indicators and presence tracking
- File upload to Azure Blob Storage
- Message history with pagination

### Geofencing
- Turf.js for client-side geofence validation
- Server-side location processing with hysteresis
- Check-in/check-out events with webhook publishing
- Real-time location updates

### Document Collaboration
- Yjs CRDT for conflict-free collaborative editing
- CKEditor 5 integration
- PDF generation and e-signature workflow
- Version history and change tracking

### Multi-tenancy
- Organization-scoped data access
- Role-based permissions (owner, dispatcher, driver, clerk)
- JWT-based authentication with Azure AD B2C
- Row-level security patterns

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@chatazure.com or join our [Discord community](https://discord.gg/chatazure).
